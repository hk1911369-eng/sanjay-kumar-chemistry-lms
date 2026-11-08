-- Fail closed for authenticated callers without an active admin profile.
CREATE OR REPLACE FUNCTION public.get_student_register_export()
RETURNS TABLE(
  student_id uuid,
  student_code text,
  full_name text,
  phone text,
  guardian_name text,
  guardian_phone text,
  college_name text,
  location text,
  admission_date date,
  course_title text,
  programme_group text,
  enrollment_status text,
  admission_fee_paid boolean,
  paid_through date,
  latest_approved_payment_bdt numeric,
  latest_payment_date timestamptz
)
LANGUAGE plpgsql
STABLE
SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NULL
     OR (SELECT public.current_role())::text IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    s.id, s.student_code, s.full_name, s.phone, s.guardian_name,
    s.guardian_phone, s.college_name, s.location, s.admission_date,
    c.title, c.programme_group, e.status, e.admission_fee_paid,
    e.paid_through, p.amount_bdt::numeric, p.created_at
  FROM public.profiles s
  LEFT JOIN public.enrollments e ON e.student_id = s.id
  LEFT JOIN public.courses c ON c.id = e.course_id
  LEFT JOIN LATERAL (
    SELECT m.amount_bdt, m.created_at
    FROM public.manual_payment_submissions m
    WHERE m.student_id = s.id AND m.course_id = e.course_id
      AND m.status::text = 'approved'
    ORDER BY m.created_at DESC LIMIT 1
  ) p ON true
  WHERE s.role::text = 'student'
  ORDER BY s.created_at DESC, c.title NULLS LAST;
END;
$function$;
