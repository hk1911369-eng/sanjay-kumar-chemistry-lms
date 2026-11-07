import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function csvCell(value: unknown) {
  const raw = value == null ? '' : String(value);
  // Prevent spreadsheet formula execution while preserving ordinary values.
  const safe = /^[=+@\\-\\t\\r]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: actor } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (actor?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [{ data: students, error: studentError }, { data: enrollments, error: enrollmentError },
    { data: courses }, { data: payments }] = await Promise.all([
    db.from('profiles').select('id,student_code,full_name,phone,guardian_name,guardian_phone,college_name,location,admission_date,created_at').eq('role', 'student').order('created_at', { ascending: false }).limit(5000),
    db.from('enrollments').select('student_id,course_id,status,admission_fee_paid,paid_through,starts_at').limit(10000),
    db.from('courses').select('id,title,programme_group'),
    db.from('manual_payment_submissions').select('student_id,course_id,amount_bdt,status,payment_kind,billing_period,created_at').eq('status', 'approved').order('created_at', { ascending: false }).limit(20000),
  ]);
  if (studentError || enrollmentError) return NextResponse.json({ error: 'Could not prepare export' }, { status: 500 });

  const courseMap = new Map((courses ?? []).map(c => [c.id, c]));
  const enrollmentMap = new Map<string, typeof enrollments>();
  for (const item of enrollments ?? []) enrollmentMap.set(item.student_id, [...(enrollmentMap.get(item.student_id) ?? []), item]);
  const paymentMap = new Map<string, (typeof payments extends (infer T)[] | null ? T[] : never)>();
  for (const payment of payments ?? []) {
    const key = payment.student_id + ':' + payment.course_id;
    paymentMap.set(key, [...(paymentMap.get(key) ?? []), payment]);
  }

  const headers = ['Student ID','Student name','Student phone','Guardian name','Guardian phone','College','Location','Admission date','Course','Programme','Enrollment status','Admission fee paid','Paid through','Latest approved payment BDT','Latest payment date'];
  const rows = [headers, ...(students ?? []).flatMap(student => {
    const records = enrollmentMap.get(student.id) ?? [];
    const entries = records.length ? records : [null];
    return entries.map(enrollment => {
      const course = enrollment ? courseMap.get(enrollment.course_id) : null;
      const history = enrollment ? paymentMap.get(student.id + ':' + enrollment.course_id) ?? [] : [];
      const latest = history[0];
      return [student.student_code,student.full_name,student.phone,student.guardian_name,student.guardian_phone,
        student.college_name,student.location,student.admission_date,course?.title,course?.programme_group,
        enrollment?.status,enrollment?.admission_fee_paid ? 'Yes' : 'No',enrollment?.paid_through,
        latest?.amount_bdt,latest?.created_at ? new Date(latest.created_at).toISOString() : ''];
    });
  })];
  const body = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\\r\\n');
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="jmt-academy-student-register.csv"',
      'Cache-Control': 'private, no-store',
    },
  });
}
