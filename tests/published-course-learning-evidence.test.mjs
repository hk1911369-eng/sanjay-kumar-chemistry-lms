import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('lesson completion requires a published non-archived parent course', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113210000_require_published_course_for_learning_evidence.sql', import.meta.url), 'utf8');
  const lessonFunction = migration.split('CREATE OR REPLACE FUNCTION public.record_simulation_completion')[0];
  assert.match(lessonFunction, /JOIN public\.lessons l ON l\.course_id = c\.id/i);
  assert.match(lessonFunction, /c\.is_published IS TRUE/i);
  assert.match(lessonFunction, /c\.archived_at IS NULL/i);
  assert.match(lessonFunction, /l\.is_published IS TRUE/i);
  assert.match(lessonFunction, /e\.admission_fee_paid IS TRUE/i);
  assert.match(lessonFunction, /e\.paid_through >= v_month_end/i);
});

test('simulation completion requires published non-archived course and paid enrollment', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113210000_require_published_course_for_learning_evidence.sql', import.meta.url), 'utf8');
  const simulationFunction = migration.split('CREATE OR REPLACE FUNCTION public.record_simulation_completion')[1];
  assert.match(simulationFunction, /c\.is_published IS TRUE/i);
  assert.match(simulationFunction, /c\.archived_at IS NULL/i);
  assert.match(simulationFunction, /e\.status = 'active'/i);
  assert.match(simulationFunction, /e\.admission_fee_paid IS TRUE/i);
  assert.match(simulationFunction, /e\.paid_through >= v_period_end/i);
  assert.match(simulationFunction, /REVOKE ALL ON FUNCTION public\.record_simulation_completion/i);
  assert.match(simulationFunction, /GRANT EXECUTE ON FUNCTION public\.record_simulation_completion/i);
});
