import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('practice analytics is limited to admin or assigned teaching courses', async () => {
  const page = await readFile(new URL('../app/teacher/practice/analytics/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /\['admin', 'teacher', 'staff'\]/);
  assert.match(page, /from\('course_assignments'\)/);
  assert.match(page, /\.eq\('teacher_id', user\.id\)/);
  assert.match(page, /rpc\('get_staff_practice_analytics'\)/);
  assert.match(page, /\.is\('archived_at', null\)/);
});

test('practice analytics consumes database aggregates without selecting raw attempt rows', async () => {
  const page = await readFile(new URL('../app/teacher/practice/analytics/page.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /from\('student_practice_attempts'\)/);
  assert.match(page, /option_counts/);
  assert.match(page, /mostSelectedWrongOption/);
  assert.match(page, /last 90 days/i);
});

test('database analytics RPC is staff-scoped, time-bounded and identity-free', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261109295000_add_staff_practice_analytics_rpc.sql', import.meta.url),
    'utf8',
  );
  assert.match(migration, /public\.current_role\(\)::text NOT IN \('admin', 'teacher', 'staff'\)/i);
  assert.match(migration, /ca\.teacher_id = auth\.uid\(\)/i);
  assert.match(migration, /c\.archived_at IS NULL/i);
  assert.match(migration, /a\.answered_at >= now\(\) - interval '90 days'/i);
  assert.match(migration, /jsonb_object_agg/i);
  assert.doesNotMatch(migration, /student_id/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.get_staff_practice_analytics\(\) FROM PUBLIC, anon/i);
});

test('intervention flags require repeated evidence and low accuracy, not one response', async () => {
  const page = await readFile(new URL('../app/teacher/practice/analytics/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /question\.attempts >= 5/);
  assert.match(page, /question\.accuracy \?\? 100\) < 60/);
  assert.match(page, /No clear difficulty pattern yet/);
});

test('practice analytics is available from the staff portal navigation', async () => {
  const layout = await readFile(new URL('../components/portal-layout.tsx', import.meta.url), 'utf8');
  assert.match(layout, /key: 'practice-analytics', label: 'Practice analytics', href: '\/teacher\/practice\/analytics'/);
});


test('staff practice aggregates suppress cohorts smaller than five responses', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261109298000_suppress_small_practice_cohorts.sql', import.meta.url),
    'utf8',
  );
  assert.match(migration, /HAVING count\(\*\) >= 5/i);
  assert.match(migration, /eligible_questions AS/i);
  assert.match(migration, /JOIN eligible_questions/i);
});
