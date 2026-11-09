'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const uuid = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

export async function createLabPracticalAssignment(formData: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (!['admin', 'teacher', 'staff'].includes(profile?.role ?? '')) redirect('/portal');

  const choice = String(formData.get('lab_choice') ?? '');
  const parts = choice.split(':');
  const courseId = parts.length === 2 ? parts[0] : '';
  const labId = parts.length === 2 ? parts[1] : '';
  const title = String(formData.get('title') ?? '').trim();
  const instructions = String(formData.get('instructions') ?? '').trim();
  const dueInput = String(formData.get('due_at') ?? '').trim();
  const points = Number(formData.get('points') ?? 100);

  if (!uuid.test(courseId) || !uuid.test(labId) || title.length < 3 || title.length > 180 ||
      instructions.length < 1 || instructions.length > 8000 || !Number.isFinite(points) || points <= 0 || points > 1000) {
    redirect('/teacher/lab-notebooks?error=assignment');
  }

  let dueAt: string | null = null;
  if (dueInput) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dueInput)) redirect('/teacher/lab-notebooks?error=assignment');
    const parsed = new Date(`${dueInput}:00+06:00`);
    if (Number.isNaN(parsed.getTime())) redirect('/teacher/lab-notebooks?error=assignment');
    dueAt = parsed.toISOString();
  }

  const { data, error } = await db.from('lab_practical_assignments').insert({
    course_id: courseId,
    lab_id: labId,
    teacher_id: user.id,
    title,
    instructions,
    due_at: dueAt,
    points,
    status: 'published',
    published_at: new Date().toISOString(),
  }).select('id').single();

  if (error || !data) redirect('/teacher/lab-notebooks?error=assignment');
  revalidatePath('/teacher/lab-notebooks');
  revalidatePath('/student/lab-notebook');
  redirect('/teacher/lab-notebooks?assignment_created=1');
}
