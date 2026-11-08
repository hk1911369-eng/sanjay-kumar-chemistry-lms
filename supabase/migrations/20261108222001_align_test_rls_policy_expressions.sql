-- Match the five semantically equivalent RLS expressions to production exactly.
ALTER POLICY "admins create academy contact profile" ON public."academy_settings" WITH CHECK (((( SELECT "current_role"() AS "current_role") = 'admin'::app_role) AND (updated_by = ( SELECT auth.uid() AS uid))));
ALTER POLICY "admins update academy contact profile" ON public."academy_settings" USING ((( SELECT "current_role"() AS "current_role") = 'admin'::app_role)) WITH CHECK (((( SELECT "current_role"() AS "current_role") = 'admin'::app_role) AND (updated_by = ( SELECT auth.uid() AS uid))));
ALTER POLICY "admins create finance entries" ON public."finance_entries" WITH CHECK (((( SELECT "current_role"() AS "current_role") = 'admin'::app_role) AND (recorded_by = ( SELECT auth.uid() AS uid))));
ALTER POLICY "admins read finance entries" ON public."finance_entries" USING ((( SELECT "current_role"() AS "current_role") = 'admin'::app_role));
ALTER POLICY "authors and assigned teachers update discussion body or pin" ON public."lesson_discussions" USING (((author_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (( SELECT ( SELECT "current_role"() AS "current_role") AS "current_role") = 'admin'::app_role) OR (((( SELECT ( SELECT "current_role"() AS "current_role") AS "current_role"))::text = ANY (ARRAY['teacher'::text, 'staff'::text])) AND (EXISTS ( SELECT 1
   FROM course_assignments a
  WHERE ((a.course_id = lesson_discussions.course_id) AND (a.teacher_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))))) WITH CHECK (((author_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (( SELECT ( SELECT "current_role"() AS "current_role") AS "current_role") = 'admin'::app_role) OR (((( SELECT ( SELECT "current_role"() AS "current_role") AS "current_role"))::text = ANY (ARRAY['teacher'::text, 'staff'::text])) AND (EXISTS ( SELECT 1
   FROM course_assignments a
  WHERE ((a.course_id = lesson_discussions.course_id) AND (a.teacher_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))));
