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

export async function saveVirtualLabCatalogItem(formData: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/portal');

  const labKey = String(formData.get('lab_key') ?? '').trim().toLowerCase();
  const subjectId = String(formData.get('subject_id') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const summary = String(formData.get('summary') ?? '').trim();
  const principle = String(formData.get('principle') ?? '').trim();
  const simulationType = String(formData.get('simulation_type') ?? '');
  const sortOrder = Number(formData.get('sort_order') ?? 0);
  const isPublished = formData.get('is_published') === 'on';

  if (!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(labKey)
    || !/^[0-9a-f-]{36}$/i.test(subjectId)
    || title.length < 2 || title.length > 160
    || summary.length > 500 || principle.length > 2000
    || !['physics','chemistry','kinetics','biology','maths','ict','quadratic','pendulum','projectile','microscope','wave-interference','equilibrium','cell-division','electrochemical-cell','photosynthesis','spring-oscillator','dihybrid'].includes(simulationType)
    || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) {
    redirect('/admin/virtual-labs?error=invalid');
  }

  const { error } = await db.from('virtual_lab_catalog').upsert({
    lab_key: labKey,
    subject_id: subjectId,
    title,
    summary,
    principle,
    simulation_type: simulationType,
    sort_order: sortOrder,
    is_published: isPublished,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'lab_key' });

  if (error) redirect('/admin/virtual-labs?error=save');
  revalidatePath('/admin/virtual-labs');
  revalidatePath('/labs');
  redirect('/admin/virtual-labs?saved=1');
}
