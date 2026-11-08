import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Learning OS foundation is subject-agnostic and additive', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108211708_learning_os_multi_subject_foundation.sql', import.meta.url), 'utf8');
  for (const table of [
    'academic_subjects','course_subjects','learning_concepts','concept_prerequisites',
    'lesson_concepts','learning_events','learner_profiles','learner_concept_mastery',
    'learner_mistake_memory','revision_tasks','learner_study_goals',
  ]) {
    assert.ok(migration.includes(`CREATE TABLE public.${table}`), table);
    assert.ok(migration.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`), table);
  }
  assert.ok(migration.includes('FROM public.courses'));
  assert.ok(migration.includes('unnest(c.subjects)'));
  assert.ok(migration.includes('ON CONFLICT (slug) DO NOTHING'));
  assert.equal(migration.includes('DROP TABLE'), false);
  assert.equal(migration.includes('TRUNCATE'), false);
});

test('Learning OS sensitive derived records are read-only to client roles', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108211708_learning_os_multi_subject_foundation.sql', import.meta.url), 'utf8');
  assert.match(
    migration,
    /GRANT SELECT ON public\.learner_profiles, public\.learner_concept_mastery,\s+public\.learner_mistake_memory, public\.revision_tasks TO authenticated;/,
  );
  for (const table of ['learner_profiles','learner_concept_mastery','learner_mistake_memory','revision_tasks']) {
    assert.doesNotMatch(
      migration,
      new RegExp(`GRANT\\s+(?:INSERT|UPDATE|DELETE)[^;]*public\\.${table}`, 'i'),
      `${table} must not grant client writes`,
    );
  }
});

test('Learning OS event ingestion cannot manufacture assessment scores or cross-course links', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108211734_learning_os_event_integrity_and_staff_scope.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('score_percent IS NULL'));
  assert.ok(migration.includes("event_type IN ('lesson_viewed','lesson_completed','study_session','practice_started','revision_completed','simulation_completed')"));
  assert.ok(migration.includes('l.course_id = learning_events.course_id'));
  assert.ok(migration.includes('lc.id = learning_events.concept_id'));
  assert.ok(migration.includes('e.student_id = learner_mistake_memory.student_id'));
  assert.ok(migration.includes('e.student_id = revision_tasks.student_id'));
});

test('Learning OS staff visibility does not leak the whole academic twin across subjects', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108212228_learning_os_scope_academic_twin_staff_visibility.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('students and admins read learner profiles'));
  assert.ok(migration.includes('students admins and subject-assigned staff read concept mastery'));
  assert.ok(migration.includes('JOIN public.course_subjects cs'));
  assert.ok(migration.includes('lc.subject_id = cs.subject_id'));
  assert.ok(migration.includes('e.student_id = learner_concept_mastery.student_id'));
});

test('course studio writes universal subject links whenever a course is created or edited', async () => {
  const action = await readFile(new URL('../app/actions/course-studio.ts', import.meta.url), 'utf8');
  assert.ok(action.includes("from('academic_subjects').upsert(subjectRows"));
  assert.ok(action.includes("from('course_subjects').upsert(subjectLinks"));
  assert.ok(action.includes("from('course_subjects').delete()"));
  assert.ok(action.includes("subject_id:subjectIdBySlug.get(row.slug)!"));
  assert.ok(action.includes("codePointAt(0)"), 'non-Latin subject names receive stable valid slugs');
});

test('Learning OS foreign-key lookups have covering indexes', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108212724_learning_os_cover_foreign_key_indexes.sql', import.meta.url), 'utf8');
  for (const index of [
    'learner_concept_mastery_concept_idx','learner_mistake_memory_concept_idx',
    'learner_study_goals_course_idx','learning_concepts_parent_idx',
    'learning_events_concept_idx','learning_events_lesson_idx','revision_tasks_concept_idx',
  ]) assert.ok(migration.includes(index), index);
});

test('study goal progress is database-managed and client updates are revoked', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108213328_learning_os_trusted_study_goal_progress.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('REVOKE UPDATE ON public.learner_study_goals'));
  assert.ok(migration.includes('current_value = 0'));
  assert.ok(migration.includes('NEW.current_value IS DISTINCT FROM 0::numeric'));
  assert.ok(migration.includes('CREATE POLICY "students create own study goals"'));
  assert.ok(migration.includes('CREATE POLICY "students delete own study goals"'));
  assert.ok(migration.includes('SECURITY DEFINER'));
  assert.ok(migration.includes('REVOKE ALL ON FUNCTION public.apply_learning_event_to_study_goals()'));
  assert.ok(migration.includes('CREATE TRIGGER apply_learning_event_to_study_goals'));
});

test('study-session events advance study-session and minute goals; revision events advance revision goals', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108213338_learning_os_count_study_session_minutes.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes("NEW.event_type = 'study_session'"));
  assert.ok(migration.includes("goal_type = 'study_sessions'"));
  assert.ok(migration.includes("v_goal_type := 'study_minutes'"));
  assert.ok(migration.includes('NEW.duration_seconds::numeric / 60'));
  assert.ok(migration.includes("NEW.event_type = 'revision_completed'"));
  assert.ok(migration.includes("goal_type = 'revision_tasks'"));
  assert.ok(migration.includes('Asia/Dhaka'));
});

test('Learning knowledge graph rejects cross-subject and circular links at database level', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108213401_learning_graph_integrity_guards.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('guard_concept_prerequisite_edge'));
  assert.ok(migration.includes('v_concept_subject IS DISTINCT FROM v_prerequisite_subject'));
  assert.ok(migration.includes('WITH RECURSIVE reachable'));
  assert.ok(migration.includes('Prerequisite relationship would create a cycle'));
  assert.ok(migration.includes('guard_lesson_concept_subject'));
  assert.ok(migration.includes('Lesson and concept must belong to the same course subject'));
  assert.ok(migration.includes('REVOKE ALL ON FUNCTION public.guard_concept_prerequisite_edge()'));
  assert.ok(migration.includes('REVOKE ALL ON FUNCTION public.guard_lesson_concept_subject()'));
});

test(`revision completion is transactional and limited to the student's own active course`, async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108213452_learning_os_secure_revision_task_completion.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes("public.current_role())::text IS DISTINCT FROM 'student'"));
  assert.ok(migration.includes('student_id = auth.uid()'));
  assert.ok(migration.includes("status = 'pending'"));
  assert.ok(migration.includes('FOR UPDATE'));
  assert.ok(migration.includes("e.status = 'active'"));
  assert.ok(migration.includes("event_type, source_id, occurred_at"));
  assert.ok(migration.includes("'revision_completed'"));
  assert.ok(migration.includes('GRANT EXECUTE ON FUNCTION public.complete_revision_task(uuid) TO authenticated'));
});

