-- Student codes are allocated by the trusted auth/profile trigger.
-- Client roles cannot create profiles directly and do not need sequence access.
REVOKE ALL PRIVILEGES ON SEQUENCE public.student_code_seq FROM PUBLIC, anon, authenticated;
