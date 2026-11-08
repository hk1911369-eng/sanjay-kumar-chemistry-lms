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
