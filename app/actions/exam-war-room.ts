'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createExamWarRoomTarget(formData: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const courseId = String(formData.get('course_id') ?? '').trim();
  const targetTrack = String(formData.get('target_track') ?? '').trim().toLowerCase();
  const examDate = String(formData.get('exam_date') ?? '').trim();
  const dailyMinutes = Number(formData.get('daily_minutes'));
  const targetScore = Number(formData.get('target_score'));
  if (!/^[0-9a-f-]{36}$/i.test(courseId) || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)
    || !Number.isInteger(dailyMinutes) || !Number.isFinite(targetScore)) {
    redirect('/student/exam-war-room?error=invalid');
  }

  const { error } = await db.rpc('create_exam_war_room_target', {
    p_course_id: courseId,
    p_target_track: targetTrack,
    p_exam_date: examDate,
    p_daily_minutes: dailyMinutes,
    p_target_score: targetScore,
  });
  if (error) redirect('/student/exam-war-room?error=create');
  revalidatePath('/student/exam-war-room');
  revalidatePath('/student');
  redirect('/student/exam-war-room?created=1');
}

export async function cancelExamWarRoomTarget(formData: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const targetId = String(formData.get('target_id') ?? '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(targetId)) redirect('/student/exam-war-room?error=invalid');
  const { data, error } = await db.rpc('cancel_exam_war_room_target', { p_target_id: targetId });
  if (error || data !== true) redirect('/student/exam-war-room?error=cancel');
  revalidatePath('/student/exam-war-room');
  revalidatePath('/student');
  redirect('/student/exam-war-room?cancelled=1');
}
