'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { normalizeBangladeshMobile } from '@/lib/validation';
import { isValidAttendanceDate } from '@/lib/attendance-date';

const categories = ['homework','attendance','academic','illness','discipline','guardian_call','other'] as const;
const severities = ['low','normal','high','urgent'] as const;
const attendanceStatuses = ['present','absent','late','excused'] as const;

async function getActor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!['admin','teacher','staff'].includes(profile?.role ?? '')) redirect('/portal');
  return { supabase, user, role: profile!.role };
}

export async function updateStudentDetails(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const fullName = String(formData.get('full_name') ?? '').trim();
  const phoneRaw = String(formData.get('phone') ?? '').trim();
  const guardianPhoneRaw = String(formData.get('guardian_phone') ?? '').trim();
  const phone = phoneRaw ? normalizeBangladeshMobile(phoneRaw) : null;
  const guardianPhone = guardianPhoneRaw ? normalizeBangladeshMobile(guardianPhoneRaw) : null;
  const guardianName = String(formData.get('guardian_name') ?? '').trim();
  const collegeName = String(formData.get('college_name') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim();
  const emergencyContactRaw = String(formData.get('emergency_contact') ?? '').trim();
  const emergencyContact = emergencyContactRaw ? normalizeBangladeshMobile(emergencyContactRaw) : null;
  const dateOfBirth = String(formData.get('date_of_birth') ?? '').trim() || null;
  const gender = String(formData.get('gender') ?? '').trim() || null;
  const bloodGroup = String(formData.get('blood_group') ?? '').trim() || null;
  if (fullName.length < 2 || fullName.length > 100 || (phoneRaw && !phone) ||
      (guardianPhoneRaw && !guardianPhone) || (emergencyContactRaw && !emergencyContact) ||
      guardianName.length > 100 || collegeName.length > 180 || location.length > 180 ||
      !['','male','female','other','prefer_not_to_say'].includes(gender ?? '') ||
      !['','A+','A-','B+','B-','AB+','AB-','O+','O-'].includes(bloodGroup ?? '')) {
    redirect('/student?profile_error=invalid');
  }
  const updates: Record<string, string | null> = {
    full_name: fullName, phone, guardian_name: guardianName || null,
    guardian_phone: guardianPhone, college_name: collegeName || null,
    location: location || null, emergency_contact: emergencyContact,
    date_of_birth: dateOfBirth, gender, blood_group: bloodGroup,
    updated_at: new Date().toISOString(),
  };
  const photo = formData.get('profile_photo');
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > 3 * 1024 * 1024 || !['image/jpeg','image/png','image/webp'].includes(photo.type)) {
      redirect('/student?profile_error=photo');
    }
    const extension = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
    const path = user.id + '/profile-' + Date.now() + '.' + extension;
    const { error: uploadError } = await supabase.storage.from('student-avatars').upload(path, photo, {
      contentType: photo.type, upsert: true, cacheControl: '3600',
    });
    if (uploadError) redirect('/student?profile_error=photo');
    updates.avatar_path = path;
  }
  const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
  redirect(error ? '/student?profile_error=save' : '/student?profile_success=1');
}

export async function createStudentFollowup(formData: FormData) {
  const { supabase, user, role } = await getActor();
  const studentId = String(formData.get('student_id') ?? '');
  const courseId = String(formData.get('course_id') ?? '');
  const category = String(formData.get('category') ?? '');
  const severity = String(formData.get('severity') ?? 'normal');
  const details = String(formData.get('details') ?? '').trim();
  const guardianContacted = formData.get('guardian_contacted') === 'on';
  const guardianCallOutcome = String(formData.get('guardian_call_outcome') ?? '').trim();
  const followUpDate = String(formData.get('follow_up_date') ?? '').trim() || null;
  const visibleToStudent = role === 'admin' && formData.get('visible_to_student') === 'on';
  if (!studentId || !courseId || !categories.includes(category as typeof categories[number]) ||
      !severities.includes(severity as typeof severities[number]) || details.length < 3 || details.length > 4000) {
    redirect('/students/manage?error=followup');
  }
  const { error } = await supabase.from('student_followups').insert({
    student_id: studentId, course_id: courseId, created_by: user.id, category, severity,
    details, guardian_contacted: guardianContacted, guardian_call_outcome: guardianCallOutcome || null,
    follow_up_date: followUpDate, visible_to_student: visibleToStudent,
  });
  redirect(error ? '/students/manage?error=followup' : '/students/manage?saved=followup');
}

export async function markStudentAttendance(formData: FormData) {
  const { supabase, user } = await getActor();
  const studentId = String(formData.get('student_id') ?? '');
  const courseId = String(formData.get('course_id') ?? '');
  const status = String(formData.get('status') ?? '');
  const attendanceDate = String(formData.get('attendance_date') ?? '');
  const note = String(formData.get('note') ?? '').trim();
  if (!studentId || !courseId || !attendanceStatuses.includes(status as typeof attendanceStatuses[number]) ||
      !isValidAttendanceDate(attendanceDate) || note.length > 500) {
    redirect('/students/manage?error=attendance');
  }
  const { error } = await supabase.from('student_attendance').upsert({
    student_id: studentId, course_id: courseId, attendance_date: attendanceDate,
    status, note: note || null, marked_by: user.id,
  }, { onConflict: 'student_id,course_id,attendance_date' });
  redirect(error ? '/students/manage?error=attendance' : '/students/manage?saved=attendance');
}


export async function updateStudentFollowupStatus(formData: FormData) {
  const { supabase, user } = await getActor();
  const id = String(formData.get('followup_id') ?? '');
  const status = String(formData.get('follow_up_status') ?? '');
  if (!id || !['open','in_progress','resolved'].includes(status)) redirect('/students/manage?error=followup');
  const { error } = await supabase.from('student_followups')
    .update({ follow_up_status: status, updated_at: new Date().toISOString() })
    .eq('id', id);
  redirect(error ? '/students/manage?error=followup' : '/students/manage?saved=followup');
}

export async function updateAccountRole(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: actor } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (actor?.role !== 'admin') redirect('/portal');
  const studentId = String(formData.get('profile_id') ?? '');
  const nextRole = String(formData.get('role') ?? '');
  if (!studentId || !['student','teacher','staff'].includes(nextRole)) redirect('/students/manage?error=role');
  const { error } = await supabase.from('profiles').update({ role: nextRole }).eq('id', studentId);
  redirect(error ? '/students/manage?error=role' : '/students/manage?saved=role');
}