test('lesson completion events are deduplicated and advance goals only once', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108213521_learning_os_dedupe_lesson_completion_progress.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('CREATE UNIQUE INDEX IF NOT EXISTS learning_events_one_lesson_completion'));
  assert.ok(migration.includes("NEW.event_type = 'lesson_completed' AND NEW.lesson_id IS NOT NULL"));
  assert.ok(migration.includes("status = CASE WHEN current_value + 1 >= target_value THEN 'completed' ELSE status END"));
});

test('Learning OS goals count only verified lesson completions', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108213407_learning_os_verified_lesson_goals_and_events.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes("event_type = 'lesson_completed'"));
  assert.ok(migration.includes('duration_seconds IS NULL'));
  assert.ok(migration.includes('lp.completed IS TRUE'));
  assert.ok(migration.includes("goal_type = 'lesson_completions'"));
  assert.ok(migration.includes('LEAST(target_value, current_value + 1)'));
  assert.ok(migration.includes('REVOKE ALL ON FUNCTION public.increment_lesson_completion_goals()'));
  const action = await readFile(new URL('../app/actions/learning.ts', import.meta.url), 'utf8');
  assert.ok(action.includes("const allowedTypes = ['lesson_completions']"));
  const dashboard = await readFile(new URL('../components/learning-os-dashboard.tsx', import.meta.url), 'utf8');
  assert.ok(dashboard.includes('Lesson completions'));
  assert.ok(!dashboard.includes('value="study_minutes"'));
});

