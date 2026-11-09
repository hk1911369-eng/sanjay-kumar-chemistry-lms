'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function recordSimulationCompletion(formData: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const courseId = String(formData.get('course_id') ?? '');
  const labId = String(formData.get('lab_id') ?? '');
  const durationSeconds = Number(formData.get('duration_seconds') ?? 0);
  if (!/^[0-9a-f-]{36}$/i.test(courseId)
    || !/^[a-z0-9][a-z0-9_-]{1,79}$/.test(labId)
    || !Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > 7200) {
    redirect('/labs?error=invalid');
  }

  const { error } = await db.rpc('record_simulation_completion', {
    p_course_id: courseId,
    p_lab_id: labId,
    p_duration_seconds: durationSeconds,
  });
  if (error) redirect('/labs?error=save');

  revalidatePath('/student');
  revalidatePath('/teacher/learning');
  redirect('/labs?completed=1');
}
