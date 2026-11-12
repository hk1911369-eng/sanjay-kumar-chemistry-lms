import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildOfflineLessonPackage } from '@/lib/offline/server-manifest.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' };
const unavailable = () => NextResponse.json(
  { error: 'Offline lesson package is unavailable for this account.' },
  { status: 404, headers: noStore },
);

function currentDhakaMonthEnd(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function entitlementExpiryFromDhakaDate(value: string) {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return NaN;
  const expiry = Date.parse(`${value}T23:59:59.999+06:00`);
  return Number.isFinite(expiry) ? expiry : NaN;
}

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
    if (profileError || profile?.role !== 'student' || profile.is_active !== true) return unavailable();

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
    const now = new Date();
    const paidThrough = typeof enrollment?.paid_through === 'string' ? enrollment.paid_through : '';
    if (enrollmentError || enrollment?.status !== 'active' ||
        enrollment.admission_fee_paid !== true ||
        paidThrough < currentDhakaMonthEnd(now)) {
      return unavailable();
    }

    const entitlementExpiry = entitlementExpiryFromDhakaDate(paidThrough);
    if (!Number.isFinite(entitlementExpiry) || entitlementExpiry <= now.getTime()) return unavailable();

    const result = buildOfflineLessonPackage({
      lesson,
      entitlementExpiresAt: new Date(entitlementExpiry).toISOString(),
      now: now.getTime(),
    });

    return NextResponse.json(result, { headers: noStore });
  } catch {
    return unavailable();
  }
}
