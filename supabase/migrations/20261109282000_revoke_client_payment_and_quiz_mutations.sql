-- Payment orders and provider events are server-owned records. The current
-- release uses manual wallet references; client-side checkout is intentionally
-- disabled. Quiz attempts are created by students and finalized only by the
-- submit_quiz_attempt SECURITY DEFINER RPC.

revoke insert, update, delete on table public.payment_orders from authenticated;
revoke insert, update, delete on table public.payment_events from authenticated;
revoke update, delete on table public.quiz_attempts from authenticated;
