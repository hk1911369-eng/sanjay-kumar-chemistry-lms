'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

function parseDhakaDate(value: string): string | null {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return null;
  const localDateTime = value + 'T09:00:00';
  const parsed = new Date(localDateTime + '+06:00');
  if (Number.isNaN(parsed.getTime())) return null;
  const roundTrip = new Date(parsed.getTime() + 6 * 60 * 60 * 1000).toISOString().slice(0, 19);
  return roundTrip === localDateTime ? parsed.toISOString() : null;
}

export async function assignTeacherRevisionTask(formData: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (!['admin', 'teacher', 'staff'].includes(profile?.role ?? '')) redirect('/portal');

  const studentId = String(formData.get('student_id') ?? '').trim();
  const courseId = String(formData.get('course_id') ?? '').trim();
  const conceptId = String(formData.get('concept_id') ?? '').trim();
  const scheduledDate = String(formData.get('scheduled_date') ?? '').trim();
  const priority = Number(formData.get('priority') ?? 2);
  const scheduledFor = parseDhakaDate(scheduledDate);

  if (!/^[0-9a-f-]{36}$/i.test(studentId)
    || !/^[0-9a-f-]{36}$/i.test(courseId)
    || !/^[0-9a-f-]{36}$/i.test(conceptId)
    || !scheduledFor
    || !Number.isInteger(priority) || priority < 1 || priority > 5) {
    redirect('/teacher/learning?error=revision');
  }

  const { error } = await db.rpc('assign_teacher_revision_task', {
    p_student_id: studentId,
    p_course_id: courseId,
    p_concept_id: conceptId,
    p_scheduled_for: scheduledFor,
    p_priority: priority,
  });
  if (error) redirect('/teacher/learning?error=revision');
  revalidatePath('/teacher/learning');
  revalidatePath('/student');
  redirect('/teacher/learning?revision_assigned=1');
}
