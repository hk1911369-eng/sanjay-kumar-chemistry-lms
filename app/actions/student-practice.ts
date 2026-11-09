'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type PracticeAnswerResult =
  | { ok: true; attemptId: string; isCorrect: boolean; correctOption: number; explanation: string; awardedMarks: number }
  | { ok: false; error: 'login' | 'invalid' | 'already_answered' | 'unavailable' | 'failed' };

export async function submitStudentPracticeAnswer(
  questionId: string,
  selectedOption: number,
): Promise<PracticeAnswerResult> {
  if (!/^[0-9a-f-]{36}$/i.test(questionId) || !Number.isInteger(selectedOption) || selectedOption < 0 || selectedOption > 5) {
    return { ok: false, error: 'invalid' };
  }

  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, error: 'login' };

  const { data, error } = await db.rpc('submit_student_practice_answer', {
    p_question_id: questionId,
    p_selected_option: selectedOption,
  });

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'already_answered' };
    if (error.code === 'P0002' || error.code === '42501') return { ok: false, error: 'unavailable' };
    return { ok: false, error: 'failed' };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return { ok: false, error: 'failed' };
  const result = row as {
    attempt_id?: string;
    is_correct?: boolean;
    correct_option?: number;
    explanation?: string;
    awarded_marks?: number;
  };
  if (
    typeof result.attempt_id !== 'string'
    || typeof result.is_correct !== 'boolean'
    || typeof result.correct_option !== 'number'
  ) return { ok: false, error: 'failed' };

  revalidatePath('/student');
  revalidatePath('/practice');
  return {
    ok: true,
    attemptId: result.attempt_id,
    isCorrect: result.is_correct,
    correctOption: result.correct_option,
    explanation: result.explanation ?? '',
    awardedMarks: Number(result.awarded_marks ?? 0),
  };
}
