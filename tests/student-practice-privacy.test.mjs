import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('practice analytics has only the response fields it needs, not learner identity', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261109294000_limit_practice_attempt_identity_access.sql', import.meta.url),
    'utf8',
  );
  assert.match(migration, /REVOKE ALL ON TABLE public\.student_practice_attempts FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /GRANT SELECT \([\s\S]*question_id[\s\S]*selected_option[\s\S]*is_correct[\s\S]*awarded_marks[\s\S]*answered_at[\s\S]*\) ON public\.student_practice_attempts TO authenticated/i);
  assert.equal(/GRANT SELECT \([\s\S]*student_id/i.test(migration), false);
  assert.equal(/GRANT SELECT \([\s\S]*\bid\b/i.test(migration), false);
});
