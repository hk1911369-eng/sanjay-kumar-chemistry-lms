-- Trigger-only functions must not be callable as RPCs by client roles.
-- PostgreSQL trigger execution does not require callers to hold EXECUTE.
REVOKE EXECUTE ON FUNCTION public.assign_student_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_assignment_submission_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_student_followup_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_written_exam_submission_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_student_identity_fields() FROM PUBLIC, anon, authenticated;
