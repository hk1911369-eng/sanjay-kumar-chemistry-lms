import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildCsv } from '@/lib/csv';
import { fetchAllPages } from '@/lib/pagination.js';

export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: actor } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (actor?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: students, error } = await fetchAllPages((from, to) =>
    db.rpc('get_student_register_export').order('full_name').order('student_id').order('course_title').range(from, to)
  );
  if (error || !students) {
    console.error('Student register export failed', { error: error instanceof Error ? error.message : 'query_failed' });
    return NextResponse.json({ error: 'Could not prepare export' }, { status: 500 });
  }

  const headers = [
    'Student ID','Student name','Student phone','Guardian name','Guardian phone',
    'College','Location','Admission date','Course','Programme','Enrollment status',
    'Admission fee paid','Paid through','Latest approved payment BDT','Latest payment date',
  ];
  const rows = [
    headers,
    ...students.map(student => [
      student.student_code,
      student.full_name,
      student.phone,
      student.guardian_name,
      student.guardian_phone,
      student.college_name,
      student.location,
      student.admission_date,
      student.course_title,
      student.programme_group,
      student.enrollment_status,
      student.admission_fee_paid ? 'Yes' : 'No',
      student.paid_through,
      student.latest_approved_payment_bdt,
      student.latest_payment_date ? new Date(student.latest_payment_date).toISOString() : '',
    ]),
  ];

  return new NextResponse(buildCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="jmt-academy-student-register.csv"',
      'Cache-Control': 'private, no-store',
    },
  });
}
