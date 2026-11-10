import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('teacher direct writes are limited to supported academic workflows', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110120000_restrict_teacher_direct_writes_to_supported_workflows.sql', import.meta.url), 'utf8');

  for (const policy of [
    'assigned staff manage assignments',
    'assigned staff manage live classes',
    'assigned teachers manage lesson resources',
    'assigned staff manage quizzes',
    'assigned staff manage quiz questions',
    'teachers manage quiz answer keys',
    'assigned staff manage written exams',
    'assigned staff manage written exam questions',
    'written exam keys staff only',
    'admins and assigned teachers manage lesson concept links',
    'assigned staff update question bank',
    'assigned staff mark attendance',
  ]) {
    assert.match(migration, new RegExp('DROP POLICY IF EXISTS "' + policy + '"'));
  }

  assert.match(migration, /staff create own course assignments[\s\S]*?FOR INSERT/);
  assert.match(migration, /staff create live classes[\s\S]*?FOR INSERT/);
  assert.match(migration, /staff upload lesson resources[\s\S]*?FOR INSERT/);
  assert.match(migration, /staff create quizzes[\s\S]*?FOR INSERT/);
  assert.match(migration, /staff create questions for own quizzes[\s\S]*?FOR INSERT/);
  assert.match(migration, /staff create keys for own quizzes[\s\S]*?FOR INSERT/);
  assert.match(migration, /staff create written exams[\s\S]*?FOR INSERT/);
  assert.match(migration, /staff create questions for own written exams[\s\S]*?FOR INSERT/);
  assert.match(migration, /staff create keys for own written exams[\s\S]*?FOR INSERT/);

  assert.match(migration, /q\.created_by = \(SELECT auth\.uid\(\)\)/);
  assert.match(migration, /x\.created_by = \(SELECT auth\.uid\(\)\)/);
  assert.match(migration, /NOT EXISTS \([\s\S]*?quiz_attempts qa WHERE qa\.quiz_id = quizzes\.id/);
  assert.match(migration, /NOT EXISTS \([\s\S]*?written_exam_submissions s WHERE s\.exam_id = written_exams\.id/);

  assert.match(migration, /admins update question bank[\s\S]*?FOR UPDATE/);
  assert.match(migration, /admins insert lesson concept links[\s\S]*?FOR INSERT/);
  assert.match(migration, /admins update lesson concept links[\s\S]*?FOR UPDATE/);
  assert.match(migration, /admins delete lesson concept links[\s\S]*?FOR DELETE/);

  assert.match(migration, /staff insert assigned course attendance[\s\S]*?FOR INSERT/);
  assert.match(migration, /staff update assigned course attendance[\s\S]*?FOR UPDATE/);
  assert.match(migration, /to_jsonb\(NEW\) - ARRAY\['status','note','marked_by'\]/);
  assert.match(migration, /to_jsonb\(OLD\) - ARRAY\['status','note','marked_by'\]/);
  assert.match(migration, /Teachers may only edit attendance status, note and attribution/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.prevent_teacher_attendance_identity_change\(\) FROM PUBLIC, anon, authenticated/);
});
