import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Learning OS catalogue management is admin-only and supports all subjects', async () => {
  const actions = await read('app/actions/learning-os.ts');
  const page = await read('app/admin/learning/page.tsx');
  assert.ok(actions.includes("profile?.is_active !== true || profile.role !== 'admin'"));
  assert.ok(actions.includes("from('academic_subjects').insert"));
  assert.ok(actions.includes("from('learning_concepts').insert"));
  assert.ok(actions.includes("from('lesson_concepts').upsert"));
  assert.ok(page.includes('Subjects & concept graph'));
  assert.ok(page.includes('Map a lesson to a concept'));
});

test('knowledge graph prerequisite insertion rejects cycles', async () => {
  const actions = await read('app/actions/learning-os.ts');
  assert.ok(actions.includes('An edge A -> B means A requires B'));
  assert.ok(actions.includes('current === conceptId'));
  assert.ok(actions.includes("error=cycle"));
});

test('lesson concepts can only be mapped when course and concept subjects match', async () => {
  const actions = await read('app/actions/learning-os.ts');
  assert.ok(actions.includes("from('course_subjects').select('course_id')"));
  assert.ok(actions.includes("error=subject_mismatch"));
});

test('prerequisite action rejects cross-subject edges before attempting a database write', async () => {
  const actions = await read('app/actions/learning-os.ts');
  assert.ok(actions.includes("select('id,subject_id').eq('id', conceptId)"));
  assert.ok(actions.includes("select('id,subject_id').eq('id', prerequisiteId)"));
  assert.ok(actions.includes('concept.subject_id !== prerequisite.subject_id'));
  assert.ok(actions.includes("error=prerequisite_subject"));
  assert.ok(actions.includes('if (!concept || !prerequisite || edgesError)'));
});

test('teacher workspace surfaces evidence-based learning signals within RLS scope', async () => {
  const page = await read('app/students/manage/page.tsx');
  assert.ok(page.includes("from('learning_events')"));
  assert.ok(page.includes("from('learner_concept_mastery')"));
  assert.ok(page.includes("from('learner_mistake_memory')"));
  assert.ok(page.includes("from('revision_tasks')"));
  assert.ok(page.includes('Number(item.evidence_count)>=3'));
  assert.ok(page.includes('Number(item.mastery_score)<0.55'));
  assert.ok(page.includes('These are learning signals, not exam-result predictions'));
});
