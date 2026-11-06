'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { normalizeBangladeshMobile } from '@/lib/validation';

const providers = ['bkash', 'nagad', 'rocket'] as const;
type Provider = (typeof providers)[number];

export async function submitManualPayment(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const courseId = String(formData.get('course_id') ?? '').trim();
  const provider = String(formData.get('provider') ?? '').trim() as Provider;
  const transactionId = String(formData.get('transaction_id') ?? '').trim().toUpperCase();
  const rawSenderPhone = String(formData.get('sender_phone') ?? '').trim();
  const senderPhone = rawSenderPhone ? normalizeBangladeshMobile(rawSenderPhone) : null;

  if (!courseId || !providers.includes(provider) || transactionId.length < 5 || transactionId.length > 100 || !senderPhone) {
    redirect('/student?payment_error=invalid');
  }

  const [{ data: course }, { data: settings }, { data: existingEnrollment }] = await Promise.all([
    supabase.from('courses').select('id,price_bdt,is_published').eq('id', courseId).single(),
    supabase.from('private_payment_settings').select('provider,is_enabled').eq('provider', provider).maybeSingle(),
    supabase.from('enrollments').select('id,status').eq('student_id', user.id).eq('course_id', courseId).maybeSingle(),
  ]);

  if (!course?.is_published || course.price_bdt !== 700 || !settings?.is_enabled) redirect('/student?payment_error=unavailable');
  if (existingEnrollment?.status === 'active') redirect('/student?payment_error=enrolled');

  const { error } = await supabase.from('manual_payment_submissions').insert({
    student_id: user.id,
    course_id: courseId,
    provider,
    amount_bdt: course.price_bdt,
    transaction_id: transactionId,
    sender_phone_last4: senderPhone ? senderPhone.slice(-4) : null,
    sender_phone: senderPhone,
    status: 'pending_review',
  });

  if (error) {
    const duplicate = error.code === '23505' || /duplicate|unique/i.test(error.message);
    redirect(`/student?payment_error=${duplicate ? 'duplicate' : 'submit_failed'}`);
  }
  redirect('/student?payment_success=1');
}

export async function reviewManualPayment(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/portal');

  const id = String(formData.get('submission_id') ?? '').trim();
  const decision = String(formData.get('decision') ?? '').trim();
  const note = String(formData.get('admin_note') ?? '').trim();
  if (!id || !['approve', 'reject'].includes(decision) || (decision === 'reject' && note.length < 3)) {
    redirect('/admin?review_error=invalid');
  }

  const { error } = decision === 'approve'
    ? await supabase.rpc('approve_manual_payment_submission', { p_submission_id: id, p_admin_note: note || null })
    : await supabase.rpc('reject_manual_payment_submission', { p_submission_id: id, p_admin_note: note });

  if (error) redirect(`/admin?review_error=${encodeURIComponent(error.message.slice(0, 120))}`);
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
