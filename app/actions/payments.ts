'use server';

import { redirect } from 'next/navigation';
import { randomUUID } from 'node:crypto';
import { isAllowedImageSignature } from '@/lib/image-signature.js';
import { requireRole } from '@/lib/auth/require-role';
import { normalizeBangladeshMobile } from '@/lib/validation';
import { currentBangladeshBillingPeriod } from '@/lib/pricing';
import { paymentReviewErrorCode } from '@/lib/payment-review-error.js';

const providers = ['bkash', 'nagad', 'rocket'] as const;
type Provider = (typeof providers)[number];
type PaymentKind = 'initial' | 'monthly';

export async function submitManualPayment(formData: FormData) {
  const { supabase, user } = await requireRole(['student']);

  const { data: allowed } = await supabase.rpc('consume_app_rate_limit', { p_action: 'manual_payment' });
  if (!allowed) redirect('/student?payment_error=rate_limit');
  const courseId = String(formData.get('course_id') ?? '').trim();
  const provider = String(formData.get('provider') ?? '').trim() as Provider;
  const paymentKind = String(formData.get('payment_kind') ?? '').trim() as PaymentKind;
  let deliveryMode = String(formData.get('delivery_mode') ?? '').trim();
  const transactionId = String(formData.get('transaction_id') ?? '').trim().toUpperCase();
  const rawSenderPhone = String(formData.get('sender_phone') ?? '').trim();
  const senderPhone = rawSenderPhone ? normalizeBangladeshMobile(rawSenderPhone) : null;
  const proof = formData.get('payment_proof');
  const billingPeriod = currentBangladeshBillingPeriod();

  if (!courseId || !providers.includes(provider) || !['initial', 'monthly'].includes(paymentKind)
      || transactionId.length < 5 || transactionId.length > 100 || !senderPhone
      || !(proof instanceof File) || proof.size < 12 || proof.size > 3 * 1024 * 1024
      || !['image/jpeg','image/png','image/webp'].includes(proof.type)
      || (deliveryMode && !['live_recorded','recorded_only','offline'].includes(deliveryMode))) {
    redirect('/student?payment_error=invalid');
  }

  const [courseResult, settingsResult, enrollmentResult] = await Promise.all([
    supabase.from('courses').select('id,monthly_fee_bdt,admission_fee_bdt,is_published,enrollment_open,delivery_modes,live_price_bdt,recorded_price_bdt,offline_price_bdt').eq('id', courseId).single(),
    supabase.rpc('get_enabled_payment_instructions'),
    supabase.from('enrollments').select('id,status,admission_fee_paid,paid_through,delivery_mode,monthly_fee_bdt').eq('student_id', user.id).eq('course_id', courseId).maybeSingle(),
  ]);
  const {data:course}=courseResult;
  const {data:instructions}=settingsResult;
  const settings=(instructions??[]).find((item:any)=>item.provider===provider);
  let existingEnrollment:any=enrollmentResult.data;
  if(enrollmentResult.error){const fallback=await supabase.from('enrollments').select('id,status,admission_fee_paid,paid_through').eq('student_id',user.id).eq('course_id',courseId).maybeSingle();existingEnrollment=fallback.data;}

  if (!course?.is_published || !settings?.is_enabled) redirect('/student?payment_error=unavailable');
  if (!deliveryMode && paymentKind === 'monthly' && existingEnrollment?.delivery_mode) {
    deliveryMode = existingEnrollment.delivery_mode;
  }

  let amount: number;
  let feeMonthly: number | null = null;
  let feeAdmission: number | null = null;

  if (deliveryMode) {
    if (!course.delivery_modes?.includes(deliveryMode)) redirect('/student?payment_error=unavailable');
    const modePrice = deliveryMode === 'live_recorded' ? course.live_price_bdt
      : deliveryMode === 'recorded_only' ? course.recorded_price_bdt : course.offline_price_bdt;
    if (modePrice === null || modePrice === undefined) redirect('/student?payment_error=unavailable');

    if (paymentKind === 'initial') {
      if (!course.enrollment_open) redirect('/student?payment_error=unavailable');
      if (existingEnrollment?.admission_fee_paid) redirect('/student?payment_error=already_admitted');
      const { data: acceptedApplication } = await supabase.from('course_applications')
        .select('id').eq('student_id',user.id).eq('course_id',courseId)
        .eq('delivery_mode',deliveryMode).eq('status','accepted').maybeSingle();
      if (!acceptedApplication) redirect('/student?payment_error=application_required');
      feeMonthly = Number(modePrice);
      feeAdmission = Number(course.admission_fee_bdt ?? 0);
      amount = feeMonthly + feeAdmission;
    } else {
      if (existingEnrollment?.status !== 'active' || !existingEnrollment.admission_fee_paid
          || existingEnrollment.delivery_mode !== deliveryMode) {
        redirect('/student?payment_error=admission_required');
      }
      feeMonthly = Number(existingEnrollment.monthly_fee_bdt ?? modePrice);
      feeAdmission = 0;
      amount = feeMonthly;
    }
  } else {
    // Compatibility path for existing accounts that predate learning-format applications.
    amount = paymentKind === 'initial'
      ? Number(course.admission_fee_bdt) + Number(course.monthly_fee_bdt)
      : Number(course.monthly_fee_bdt);
    if (paymentKind === 'initial' && existingEnrollment?.admission_fee_paid) redirect('/student?payment_error=already_admitted');
    if (paymentKind === 'monthly' && (existingEnrollment?.status !== 'active' || !existingEnrollment.admission_fee_paid)) {
      redirect('/student?payment_error=admission_required');
    }
  }

  if (!Number.isSafeInteger(amount) || amount <= 0) redirect('/student?payment_error=unavailable');

  const proofBytes = new Uint8Array(await proof.arrayBuffer());
  if (!isAllowedImageSignature(proof.type, proofBytes)) redirect('/student?payment_error=invalid');
  const extension = proof.type === 'image/jpeg' ? 'jpg' : proof.type === 'image/png' ? 'png' : 'webp';
  const proofPath = `${user.id}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(proofPath, proofBytes, {
    contentType: proof.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (uploadError) {
    console.error('Payment proof upload failed', { code: uploadError.name ?? 'unknown' });
    redirect('/student?payment_error=proof_upload_failed');
  }

  const submission: Record<string, unknown> = {
    student_id: user.id,
    course_id: courseId,
    provider,
    amount_bdt: amount,
    payment_kind: paymentKind,
    billing_period: billingPeriod,
    transaction_id: transactionId,
    sender_phone_last4: senderPhone.slice(-4),
    sender_phone: senderPhone,
    status: 'pending_review',
    proof_storage_path: proofPath,
  };
  if (deliveryMode) {
    submission.delivery_mode = deliveryMode;
    submission.fee_monthly_bdt = feeMonthly;
    submission.fee_admission_bdt = feeAdmission;
  }
  const { error } = await supabase.from('manual_payment_submissions').insert(submission);

  if (error) {
    // Remove an unreferenced upload if the database insert fails.
    await supabase.storage.from('payment-proofs').remove([proofPath]);
    if (deliveryMode && (error.code === '42703' || /delivery_mode|fee_monthly_bdt|fee_admission_bdt/i.test(error.message))) redirect('/student?payment_error=migration_required');
    const duplicate = error.code === '23505' || /duplicate|unique/i.test(error.message);
    redirect(`/student?payment_error=${duplicate ? 'duplicate' : 'submit_failed'}`);
  }
  redirect('/student?payment_success=1');
}

export async function reviewManualPayment(formData: FormData) {
  const { supabase } = await requireRole(['admin']);

  const id = String(formData.get('submission_id') ?? '').trim();
  const decision = String(formData.get('decision') ?? '').trim();
  const note = String(formData.get('admin_note') ?? '').trim();
  if (!id || !['approve', 'reject'].includes(decision) || (decision === 'reject' && note.length < 3)) {
    redirect('/admin?review_error=invalid');
  }

  const { error } = decision === 'approve'
    ? await supabase.rpc('approve_manual_payment_submission', { p_submission_id: id, p_admin_note: note || null })
    : await supabase.rpc('reject_manual_payment_submission', { p_submission_id: id, p_admin_note: note });

  if (error) {
    console.error('Payment review failed', { code: error.code ?? 'unknown' });
    redirect('/admin?review_error=' + paymentReviewErrorCode(error));
  }
  redirect('/admin?review_success=1');
}

export async function updatePaymentSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/portal');

  const provider = String(formData.get('provider') ?? '').trim() as Provider;
  const receivingNumber = normalizeBangladeshMobile(String(formData.get('receiving_number') ?? '').trim());
  const enabled = formData.get('is_enabled') === 'on';
  if (!providers.includes(provider) || !receivingNumber) {
    redirect('/admin?settings_error=invalid');
  }
  const { error } = await supabase.from('private_payment_settings').update({
    receiving_number: receivingNumber,
    is_enabled: enabled,
    updated_at: new Date().toISOString(),
  }).eq('provider', provider);
  if (error) redirect('/admin?settings_error=save_failed');
  redirect('/admin?settings_success=1');
}
