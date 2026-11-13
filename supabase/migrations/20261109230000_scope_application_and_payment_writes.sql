-- Limit client application/payment writes to the fields used by the workflows.
-- Review metadata and server-owned timestamps must not be client-controlled.

revoke insert, update on table public.course_applications from authenticated;
grant insert (
  student_id, course_id, delivery_mode, full_name, phone, guardian_name,
  guardian_phone, college_name, location, student_note
) on table public.course_applications to authenticated;
grant update (status, admin_note, reviewed_by, reviewed_at, updated_at)
  on table public.course_applications to authenticated;

revoke insert on table public.manual_payment_submissions from authenticated;
grant insert (
  student_id, course_id, provider, amount_bdt, payment_kind, billing_period,
  transaction_id, sender_phone_last4, sender_phone, status, proof_storage_path,
  delivery_mode, fee_monthly_bdt, fee_admission_bdt
) on table public.manual_payment_submissions to authenticated;
