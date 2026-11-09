import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('practical assignments may map to only a published concept in the experiment subject', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110245000_link_practical_reviews_to_learning_concepts.sql', import.meta.url), 'utf8');
  assert.match(migration, /add column if not exists concept_id uuid/i);
  assert.match(migration, /new\.concept_id is distinct from old\.concept_id/i);
  assert.match(migration, /lc\.subject_id = v_subject_id/i);
  assert.match(migration, /lc\.is_published is true/i);
  assert.match(migration, /experiment subject/i);
});

test('only graded review-history rounds emit practical learning evidence', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110245000_link_practical_reviews_to_learning_concepts.sql', import.meta.url), 'utf8');
  assert.match(migration, /'practical_reviewed'/i);
  assert.match(migration, /after insert on public\.lab_notebook_review_history/i);
  assert.match(migration, /new\.decision = 'reviewed' and new\.score is not null/i);
  assert.match(migration, /a\.concept_id is not null/i);
  assert.match(migration, /lc\.is_published is true/i);
  assert.match(migration, /new\.review_round/i);
  assert.match(migration, /new\.rubric_scores/i);
  assert.match(migration, /new\.reviewed_at/i);
  assert.match(migration, /on conflict \(student_id, source_id\)[\s\S]*do nothing/i);
  assert.match(migration, /learning_events_one_practical_review_per_round/i);
});

test('student-authored events cannot spoof practical-review evidence', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109190000_harden_learning_event_integrity.sql', import.meta.url), 'utf8');
  assert.match(migration, /event_type in \('lesson_viewed','lesson_completed','practice_started'\)/i);
  assert.doesNotMatch(migration, /'practical_reviewed'/i);
});

test('teacher assignment form offers only concepts that match each experiment subject', async () => {
  const [action, teacher, student] = await Promise.all([
    readFile(new URL('../app/actions/lab-practical-assignments.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/teacher/lab-notebooks/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/student/lab-notebook/page.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(action, /conceptChoice/);
  assert.match(action, /conceptParts\[0\] === courseId/);
  assert.match(action, /conceptParts\[1\] === labId/);
  assert.match(action, /concept_id: conceptId \|\| null/);
  assert.match(teacher, /learning_concepts/);
  assert.match(teacher, /concept\.subject_id===lab\.subjectId/);
  assert.match(teacher, /name="concept_choice"/);
  assert.match(student, /concept_id,title,instructions/);
  assert.match(student, /conceptName\.get\(task\.concept_id\)/);
});


test('practical cohort analytics splits by assessed concept and keeps the five-learner privacy threshold', async () => {
  const [migration, page] = await Promise.all([
    readFile(new URL('../supabase/migrations/20261110246000_group_lab_analytics_by_concept.sql', import.meta.url), 'utf8'),
    readFile(new URL('../app/teacher/lab-analytics/page.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /security_invoker = true/i);
  assert.match(migration, /a\.concept_id/i);
  assert.match(migration, /lc\.title as concept_title/i);
  assert.match(migration, /group by[\s\S]*a\.concept_id[\s\S]*lc\.title/i);
  assert.match(migration, /having count\(distinct h\.student_id\) >= 5/i);
  assert.match(page, /Assessed concept: \{row\.concept_title\}/);
});
