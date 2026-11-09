-- JMT Academy synthetic catalogue seed.
-- LOCAL/TEST ONLY. Never execute this file against production.
-- All seeded courses and concepts remain unpublished; no users, enrollments,
-- payments, payment proofs, or personal data are created.

INSERT INTO public.academic_subjects (id, name, slug, description) VALUES
  ('10000000-0000-4000-8000-000000000001', 'Chemistry', 'chemistry', 'Synthetic HSC chemistry demo subject'),
  ('10000000-0000-4000-8000-000000000002', 'Physics', 'physics', 'Synthetic HSC physics demo subject'),
  ('10000000-0000-4000-8000-000000000003', 'Biology', 'biology', 'Synthetic HSC biology demo subject'),
  ('10000000-0000-4000-8000-000000000004', 'Mathematics', 'mathematics', 'Synthetic HSC mathematics demo subject'),
  ('10000000-0000-4000-8000-000000000005', 'English', 'english', 'Synthetic HSC English demo subject'),
  ('10000000-0000-4000-8000-000000000006', 'ICT', 'ict', 'Synthetic HSC ICT demo subject'),
  ('10000000-0000-4000-8000-000000000007', 'Bangla', 'bangla', 'Synthetic HSC Bangla demo subject'),
  ('10000000-0000-4000-8000-000000000008', 'Higher Mathematics', 'higher-mathematics', 'Synthetic HSC Higher Mathematics demo subject')
ON CONFLICT DO NOTHING;

INSERT INTO public.courses (
  id, title, slug, level, description, price_bdt, monthly_fee_bdt,
  admission_fee_bdt, programme_group, subjects, is_published, enrollment_open
) VALUES
  ('20000000-0000-4000-8000-000000000001', 'JMT Academy HSC 2027 Multi-Subject Demo', 'jmt-hsc-2027-multi-subject-demo', 'HSC', 'Unpublished synthetic HSC 2027 course for local and test-environment learning graph validation.', 0, 0, 0, 'HSC 2027', ARRAY['Chemistry','Physics','Biology','Mathematics','Higher Mathematics','English','Bangla','ICT']::text[], false, false),
  ('20000000-0000-4000-8000-000000000002', 'JMT Academy HSC 2028 Multi-Subject Demo', 'jmt-hsc-2028-multi-subject-demo', 'HSC', 'Unpublished synthetic HSC 2028 course for local and test-environment learning graph validation.', 0, 0, 0, 'HSC 2028', ARRAY['Chemistry','Physics','Biology','Mathematics','Higher Mathematics','English','Bangla','ICT']::text[], false, false),
  ('20000000-0000-4000-8000-000000000003', 'JMT Academy Admission Multi-Subject Demo', 'jmt-admission-multi-subject-demo', 'ADMISSION', 'Unpublished synthetic admission course for local and test-environment learning graph validation.', 0, 0, 0, 'Admission Batch', ARRAY['Chemistry','Physics','Biology','Mathematics','Higher Mathematics','English','Bangla','ICT']::text[], false, false)
ON CONFLICT DO NOTHING;

INSERT INTO public.course_subjects (course_id, subject_id, is_primary)
SELECT c.id, s.id, s.slug = 'chemistry'
FROM public.courses c
CROSS JOIN public.academic_subjects s
WHERE c.slug IN ('jmt-hsc-2027-multi-subject-demo','jmt-hsc-2028-multi-subject-demo','jmt-admission-multi-subject-demo')
  AND s.slug IN ('chemistry','physics','biology','mathematics','higher-mathematics','english','bangla','ict')
ON CONFLICT DO NOTHING;

INSERT INTO public.learning_concepts (
  id, subject_id, title, slug, description, grade_band, exam_tracks,
  estimated_minutes, sort_order, is_published
)
SELECT v.id::uuid, s.id, v.title, v.slug, v.description, 'higher_secondary',
       ARRAY['HSC']::text[], v.minutes, v.sort_order, false
FROM (VALUES
  ('30000000-0000-4000-8000-000000000001','chemistry','Atomic structure','atomic-structure','Atoms, subatomic particles and electronic configuration.',25,10),
  ('30000000-0000-4000-8000-000000000002','chemistry','Periodic trends','periodic-trends','Periodic properties and their explanations.',25,20),
  ('30000000-0000-4000-8000-000000000003','chemistry','Chemical bonding','chemical-bonding','Ionic, covalent and metallic bonding.',30,30),
  ('30000000-0000-4000-8000-000000000004','physics','Motion','motion','Displacement, velocity and acceleration.',25,10),
  ('30000000-0000-4000-8000-000000000005','physics','Forces','forces','Newtonian forces and free-body reasoning.',30,20),
  ('30000000-0000-4000-8000-000000000006','biology','Cell structure','cell-structure','Organelles and the organisation of cells.',25,10),
  ('30000000-0000-4000-8000-000000000007','biology','Genetics','genetics','Genes, inheritance and variation.',30,20),
  ('30000000-0000-4000-8000-000000000008','mathematics','Algebra','algebra','Expressions, equations and manipulation.',25,10),
  ('30000000-0000-4000-8000-000000000009','mathematics','Functions','functions','Function notation, domain and range.',30,20),
  ('30000000-0000-4000-8000-000000000010','english','Grammar foundations','grammar-foundations','Sentence structure and core grammar.',20,10),
  ('30000000-0000-4000-8000-000000000011','english','Reading comprehension','reading-comprehension','Extracting meaning and evidence from passages.',25,20),
  ('30000000-0000-4000-8000-000000000012','ict','Data representation','data-representation','Binary data and digital representation.',20,10),
  ('30000000-0000-4000-8000-000000000013','ict','Algorithmic thinking','algorithmic-thinking','Sequencing, selection and iteration.',25,20),
  ('30000000-0000-4000-8000-000000000014','bangla','Bangla language and grammar','bangla-language-grammar','Bangla language structure, grammar and usage.',25,10),
  ('30000000-0000-4000-8000-000000000015','bangla','Reading and literary comprehension','bangla-reading-comprehension','Reading comprehension and interpretation of Bengali texts.',30,20),
  ('30000000-0000-4000-8000-000000000016','higher-mathematics','Matrices and determinants','matrices-determinants','Matrix operations and determinants.',30,10),
  ('30000000-0000-4000-8000-000000000017','higher-mathematics','Differentiation','differentiation','Limits, derivatives and applications.',35,20)
) AS v(id, subject_slug, title, slug, description, minutes, sort_order)
JOIN public.academic_subjects s ON s.slug = v.subject_slug
ON CONFLICT DO NOTHING;

INSERT INTO public.concept_prerequisites (concept_id, prerequisite_concept_id)
SELECT child.id, parent.id
FROM (VALUES
  ('chemistry','periodic-trends','atomic-structure'),
  ('chemistry','chemical-bonding','periodic-trends'),
  ('physics','forces','motion'),
  ('biology','genetics','cell-structure'),
  ('mathematics','functions','algebra'),
  ('english','reading-comprehension','grammar-foundations'),
  ('ict','algorithmic-thinking','data-representation'),
  ('bangla','reading-comprehension','grammar-foundations'),
  ('higher-mathematics','differentiation','matrices-determinants')
) AS edge(subject_slug, child_slug, parent_slug)
JOIN public.academic_subjects s ON s.slug = edge.subject_slug
JOIN public.learning_concepts child ON child.subject_id = s.id AND child.slug = edge.child_slug
JOIN public.learning_concepts parent ON parent.subject_id = s.id AND parent.slug = edge.parent_slug
ON CONFLICT DO NOTHING;
