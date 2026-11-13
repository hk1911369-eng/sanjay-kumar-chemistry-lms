import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  normalizeMobile,
  parseCsv,
  parseWalletStatementCsv,
  reconcileWalletRows,
} from '../lib/payment-reconciliation.js';

test('CSV parser supports BOM, CRLF, quoted commas and escaped quotes', () => {
  assert.deepEqual(parseCsv('\uFEFFTrxID,Amount,Sender\r\nABC123,"1,200",01712345678\r\nXYZ456,"1,000",01712345678'), [
    ['TrxID','Amount','Sender'],
    ['ABC123','1,200','01712345678'],
    ['XYZ456','1,000','01712345678'],
  ]);
  assert.deepEqual(parseCsv('Name,Note\nRahim,"Paid, verified"'), [
    ['Name','Note'],['Rahim','Paid, verified'],
  ]);
  assert.throws(() => parseCsv('TrxID,Amount,Sender\nABC123,100,"01712345678'), /unclosed quoted field/);
});

test('wallet statement parser validates provider, required headers and Bangladesh mobile', () => {
  const rows = parseWalletStatementCsv(
    'Transaction ID,Amount BDT,Sender Phone\r\nABC123,"৳ 1,200",+8801712345678',
    'bkash',
  );
  assert.deepEqual(rows, [{
    provider:'bkash',transactionId:'ABC123',amountBdt:1200,senderPhone:'01712345678',
  }]);
  assert.equal(normalizeMobile('8801812345678'),'01812345678');
  assert.equal(normalizeMobile('01712345678'), '01712345678');
  assert.equal(normalizeMobile('01112345678'), null);
  assert.throws(() => parseWalletStatementCsv('TrxID,Amount\nABC123,1200','bkash'), /headers/);
  assert.throws(() => parseWalletStatementCsv('TrxID,Amount,Sender\nABC123,0,01712345678','bkash'), /amount/);
  assert.throws(() => parseWalletStatementCsv('TrxID,Amount,Sender\nABC123,1200,01234567890','bkash'), /mobile/);
  assert.throws(() => parseWalletStatementCsv('TrxID,Amount,Sender\nABC123,1200,01712345678','bitcoin'), /provider/);
});

test('reconciliation approves only exact provider, transaction, amount and sender matches', () => {
  const submissions = [
    {id:'1',provider:'bkash',transaction_id:'ABC123',amount_bdt:1200,sender_phone:'01712345678',student_id:'student-a',course_id:'course-a',status:'pending_review'},
    {id:'2',provider:'nagad',transaction_id:'DEF456',amount_bdt:900,sender_phone:'01812345678',student_id:'student-b',course_id:'course-b',status:'pending_review'},
    {id:'3',provider:'bkash',transaction_id:'GHI789',amount_bdt:500,sender_phone:'01912345678',student_id:'student-c',course_id:'course-c',status:'approved'},
  ];
  const rows = [
    {provider:'bkash',transactionId:'ABC123',amountBdt:1200,senderPhone:'01712345678'},
    {provider:'bkash',transactionId:'DEF456',amountBdt:900,senderPhone:'01812345678'},
    {provider:'bkash',transactionId:'GHI789',amountBdt:500,senderPhone:'01912345678'},
    {provider:'bkash',transactionId:'NOPE99',amountBdt:500,senderPhone:'01712345678'},
  ];
  const result = reconcileWalletRows(rows, submissions);
  assert.equal(result[0].status,'exact_match');
  assert.equal(result[0].submissionId,'1');
  assert.equal(result[1].reason,'cross_provider_duplicate');
  assert.equal(result[2].reason,'already_reviewed');
  assert.equal(result[3].reason,'no_submission');
});

test('reconciliation flags duplicate statement rows, amount mismatch, sender mismatch and repeated senders', () => {
  const submissions = [
    {id:'1',provider:'bkash',transaction_id:'ABC123',amount_bdt:1200,sender_phone:'01712345678',student_id:'student-a',status:'pending_review'},
    {id:'2',provider:'bkash',transaction_id:'XYZ999',amount_bdt:1000,sender_phone:'01712345678',student_id:'student-b',status:'pending_review'},
    {id:'3',provider:'nagad',transaction_id:'DEF456',amount_bdt:900,sender_phone:'01812345678',student_id:'student-c',status:'pending_review'},
  ];
  const rows = [
    {provider:'bkash',transactionId:'ABC123',amountBdt:1200,senderPhone:'01712345678'},
    {provider:'bkash',transactionId:'ABC123',amountBdt:1200,senderPhone:'01712345678'},
    {provider:'bkash',transactionId:'XYZ999',amountBdt:999,senderPhone:'01712345678'},
    {provider:'nagad',transactionId:'DEF456',amountBdt:900,senderPhone:'01912345678'},
  ];
  const result = reconcileWalletRows(rows, submissions);
  assert.equal(result[0].reason,'duplicate_statement_row');
  assert.equal(result[1].reason,'duplicate_statement_row');
  assert.equal(result[2].reason,'amount_mismatch');
  assert.equal(result[3].reason,'sender_mismatch');
});

test('bulk reconciliation is admin-only, rechecks exact matches and requires explicit approval', async () => {
  const actions = await readFile(new URL('../app/actions/payments.ts', import.meta.url), 'utf8');
  const dashboard = await readFile(new URL('../app/admin/page.tsx', import.meta.url), 'utf8');
  const component = await readFile(new URL('../components/payment-reconciliation.tsx', import.meta.url), 'utf8');
  assert.ok(actions.includes("profile?.is_active !== true || profile.role !== 'admin'"));
  assert.ok(actions.includes('reconcileWalletRows(rows, loaded.records)'));
  assert.ok(actions.includes("'approve_manual_payment_submission'"));
  assert.ok(actions.includes('file.text()'));
  assert.ok(dashboard.includes('<PaymentReconciliation />'));
  assert.ok(component.includes('window.confirm'));
  assert.ok(component.includes('Approve'));
});
