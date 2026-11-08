import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fetchAllPages } from '../lib/pagination.js';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('fetchAllPages retrieves every page without truncating results', async () => {
  const source = Array.from({ length: 7 }, (_, i) => i + 1);
  const ranges = [];
  const result = await fetchAllPages(async (from, to) => {
    ranges.push([from, to]);
    return { data: source.slice(from, to + 1), error: null };
  }, 3);
  assert.deepEqual(result.data, source);
  assert.deepEqual(ranges, [[0,2],[3,5],[6,8]]);
});

test('fetchAllPages stops on an empty page and returns query errors', async () => {
  const empty = await fetchAllPages(async () => ({ data: [], error: null }), 2);
  assert.deepEqual(empty.data, []);
  const failure = new Error('database unavailable');
  const failed = await fetchAllPages(async () => ({ data: null, error: failure }), 2);
  assert.equal(failed.error, failure);
  assert.equal(failed.data, null);
});

test('student register uses an admin-checked SQL join and paginates the RPC', async () => {
  const migration = await read('supabase/migrations/0045_student_register_export_rpc.sql');
  const route = await read('app/api/admin/student-export/route.ts');
  assert.ok(migration.includes('security invoker'));
  assert.ok(migration.includes("public.current_role())::text <> 'admin'"));
  assert.ok(migration.includes('left join lateral'));
  assert.ok(migration.includes("m.status::text = 'approved'"));
  assert.ok(route.includes("rpc('get_student_register_export')"));
  assert.ok(route.includes('fetchAllPages'));
  assert.equal(route.includes('.limit(5000)'), false);
  assert.equal(route.includes('.limit(10000)'), false);
  assert.equal(route.includes('.limit(20000)'), false);
});

test('finance export paginates both approved payments and ledger entries', async () => {
  const route = await read('app/api/admin/finance-export/route.ts');
  assert.ok(route.includes('fetchAllPages'));
  assert.ok(route.includes('.range(from, to)'));
  assert.ok(route.includes("from('manual_payment_submissions')"));
  assert.ok(route.includes("from('finance_entries')"));
});
