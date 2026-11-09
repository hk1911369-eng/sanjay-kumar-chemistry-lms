-- Suppress low-volume question cohorts to reduce inference risk from tiny classes.
-- Only question aggregates with at least five responses are returned to teaching staff.
CREATE OR REPLACE FUNCTION public.get_staff_practice_analytics()
RETURNS TABLE (question_id uuid, attempt_count bigint, correct_count bigint, option_counts jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL
    OR COALESCE(public.current_role()::text, '') NOT IN ('admin', 'teacher', 'staff') THEN
    RAISE EXCEPTION 'Teaching staff access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH authorized_questions AS (
    SELECT q.id
    FROM public.student_practice_questions q
    JOIN public.courses c ON c.id = q.course_id
    WHERE c.archived_at IS NULL
      AND (
        public.current_role()::text = 'admin'
        OR EXISTS (
          SELECT 1 FROM public.course_assignments ca
          WHERE ca.course_id = q.course_id AND ca.teacher_id = auth.uid()
        )
      )
  ),
  filtered_attempts AS (
    SELECT a.question_id, a.selected_option, a.is_correct
    FROM public.student_practice_attempts a
    JOIN authorized_questions aq ON aq.id = a.question_id
    WHERE a.answered_at >= now() - interval '90 days'
  ),
  eligible_questions AS (
    SELECT fa.question_id
    FROM filtered_attempts fa
    GROUP BY fa.question_id
    HAVING count(*) >= 5
  ),
  cohort_attempts AS (
    SELECT fa.question_id, fa.selected_option, fa.is_correct
    FROM filtered_attempts fa
    JOIN eligible_questions eq ON eq.question_id = fa.question_id
  ),
  question_totals AS (
    SELECT ca.question_id, count(*)::bigint AS attempt_count,
      count(*) FILTER (WHERE ca.is_correct)::bigint AS correct_count
    FROM cohort_attempts ca
    GROUP BY ca.question_id
  ),
  option_totals AS (
    SELECT ca.question_id, ca.selected_option, count(*)::bigint AS option_count
    FROM cohort_attempts ca
    GROUP BY ca.question_id, ca.selected_option
  )
  SELECT qt.question_id, qt.attempt_count, qt.correct_count,
    COALESCE((
      SELECT jsonb_object_agg(ot.selected_option::text, ot.option_count)
      FROM option_totals ot WHERE ot.question_id = qt.question_id
    ), '{}'::jsonb)
  FROM question_totals qt
  ORDER BY qt.question_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_staff_practice_analytics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_staff_practice_analytics() TO authenticated;
