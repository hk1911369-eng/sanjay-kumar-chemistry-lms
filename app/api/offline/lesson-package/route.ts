import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildOfflineLessonPackage, resolveOfflineEntitlement } from '@/lib/offline/server-manifest.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' };
const unavailable = () => NextResponse.json(
  { error: 'Offline lesson package is unavailable for this account.' },
  { status: 404, headers: noStore },
);

export async function GET(request: NextRequest) {
  const lessonId = request.nextUrl.searchParams.get('lessonId')?.trim() ?? '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lessonId)) {
    return unavailable();
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return unavailable();

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role,is_active')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError || !profile) return unavailable();

    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id,course_id,is_published,content,updated_at')
      .eq('id', lessonId)
      .maybeSingle();
    if (lessonError || !lesson || lesson.is_published !== true) return unavailable();

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id,is_published,archived_at')
      .eq('id', lesson.course_id)
      .maybeSingle();
    if (courseError || !course || course.is_published !== true || course.archived_at !== null) {
      return unavailable();
    }

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('status,admission_fee_paid,paid_through')
      .eq('student_id', user.id)
      .eq('course_id', lesson.course_id)
      .maybeSingle();
    if (enrollmentError || !enrollment) return unavailable();
    const now = Date.now();
    const entitlementExpiresAt = resolveOfflineEntitlement({
      profile, course, enrollment, now,
    });
    if (!entitlementExpiresAt) return unavailable();

    const result = buildOfflineLessonPackage({
      lesson,
      entitlementExpiresAt,
      now,
    });

    return NextResponse.json(result, { headers: noStore });
  } catch {
    return unavailable();
  }
}
