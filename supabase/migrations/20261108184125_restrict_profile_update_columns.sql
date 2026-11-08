REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
REVOKE UPDATE (id, student_code, admission_date, is_active, created_at)
ON TABLE public.profiles FROM authenticated;

GRANT UPDATE (
  role,
  full_name,
  phone,
  avatar_path,
  guardian_name,
  guardian_phone,
  college_name,
  location,
  date_of_birth,
  gender,
  emergency_contact,
  blood_group,
  updated_at
)
ON TABLE public.profiles TO authenticated;
