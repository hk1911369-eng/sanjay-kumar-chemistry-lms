import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('academic scheduling uses strict Bangladesh-local date parsing', async () => {
  const source = await readFile(new URL('../app/actions/academic.ts', import.meta.url), 'utf8');
  assert.match(source, /function parseDhakaDateTime\(value:string\):string\|null/);
  assert.match(source, /roundTrip===normalized\?parsed\.toISOString\(\):null/);
  assert.match(source, /const startsAt=parseDhakaDateTime\(starts\)/);
  assert.match(source, /const endsAt=parseDhakaDateTime\(ends\)/);
  assert.match(source, /new Date\(endsAt\)<=new Date\(startsAt\)/);
});

test('assignment due dates reject malformed and impossible local timestamps', async () => {
  const source = await readFile(new URL('../app/actions/academic.ts', import.meta.url), 'utf8');
  assert.match(source, /const dueAt=due\?parseDhakaDateTime\(due\):null/);
  assert.match(source, /\(due&&!dueAt\)/);
  assert.match(source, /due_at:dueAt/);
  assert.doesNotMatch(source, /due_at:due\?new Date\(due\)\.toISOString\(\):null/);
});

test('written exams require both valid schedule endpoints or neither', async () => {
  const source = await readFile(new URL('../app/actions/academic.ts', import.meta.url), 'utf8');
  assert.match(source, /Boolean\(start\)!==Boolean\(end\)/);
  assert.match(source, /start&&\(!startsAt\|\|!endsAt\|\|new Date\(endsAt\)<=new Date\(startsAt\)\)/);
  assert.match(source, /starts_at:startsAt,ends_at:endsAt/);
  assert.doesNotMatch(source, /starts_at:start\?new Date\(start\)\.toISOString\(\)/);
});