test('student dashboard keeps achieved goals visible until their period ends', async () => {
  const page = await readFile(new URL('../app/student/page.tsx', import.meta.url), 'utf8');
  assert.ok(page.includes(".in('status',['active','completed'])"));
  assert.ok(page.includes("period_end,course_id,status"));
  const dashboard = await readFile(new URL('../components/learning-os-dashboard.tsx', import.meta.url), 'utf8');
  assert.ok(dashboard.includes("goal.status === 'completed'"));
  assert.ok(dashboard.includes('Current goals'));
});

test('spaced repetition schedules mapped concepts and advances intervals after each review', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108214010_learning_os_adaptive_spaced_revision_scheduler.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('revision_tasks_one_pending_concept'));
  assert.ok(migration.includes("NEW.event_type = 'lesson_completed'"));
  assert.ok(migration.includes("now() + interval '1 day'"));
  assert.ok(migration.includes('ON CONFLICT (student_id, concept_id)'));
  assert.ok(migration.includes('v_completed_count <= 1 THEN 3'));
  assert.ok(migration.includes('v_completed_count = 2 THEN 7'));
  assert.ok(migration.includes('v_completed_count = 3 THEN 14'));
  assert.ok(migration.includes('ELSE 30'));
  assert.ok(migration.includes("event_type, source_id, occurred_at"));
  assert.ok(migration.includes("'revision_completed'"));
});

test('the broad student learning-event insert policy is removed', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108213855_learning_os_remove_permissive_learning_event_insert_policy.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('DROP POLICY IF EXISTS "students record own learning events"'));
});

test('student dashboard completes revision tasks through the guarded database RPC', async () => {
  const action = await readFile(new URL('../app/actions/learning.ts', import.meta.url), 'utf8');
  assert.ok(action.includes("rpc('complete_revision_task', { p_task_id: taskId })"));
  assert.ok(action.includes("profile?.role !== 'student'"));
  const dashboard = await readFile(new URL('../components/learning-os-dashboard.tsx', import.meta.url), 'utf8');
  assert.ok(dashboard.includes('completeRevisionTask'));
  assert.ok(dashboard.includes('Mark revision complete'));
});

test('applied lesson completion deduplication migration is recorded in source control', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108213614_learning_os_dedupe_lesson_completion_events.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('CREATE UNIQUE INDEX IF NOT EXISTS learning_events_one_lesson_completion_idx'));
  assert.ok(migration.includes("event_type = 'lesson_completed'"));
});

test('redundant lesson completion index is removed while canonical index remains', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108213723_learning_os_remove_redundant_lesson_completion_index.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('DROP INDEX IF EXISTS public.learning_events_one_lesson_completion_idx'));
});

test('stale permissive learning-event policy is removed', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108213855_learning_os_remove_permissive_learning_event_insert_policy.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('DROP POLICY IF EXISTS "students record own learning events" ON public.learning_events'));
});

test('student Learning OS dashboard surfaces upcoming exams and assignment deadlines from active courses', async () => {
  const page = await readFile(new URL('../app/student/page.tsx', import.meta.url), 'utf8');
  const component = await readFile(new URL('../components/learning-os-dashboard.tsx', import.meta.url), 'utf8');
  assert.ok(page.includes("from('quizzes')"));
  assert.ok(page.includes("from('written_exams')"));
  assert.ok(page.includes("from('assignments')"));
  assert.ok(page.includes(".eq('published',true).gte('starts_at',nowIso)"));
  assert.ok(page.includes(".eq('published',true).gte('due_at',nowIso)"));
  assert.ok(page.includes('activeCourseIds'));
  assert.ok(component.includes('Upcoming exams'));
  assert.ok(component.includes('Upcoming assignments'));
});

