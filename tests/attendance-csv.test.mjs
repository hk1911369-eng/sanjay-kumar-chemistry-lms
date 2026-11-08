import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidAttendanceDate } from '../lib/attendance-date.js';
import { buildCsv, csvCell } from '../lib/csv.js';

test('attendance dates must be real calendar dates and cannot be future dates in Dhaka', () => {
  const now = new Date('2026-11-08T00:00:00.000Z');
  assert.equal(isValidAttendanceDate('2026-11-08', now), true);
  assert.equal(isValidAttendanceDate('2026-11-07', now), true);
  assert.equal(isValidAttendanceDate('2026-02-30', now), false);
  assert.equal(isValidAttendanceDate('2026-13-01', now), false);
  assert.equal(isValidAttendanceDate('08-11-2026', now), false);
  assert.equal(isValidAttendanceDate('2026-11-09', now), false);
});

test('CSV escapes formula-leading cells without corrupting ordinary text', () => {
  assert.equal(csvCell('-1+1'), '"\'-1+1"');
  assert.equal(csvCell('=SUM(A1)'), '"\'=SUM(A1)"');
  assert.equal(csvCell('rahim'), '"rahim"');
});

test('CSV output uses real CRLF line breaks for Excel', () => {
  const output = buildCsv([['Name', 'Amount'], ['Rahim', '-1+1'], ['Karim', '=SUM(A1)']]);
  assert.equal(output.split('\r\n').length, 3);
  assert.ok(output.startsWith('\uFEFF'));
  assert.ok(output.includes('"\'-1+1"'));
});
