'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const uuidPattern = /^[0-9a-f-]{36}$/i;

export async function createStudentPracticeQuestion(formData: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (!['admin', 'teacher', 'staff'].includes(profile?.role ?? '')) redirect('/portal');

  const mapping = String(formData.get('course_subject') ?? '').split(':');
  const courseId = mapping[0] ?? '';
  const subjectId = mapping[1] ?? '';
  const questionText = String(formData.get('question_text') ?? '').trim();
  const chapterLabel = String(formData.get('chapter_label') ?? '').trim();
  const topic = String(formData.get('topic') ?? '').trim();
  const difficulty = String(formData.get('difficulty') ?? 'medium');
  const explanation = String(formData.get('explanation') ?? '').trim();
  const marks = Number(formData.get('marks') ?? 1);
  const correctOption = Number(formData.get('correct_option') ?? -1);
  const options = String(formData.get('options') ?? '').split(/\r?\n/).map(option => option.trim()).filter(Boolean);
  const conceptId = String(formData.get('concept_id') ?? '').trim();
  const isPublished = formData.get('is_published') === 'on';

  if (
    !uuidPattern.test(courseId)
    || !uuidPattern.test(subjectId)
    || (conceptId && !uuidPattern.test(conceptId))
    || questionText.length < 2 || questionText.length > 4000
    || chapterLabel.length > 160 || topic.length > 160
    || explanation.length > 4000
    || !['easy', 'medium', 'hard'].includes(difficulty)
    || options.length < 2 || options.length > 6
    || options.some(option => option.length > 1000)
    || !Number.isInteger(correctOption) || correctOption < 0 || correctOption >= options.length
    || !Number.isFinite(marks) || marks <= 0 || marks > 100
  ) redirect('/teacher/practice?error=invalid');

  const { error } = await db.from('student_practice_questions').insert({
    course_id: courseId,
    subject_id: subjectId,
    concept_id: conceptId || null,
    chapter_label: chapterLabel,
    topic,
    difficulty,
    question_text: questionText,
    options,
    correct_option: correctOption,
    explanation,
    marks,
    is_published: isPublished,
    created_by: user.id,
  });

  if (error) redirect('/teacher/practice?error=save');

  revalidatePath('/practice');
  revalidatePath('/teacher/practice');
  redirect('/teacher/practice?created=1');
}
