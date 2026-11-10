'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function adminContext() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/portal');
  return { db, user };
}

function stableSlug(value: string) {
  const base = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return base || 'item-' + Array.from(value).map(char => char.codePointAt(0)?.toString(16) ?? '0').join('-');
}

export async function saveAcademicSubject(formData: FormData) {
  const { db } = await adminContext();
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (name.length < 1 || name.length > 100 || description.length > 2000) redirect('/admin/learning?error=subject');
  const { error } = await db.from('academic_subjects').insert({ name, slug: stableSlug(name), description });
  if (error) redirect('/admin/learning?error=subject');
  revalidatePath('/admin/learning');
  redirect('/admin/learning?subject_saved=1');
}

export async function saveLearningConcept(formData: FormData) {
  const { db } = await adminContext();
  const subjectId = String(formData.get('subject_id') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const gradeBand = String(formData.get('grade_band') ?? 'general');
  const parentId = String(formData.get('parent_id') ?? '').trim() || null;
  const estimatedMinutes = Number(formData.get('estimated_minutes') ?? 20);
  const sortOrder = Number(formData.get('sort_order') ?? 0);
  const examTracks = [...new Set(String(formData.get('exam_tracks') ?? '').split(',').map(value => value.trim()).filter(Boolean))].slice(0, 12);
  if (!subjectId || title.length < 1 || title.length > 180 || description.length > 10000
    || !['primary','secondary','higher_secondary','university','general'].includes(gradeBand)
    || !Number.isInteger(estimatedMinutes) || estimatedMinutes < 1 || estimatedMinutes > 1440
    || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000
    || examTracks.some(track => track.length > 80)) redirect('/admin/learning?error=concept');

  const { data: subject } = await db.from('academic_subjects').select('id').eq('id', subjectId).maybeSingle();
  if (!subject) redirect('/admin/learning?error=subject');
  if (parentId) {
    const { data: parent } = await db.from('learning_concepts').select('id,subject_id').eq('id', parentId).maybeSingle();
    if (!parent || parent.subject_id !== subjectId) redirect('/admin/learning?error=parent');
  }
  const { error } = await db.from('learning_concepts').insert({
    subject_id: subjectId, parent_id: parentId, title, slug: stableSlug(title),
    description, grade_band: gradeBand, exam_tracks: examTracks,
    estimated_minutes: estimatedMinutes, sort_order: sortOrder,
    is_published: formData.get('is_published') === 'on',
  });
  if (error) redirect('/admin/learning?error=concept');
  revalidatePath('/admin/learning');
  redirect('/admin/learning?concept_saved=1');
}

export async function saveConceptPrerequisite(formData: FormData) {
  const { db } = await adminContext();
  const conceptId = String(formData.get('concept_id') ?? '');
  const prerequisiteId = String(formData.get('prerequisite_concept_id') ?? '');
  if (!conceptId || !prerequisiteId || conceptId === prerequisiteId) redirect('/admin/learning?error=prerequisite');

  const [{ data: concept }, { data: prerequisite }, { data: edges, error: edgesError }] = await Promise.all([
    db.from('learning_concepts').select('id,subject_id').eq('id', conceptId).maybeSingle(),
    db.from('learning_concepts').select('id,subject_id').eq('id', prerequisiteId).maybeSingle(),
    db.from('concept_prerequisites').select('concept_id,prerequisite_concept_id'),
  ]);
  if (!concept || !prerequisite || edgesError) redirect('/admin/learning?error=prerequisite');
  if (concept.subject_id !== prerequisite.subject_id) {
    redirect('/admin/learning?error=prerequisite_subject');
  }

  // An edge A -> B means A requires B. Reject any edge that would close a cycle.
  const graph = new Map<string, string[]>();
  for (const edge of edges ?? []) graph.set(edge.concept_id, [...(graph.get(edge.concept_id) ?? []), edge.prerequisite_concept_id]);
  const stack = [prerequisiteId];
  const visited = new Set<string>();
  while (stack.length) {
    const current = stack.pop()!;
    if (current === conceptId) redirect('/admin/learning?error=cycle');
    if (visited.has(current)) continue;
    visited.add(current);
    stack.push(...(graph.get(current) ?? []));
  }

  const { error } = await db.from('concept_prerequisites').upsert(
    { concept_id: conceptId, prerequisite_concept_id: prerequisiteId },
    { onConflict: 'concept_id,prerequisite_concept_id', ignoreDuplicates: true },
  );
  if (error) redirect('/admin/learning?error=prerequisite');
  revalidatePath('/admin/learning');
  redirect('/admin/learning?prerequisite_saved=1');
}


export async function createCourseChapter(formData: FormData) {
  const { db } = await adminContext();
  const courseId = String(formData.get('course_id') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const sortOrder = Number(formData.get('sort_order') ?? 0);
  if (!/^[0-9a-f-]{36}$/i.test(courseId) || title.length < 1 || title.length > 180
    || description.length > 4000 || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000) {
    redirect('/admin/learning?error=chapter');
  }
  const { data: course } = await db.from('courses').select('id').eq('id', courseId).is('archived_at', null).maybeSingle();
  if (!course) redirect('/admin/learning?error=chapter');
  const { error } = await db.from('chapters').insert({
    course_id: courseId, title, description, sort_order: sortOrder, published: false,
  });
  if (error) redirect('/admin/learning?error=chapter');
  revalidatePath('/admin/learning');
  redirect('/admin/learning?chapter_saved=1');
}

export async function createCourseLesson(formData: FormData) {
  const { db } = await adminContext();
  const courseId = String(formData.get('course_id') ?? '').trim();
  const chapterId = String(formData.get('chapter_id') ?? '').trim() || null;
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const videoUrl = String(formData.get('video_url') ?? '').trim() || null;
  const position = Number(formData.get('position') ?? 0);
  if (!/^[0-9a-f-]{36}$/i.test(courseId) || title.length < 2 || title.length > 180
    || description.length > 4000 || content.length > 30000
    || (videoUrl !== null && (videoUrl.length > 2048 || !/^https:\/\//i.test(videoUrl)))
    || !Number.isInteger(position) || position < 0 || position > 100000) {
    redirect('/admin/learning?error=lesson');
  }
  const { data: course } = await db.from('courses').select('id').eq('id', courseId).is('archived_at', null).maybeSingle();
  if (!course) redirect('/admin/learning?error=lesson');
  if (chapterId) {
    const { data: chapter } = await db.from('chapters').select('id').eq('id', chapterId).eq('course_id', courseId).maybeSingle();
    if (!chapter) redirect('/admin/learning?error=lesson_chapter');
  }
  const { error } = await db.from('lessons').insert({
    course_id: courseId, chapter_id: chapterId, title, description, content,
    video_url: videoUrl, position, is_published: false,
  });
  if (error) redirect('/admin/learning?error=lesson');
  revalidatePath('/admin/learning');
  revalidatePath('/learn/' + courseId);
  redirect('/admin/learning?lesson_saved=1');
}

export async function mapLessonToConcept(formData: FormData) {
  const { db } = await adminContext();
  const lessonId = String(formData.get('lesson_id') ?? '');
  const conceptId = String(formData.get('concept_id') ?? '');
  const relevance = Number(formData.get('relevance_weight') ?? 1);
  if (!lessonId || !conceptId || !Number.isFinite(relevance) || relevance <= 0 || relevance > 1) {
    redirect('/admin/learning?error=lesson_map');
  }

  const [{ data: lesson }, { data: concept }] = await Promise.all([
    db.from('lessons').select('id,course_id').eq('id', lessonId).maybeSingle(),
    db.from('learning_concepts').select('id,subject_id').eq('id', conceptId).maybeSingle(),
  ]);
  if (!lesson || !concept) redirect('/admin/learning?error=lesson_map');
  const { data: courseSubject } = await db.from('course_subjects').select('course_id')
    .eq('course_id', lesson.course_id).eq('subject_id', concept.subject_id).maybeSingle();
  if (!courseSubject) redirect('/admin/learning?error=subject_mismatch');

  const { error } = await db.from('lesson_concepts').upsert(
    { lesson_id: lessonId, concept_id: conceptId, relevance_weight: relevance },
    { onConflict: 'lesson_id,concept_id' },
  );
  if (error) redirect('/admin/learning?error=lesson_map');
  revalidatePath('/admin/learning');
  revalidatePath('/learn/' + lesson.course_id);
  redirect('/admin/learning?lesson_mapped=1');
}
