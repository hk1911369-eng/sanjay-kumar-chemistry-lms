-- Every policy below depends on an authenticated profile or auth.uid().
-- Restrict evaluation to signed-in sessions without changing row predicates.
ALTER POLICY "staff read audit" ON public.audit_logs TO authenticated;
ALTER POLICY "assigned teachers and admins manage chapters" ON public.chapters TO authenticated;
ALTER POLICY "admins manage course assignments" ON public.course_assignments TO authenticated;
ALTER POLICY "teaching staff see own assignments and admins all" ON public.course_assignments TO authenticated;
ALTER POLICY "admins manage enrollments" ON public.enrollments TO authenticated;
ALTER POLICY "admins manage lesson progress" ON public.lesson_progress TO authenticated;
ALTER POLICY "students read own lesson progress" ON public.lesson_progress TO authenticated;
ALTER POLICY "assigned teachers and admins manage lessons" ON public.lessons TO authenticated;
ALTER POLICY "admins read all manual payment submissions" ON public.manual_payment_submissions TO authenticated;
ALTER POLICY "admins read payment events" ON public.payment_events TO authenticated;
ALTER POLICY "students read own payment orders and admins read all" ON public.payment_orders TO authenticated;
ALTER POLICY "admins manage private payment settings" ON public.private_payment_settings TO authenticated;
ALTER POLICY "profile self update safe fields" ON public.profiles TO authenticated;
ALTER POLICY "profiles own admin or assigned staff read" ON public.profiles TO authenticated;
