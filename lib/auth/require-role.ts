import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type AppRole = 'admin' | 'teacher' | 'staff' | 'student';

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role,is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile || profile.is_active !== true) redirect('/account-disabled');

  return { supabase, user, profile, role: profile.role as AppRole };
}

export async function requireRole(allowedRoles: readonly AppRole[]) {
  const actor = await requireUser();
  if (!allowedRoles.includes(actor.role)) redirect('/portal');
  return actor;
}

export async function requireAdmin() {
  return requireRole(['admin']);
}

export async function requireCourseStaff(courseId: string) {
  if (!courseId) redirect('/portal');
  const actor = await requireRole(['admin','teacher','staff']);
  if (actor.role !== 'admin') {
    const { data: assignment } = await actor.supabase
      .from('course_assignments')
      .select('id')
      .eq('course_id', courseId)
      .eq('teacher_id', actor.user.id)
      .maybeSingle();
    if (!assignment) redirect('/portal');
  }
  return actor;
}
