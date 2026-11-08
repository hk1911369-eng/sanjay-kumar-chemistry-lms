'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { billingMonthEnd, currentBangladeshBillingPeriod } from '@/lib/pricing';

const labSubjects: Record<string, string> = {
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology',
  maths: 'Mathematics',
  ict: 'ICT',
};

export async function recordVirtualLabCompletion(formData: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'student') redirect('/portal');

  const courseId = String(formData.get('course_id') ?? '').trim();
  const labId = String(formData.get('lab_id') ?? '').trim();
  const subject = labSubjects[labId];
  if (!courseId || !subject) redirect('/labs?lab_error=invalid');

  const periodEnd = billingMonthEnd(currentBangladeshBillingPeriod());
  const { data: enrollment, error: enrollmentError } = await db.from('enrollments')
    .select('course_id')
    .eq('student_id', user.id)
    .eq('course_id', courseId)
    .eq('status', 'active')
    .eq('admission_fee_paid', true)
    .gte('paid_through', periodEnd)
    .maybeSingle();
  if (enrollmentError || !enrollment) redirect('/student?learning_error=labs_access');

  const { error } = await db.from('learning_events').insert({
    student_id: user.id,
    course_id: courseId,
    event_type: 'simulation_completed',
    occurred_at: new Date().toISOString(),
    metadata: { simulation_id: labId, subject, activity: 'virtual_lab' },
  });
  if (error) redirect('/labs?lab_error=save');

  revalidatePath('/labs');
  revalidatePath('/student');
  revalidatePath('/teacher/learning');
  redirect('/labs?lab_completed=1');
}
