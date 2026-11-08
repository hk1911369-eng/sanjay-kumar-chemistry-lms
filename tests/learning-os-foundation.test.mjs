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
  for (const table of ['learner_profiles','learner_concept_mastery','learner_mistake_memory','revision_tasks']) {
    assert.ok(migration.includes(`GRANT SELECT ON public.${table}`), table);
  }
  assert.equal(migration.includes('GRANT INSERT, UPDATE, DELETE ON public.learner_profiles'), false);
  assert.equal(migration.includes('GRANT INSERT, UPDATE, DELETE ON public.learner_concept_mastery'), false);
  assert.equal(migration.includes('GRANT INSERT, UPDATE, DELETE ON public.learner_mistake_memory'), false);
  assert.equal(migration.includes('GRANT INSERT, UPDATE, DELETE ON public.revision_tasks'), false);
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
