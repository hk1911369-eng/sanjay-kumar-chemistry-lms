'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const gradeBands = ['primary','secondary','higher_secondary','university','general'];

function slugFor(value: string) {
  const ascii = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return (ascii || 'item-' + Array.from(value).map(char => char.codePointAt(0)?.toString(16) ?? '0').join('-')).slice(0, 180);
}

async function adminClient() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/portal');
  return db;
}

function refresh() {
  revalidatePath('/admin/learning');
  revalidatePath('/admin/courses');
  revalidatePath('/teacher');
}

export async function createAcademicSubject(formData: FormData) {
  const db = await adminClient();
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (name.length < 2 || name.length > 100 || description.length > 1000) redirect('/admin/learning?error=subject');
  const { error } = await db.from('academic_subjects').upsert({
    name, slug: slugFor(name), description,
  }, { onConflict: 'slug', ignoreDuplicates: true });
  if (error) redirect('/admin/learning?error=subject');
  refresh();
  redirect('/admin/learning?saved=subject');
}

export async function createLearningConcept(formData: FormData) {
  const db = await adminClient();
  const subjectId = String(formData.get('subject_id') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const gradeBand = String(formData.get('grade_band') ?? 'general');
  const parentId = String(formData.get('parent_id') ?? '').trim() || null;
  const estimatedMinutes = Number(formData.get('estimated_minutes') ?? 20);
  const examTracks = [...new Set(String(formData.get('exam_tracks') ?? '').split(',').map(x => x.trim()).filter(Boolean))].slice(0, 12);
  const published = formData.get('is_published') === 'on';
  if (!uuidPattern.test(subjectId) || title.length < 2 || title.length > 180 ||
      description.length > 4000 || !gradeBands.includes(gradeBand) ||
      !Number.isInteger(estimatedMinutes) || estimatedMinutes < 1 || estimatedMinutes > 1440 ||
      examTracks.some(track => track.length > 80) || (parentId && !uuidPattern.test(parentId))) {
    redirect('/admin/learning?error=concept');
  }
  if (parentId) {
    const { data: parent } = await db.from('learning_concepts').select('id,subject_id').eq('id', parentId).maybeSingle();
    if (!parent || parent.subject_id !== subjectId) redirect('/admin/learning?error=parent');
  }
  const { error } = await db.from('learning_concepts').insert({
    subject_id: subjectId, parent_id: parentId, title, slug: slugFor(title),
    description, grade_band: gradeBand, exam_tracks: examTracks,
    estimated_minutes: estimatedMinutes, is_published: published,
  });
  if (error) redirect('/admin/learning?error=concept');
  refresh();
  redirect('/admin/learning?saved=concept');
}

export async function addConceptPrerequisite(formData: FormData) {
  const db = await adminClient();
  const conceptId = String(formData.get('concept_id') ?? '');
  const prerequisiteId = String(formData.get('prerequisite_concept_id') ?? '');
  if (!uuidPattern.test(conceptId) || !uuidPattern.test(prerequisiteId) || conceptId === prerequisiteId) {
    redirect('/admin/learning?error=prerequisite');
  }
  const { data: concepts } = await db.from('learning_concepts').select('id,subject_id')
    .in('id', [conceptId, prerequisiteId]);
  if (!concepts || concepts.length !== 2 || concepts[0].subject_id !== concepts[1].subject_id) {
    redirect('/admin/learning?error=prerequisite_subject');
  }
  const { error } = await db.from('concept_prerequisites').insert({
    concept_id: conceptId, prerequisite_concept_id: prerequisiteId,
  });
  if (error) redirect('/admin/learning?error=prerequisite');
  refresh();
  redirect('/admin/learning?saved=prerequisite');
}

export async function mapLessonToConcept(formData: FormData) {
  const db = await adminClient();
  const lessonId = String(formData.get('lesson_id') ?? '');
  const conceptId = String(formData.get('concept_id') ?? '');
  const weight = Number(formData.get('relevance_weight') ?? 1);
  if (!uuidPattern.test(lessonId) || !uuidPattern.test(conceptId) ||
      !Number.isFinite(weight) || weight <= 0 || weight > 1) {
    redirect('/admin/learning?error=lesson_map');
  }
  const [{ data: lesson }, { data: concept }] = await Promise.all([
    db.from('lessons').select('id,course_id').eq('id', lessonId).maybeSingle(),
    db.from('learning_concepts').select('id,subject_id').eq('id', conceptId).maybeSingle(),
  ]);
  if (!lesson || !concept) redirect('/admin/learning?error=lesson_map');
  const { data: subjectLink } = await db.from('course_subjects').select('course_id')
    .eq('course_id', lesson.course_id).eq('subject_id', concept.subject_id).maybeSingle();
  if (!subjectLink) redirect('/admin/learning?error=lesson_subject');
  const { error } = await db.from('lesson_concepts').upsert({
    lesson_id: lessonId, concept_id: conceptId, relevance_weight: weight,
  }, { onConflict: 'lesson_id,concept_id' });
  if (error) redirect('/admin/learning?error=lesson_map');
  refresh();
  redirect('/admin/learning?saved=lesson_map');
}
