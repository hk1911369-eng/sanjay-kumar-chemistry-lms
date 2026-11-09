-- Make the simulation catalogue subject-driven. A new academic subject can use an
-- existing interactive template without changing the application subject model.
CREATE TABLE IF NOT EXISTS public.virtual_lab_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_key text NOT NULL UNIQUE CHECK (lab_key ~ '^[a-z0-9][a-z0-9_-]{1,79}$'),
  subject_id uuid NOT NULL REFERENCES public.academic_subjects(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 2 AND 160),
  summary text NOT NULL DEFAULT '' CHECK (length(summary) <= 500),
  principle text NOT NULL DEFAULT '' CHECK (length(principle) <= 2000),
  simulation_type text NOT NULL CHECK (simulation_type IN ('physics','chemistry','biology','maths','ict')),
  is_published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS virtual_lab_catalog_subject_published_idx
  ON public.virtual_lab_catalog(subject_id, sort_order, title)
  WHERE is_published IS TRUE;

ALTER TABLE public.virtual_lab_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.virtual_lab_catalog FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.virtual_lab_catalog TO authenticated;

DROP POLICY IF EXISTS "authenticated read published virtual lab catalogue" ON public.virtual_lab_catalog;
CREATE POLICY "authenticated read published virtual lab catalogue"
  ON public.virtual_lab_catalog FOR SELECT TO authenticated
  USING (is_published IS TRUE);

DROP POLICY IF EXISTS "admins manage virtual lab catalogue" ON public.virtual_lab_catalog;
CREATE POLICY "admins manage virtual lab catalogue"
  ON public.virtual_lab_catalog FOR ALL TO authenticated
  USING (public.current_role()::text = 'admin')
  WITH CHECK (public.current_role()::text = 'admin');

GRANT INSERT (lab_key, subject_id, title, summary, principle, simulation_type, is_published, sort_order, created_by)
  ON public.virtual_lab_catalog TO authenticated;
GRANT UPDATE (lab_key, subject_id, title, summary, principle, simulation_type, is_published, sort_order, updated_at)
  ON public.virtual_lab_catalog TO authenticated;
GRANT DELETE ON public.virtual_lab_catalog TO authenticated;

INSERT INTO public.virtual_lab_catalog
  (lab_key, subject_id, title, summary, principle, simulation_type, is_published, sort_order)
VALUES
  ('physics-ohms-law', '10000000-0000-4000-8000-000000000002', 'Ohm''s law circuit', 'Explore how voltage and resistance affect current.', 'For an ideal resistor, current I = V ÷ R and power P = V × I.', 'physics', true, 10),
  ('chemistry-acid-base-titration', '10000000-0000-4000-8000-000000000001', 'Acid–base titration', 'Add a simulated base and observe the equivalence point.', 'At equivalence for a strong monoprotic acid and strong base, acid and base moles are equal.', 'chemistry', true, 20),
  ('biology-inheritance', '10000000-0000-4000-8000-000000000003', 'Inheritance simulator', 'Explore genotype outcomes in a monohybrid cross.', 'A Punnett square shows theoretical allele combinations, not guaranteed outcomes for an individual family.', 'biology', true, 30),
  ('mathematics-linear-functions', '10000000-0000-4000-8000-000000000004', 'Linear function explorer', 'Change slope and intercept and inspect y = mx + b.', 'The slope m controls the line direction and steepness; b is the y-intercept.', 'maths', true, 40),
  ('ict-binary-converter', '10000000-0000-4000-8000-000000000006', 'Binary number converter', 'Convert binary digits into a decimal number.', 'Each binary digit represents a power of two, starting with 2⁰ at the right.', 'ict', true, 50)
ON CONFLICT (lab_key) DO UPDATE SET
  subject_id = EXCLUDED.subject_id,
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  principle = EXCLUDED.principle,
  simulation_type = EXCLUDED.simulation_type,
  is_published = EXCLUDED.is_published,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.record_simulation_completion(
  p_course_id uuid,
  p_lab_id text,
  p_duration_seconds integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_student_id uuid := auth.uid();
  v_lab public.virtual_lab_catalog%ROWTYPE;
  v_subject_name text;
  v_event_id uuid;
  v_period_end date := (
    date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')::date
    + interval '1 month - 1 day'
  )::date;
BEGIN
  IF v_student_id IS NULL
    OR public.current_role() IS DISTINCT FROM 'student'::public.app_role THEN
    RAISE EXCEPTION 'Student login required' USING ERRCODE = '42501';
  END IF;

  IF p_course_id IS NULL OR p_lab_id IS NULL
    OR p_duration_seconds IS NULL OR p_duration_seconds < 0 OR p_duration_seconds > 7200 THEN
    RAISE EXCEPTION 'Invalid simulation details' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_lab
  FROM public.virtual_lab_catalog
  WHERE lab_key = p_lab_id AND is_published IS TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Simulation unavailable' USING ERRCODE = 'P0002';
  END IF;

  SELECT s.name INTO v_subject_name
  FROM public.academic_subjects s
  WHERE s.id = v_lab.subject_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.course_subjects cs
    WHERE cs.course_id = p_course_id AND cs.subject_id = v_lab.subject_id
  ) THEN
    RAISE EXCEPTION 'Simulation subject is not part of this course' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.student_id = v_student_id
      AND e.course_id = p_course_id
      AND e.status = 'active'
      AND e.admission_fee_paid IS TRUE
      AND e.paid_through >= v_period_end
      AND c.archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Active paid course access required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.learning_events (
    student_id, course_id, event_type, duration_seconds, occurred_at, metadata
  ) VALUES (
    v_student_id, p_course_id, 'simulation_completed', p_duration_seconds, now(),
    jsonb_build_object(
      'lab_id', v_lab.lab_key,
      'subject', v_subject_name,
      'subject_id', v_lab.subject_id,
      'simulation_type', v_lab.simulation_type,
      'duration_is_client_reported', true
    )
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_simulation_completion(uuid,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_simulation_completion(uuid,text,integer) TO authenticated;