test('programme groups are universal and no longer restricted to chemistry-era cohorts', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108214411_learning_os_generalize_programme_groups.sql', import.meta.url), 'utf8');
  const action = await readFile(new URL('../app/actions/course-studio.ts', import.meta.url), 'utf8');
  const adminPage = await readFile(new URL('../app/admin/courses/page.tsx', import.meta.url), 'utf8');
  const catalogue = await readFile(new URL('../components/course-catalogue.tsx', import.meta.url), 'utf8');
  assert.ok(migration.includes('DROP CONSTRAINT IF EXISTS courses_programme_group_check'));
  assert.ok(migration.includes('char_length(btrim(programme_group)) BETWEEN 1 AND 80'));
  assert.ok(action.includes('group.length>80'));
  assert.ok(action.includes("? 'SSC'" ) || action.includes("?'SSC'"));
  assert.ok(adminPage.includes('Programme / cohort'));
  assert.ok(adminPage.includes('Vocational & Skills'));
  assert.ok(catalogue.includes('courses.map(c=>c.programme_group)'));
  assert.equal(catalogue.includes("const groups=['HSC 2027','HSC 2028','Admission Batch']"), false);
});

test('public platform metadata presents JMT Academy as multi-subject, not Chemistry-only', async () => {
  const layout = await readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8');
  assert.ok(layout.includes('multi-subject learning platform'));
  assert.ok(layout.includes("'Physics','Chemistry','Biology','Mathematics'"));
  assert.ok(layout.includes("'Vocational education'"));
  assert.equal(layout.includes('HSC 2027, HSC 2028 and Admission Batch students'), false);
});

test('verified lesson completion uses one non-bypassable event insert policy', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108214859_learning_os_consolidate_verified_event_insert_policy.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('DROP POLICY IF EXISTS "students record verified lesson completion events"'));
  assert.ok(migration.includes("event_type <> 'lesson_completed' OR duration_seconds IS NULL"));
  assert.ok(migration.includes('lesson_id IS NOT NULL'));
  assert.ok(migration.includes('FROM public.lesson_progress lp'));
  assert.ok(migration.includes('lp.completed IS TRUE'));
});

test('quiz question concepts feed trusted mastery and mistake memory evidence', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108214832_learning_os_quiz_concept_evidence_and_mistake_memory.sql', import.meta.url), 'utf8');
  const patch = await readFile(new URL('../supabase/migrations/20261108214922_learning_os_quiz_evidence_conflict_aliases.sql', import.meta.url), 'utf8');
  const action = await readFile(new URL('../app/actions/academic.ts', import.meta.url), 'utf8');
  const page = await readFile(new URL('../app/academic/page.tsx', import.meta.url), 'utf8');
  assert.ok(migration.includes('ADD COLUMN IF NOT EXISTS concept_id'));
  assert.ok(migration.includes('guard_question_bank_concept'));
  assert.ok(migration.includes('guard_quiz_question_concept'));
  assert.ok(migration.includes('capture_quiz_learning_evidence'));
  assert.ok(migration.includes("'exam_submitted'"));
  assert.ok(migration.includes('learner_concept_mastery'));
  assert.ok(migration.includes('learner_mistake_memory'));
  assert.ok(migration.includes('source_question_id'));
  assert.ok(patch.includes('existing.mastery_score'));
  assert.ok(patch.includes('existing.occurrence_count'));
  const identity = await readFile(new URL('../supabase/migrations/20261108215214_learning_os_reusable_question_identity_and_mistake_resolution.sql', import.meta.url), 'utf8');
  assert.ok(identity.includes('source_bank_question_id'));
  assert.ok(identity.includes('COALESCE(v_question.source_bank_question_id, v_question.id)'));
  const bankIdentity = await readFile(new URL('../supabase/migrations/20261108215223_learning_os_aggregate_repeated_bank_question_mistakes.sql', import.meta.url), 'utf8');
  const cleanup = await readFile(new URL('../supabase/migrations/20261108215412_learning_os_finalize_question_bank_mistake_memory.sql', import.meta.url), 'utf8');
  assert.ok(bankIdentity.includes('question_bank_id'));
  assert.ok(bankIdentity.includes('COALESCE(x.question_bank_id,x.id)'));
  assert.ok(cleanup.includes('DROP COLUMN IF EXISTS source_bank_question_id'));
  assert.ok(cleanup.includes('resolved_at=NEW.submitted_at'));
  assert.ok(action.includes('question_bank_id:q.id'));
  assert.ok(action.includes("concept_id:conceptId"));
  assert.ok(action.includes("concept_id:q.concept_id"));
  assert.ok(page.includes('Knowledge graph concept (optional)'));
  assert.ok(page.includes('questionConcepts'));
});

