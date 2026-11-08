import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isValidAttendanceDate } from '../lib/attendance-date.js';
import { buildCsv, csvCell } from '../lib/csv.js';

test('attendance dates must be real calendar dates and cannot be future dates in Dhaka', () => {
  const now = new Date('2026-11-08T00:00:00.000Z');
  assert.equal(isValidAttendanceDate('2026-11-08', now), true);
  assert.equal(isValidAttendanceDate('2026-11-07', now), true);
  assert.equal(isValidAttendanceDate('2026-02-30', now), false);
  assert.equal(isValidAttendanceDate('2026-02-31', now), false);
  assert.equal(isValidAttendanceDate('2026-13-01', now), false);
  assert.equal(isValidAttendanceDate('08-11-2026', now), false);
  assert.equal(isValidAttendanceDate('2026-11-09', now), false);
  assert.equal(isValidAttendanceDate('2026-11-8', now), false);
});

test('CSV escapes formula-leading cells without corrupting ordinary text', () => {
  assert.equal(csvCell('-1+1'), '"\'-1+1"');
  assert.equal(csvCell('=SUM(A1)'), '"\'=SUM(A1)"');
  assert.equal(csvCell('+cmd'), "\"'+cmd\"");
  assert.equal(csvCell('@value'), "\"'@value\"");
  assert.equal(csvCell('\tstart'), "\"'\tstart\"");
  assert.equal(csvCell(' =SUM(A1)'), "\"' =SUM(A1)\"");
  assert.equal(csvCell('\n=SUM(A1)'), "\"'\n=SUM(A1)\"");
  assert.equal(csvCell('rahim'), '"rahim"');
  assert.equal(csvCell('tab\tvalue'), '"tab\tvalue"');
  assert.equal(csvCell('t123'), '"t123"');
  assert.equal(csvCell('r123'), '"r123"');
  assert.equal(csvCell('a"b'), '"a""b"');
});

test('CSV output uses a BOM and real CRLF row separators', () => {
  const output = buildCsv([['Name', 'Amount'], ['Rahim', '-1+1'], ['Karim', '=SUM(A1)']]);
  assert.equal(output.charCodeAt(0), 0xFEFF);
  assert.equal(output.split('\r\n').length, 3);
  assert.equal(output.split('\n').length, 3);
  assert.ok(output.includes('"\'-1+1"'));
  assert.ok(output.includes('"\'=SUM(A1)"'));
});

test('attendance and exports use the shared, tested helpers', async () => {
  const action = await readFile(new URL('../app/actions/student-management.ts', import.meta.url), 'utf8');
  const studentExport = await readFile(new URL('../app/api/admin/student-export/route.ts', import.meta.url), 'utf8');
  const financeExport = await readFile(new URL('../app/api/admin/finance-export/route.ts', import.meta.url), 'utf8');
  assert.ok(action.includes('isValidAttendanceDate(attendanceDate)'));
  assert.ok(studentExport.includes("from '@/lib/csv'"));
  assert.ok(studentExport.includes('fetchAllPages'));
  assert.ok(financeExport.includes("from '@/lib/csv'"));
});