test('quiz windows are available to teachers and start actions enforce the configured window', async () => {
  const action = await readFile(new URL('../app/actions/academic.ts', import.meta.url), 'utf8');
  const page = await readFile(new URL('../app/academic/page.tsx', import.meta.url), 'utf8');
  assert.ok(action.includes('parseDhakaDateTime'));
  assert.ok(action.includes("select('id,starts_at,ends_at')"));
  assert.ok(action.includes('quiz.starts_at'));
  assert.ok(action.includes('quiz.ends_at'));
  assert.ok(page.includes('Starts at (Bangladesh time, optional)'));
  assert.ok(page.includes('Ends at (Bangladesh time, optional)'));
});

test('quizzes enforce scheduled start/end windows and reject invalid answer references', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108215856_learning_os_enforce_quiz_schedule_and_answer_integrity.sql', import.meta.url), 'utf8');
  const action = await readFile(new URL('../app/actions/academic.ts', import.meta.url), 'utf8');
  const page = await readFile(new URL('../app/academic/page.tsx', import.meta.url), 'utf8');
  assert.ok(migration.includes('v_starts_at'));
  assert.ok(migration.includes('v_ends_at'));
  assert.ok(migration.includes('Quiz has not started'));
  assert.ok(migration.includes('Quiz has ended'));
  assert.ok(migration.includes('Answer refers to an unknown question or option'));
  assert.ok(action.includes('parseDhakaDateTime'));
  assert.ok(action.includes("normalized+'+06:00'"));
  assert.ok(action.includes('roundTrip===normalized?parsed.toISOString():null'));
  assert.ok(action.includes("select('id,starts_at,ends_at')"));
  assert.ok(action.includes('quiz.starts_at'));
  assert.ok(action.includes('quiz.ends_at'));
  assert.ok(page.includes('Starts at (Bangladesh time, optional)'));
  assert.ok(page.includes('Ends at (Bangladesh time, optional)'));
});

test('Exam War Room uses student-guarded RPCs and appears in the student dashboard', async () => {
  const action = await readFile(new URL('../app/actions/learning.ts', import.meta.url), 'utf8');
  const page = await readFile(new URL('../app/student/page.tsx', import.meta.url), 'utf8');
  const component = await readFile(new URL('../components/learning-os-dashboard.tsx', import.meta.url), 'utf8');
  assert.ok(action.includes("rpc('create_exam_war_room_target'"));
  assert.ok(action.includes("rpc('cancel_exam_war_room_target'"));
  assert.ok(action.includes("profile?.role !== 'student'"));
  assert.ok(action.includes('dailyMinutes < 15 || dailyMinutes > 600'));
  assert.ok(page.includes("from('learner_exam_targets')"));
  assert.ok(page.includes('examCourseNames'));
  assert.ok(component.includes('Exam War Room'));
  assert.ok(component.includes('createExamWarRoomTarget'));
  assert.ok(component.includes('cancelExamWarRoomTarget'));
});

test('Learning OS roadmap covers the full subject-agnostic product vision', async () => {
  const roadmap = await readFile(new URL('../docs/LEARNING_OPERATING_SYSTEM_ROADMAP.md', import.meta.url), 'utf8');
  for (const feature of [
    'Academic Twin','Predictive analytics','Adaptive learning paths','Social learning',
    'LXP recommendations','Multi-tenant SaaS','Virtual labs','Parent intelligence',
    'AI agent teachers','Exam War Room','Offline-first mobile experience','Voice tutor',
  ]) assert.ok(roadmap.includes(feature), feature);
  assert.ok(roadmap.includes('Subject-agnostic by design'));
  assert.ok(roadmap.includes('Evidence before prediction'));
});
