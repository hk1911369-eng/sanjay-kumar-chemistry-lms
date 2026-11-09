'use strict';

const providers = new Set(['bkash', 'nagad', 'rocket']);

function normalizeHeader(value) {
  return String(value ?? '').replace(/^\uFEFF/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeMobile(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  const local = digits.startsWith('880') ? '0' + digits.slice(3) : digits;
  return /^01[3-9]\d{8}$/.test(local) ? local : null;
}

function parseCsv(text) {
  const input = String(text ?? '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell.length === 0) {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      row.push(cell);
      if (row.some(value => value.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (quoted) throw new Error('The CSV contains an unclosed quoted field.');
  row.push(cell);
  if (row.some(value => value.trim() !== '')) rows.push(row);
  return rows;
}

function parseWalletStatementCsv(text, provider) {
  if (!providers.has(String(provider))) throw new Error('Choose a supported wallet provider.');
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('The CSV must contain a header and at least one transaction row.');
  if (rows.length > 501) throw new Error('Upload no more than 500 transaction rows at a time.');

  const headers = rows[0].map(normalizeHeader);
  const findColumn = aliases => headers.findIndex(header => aliases.includes(header));
  const transactionIndex = findColumn(['transactionid', 'trxid', 'txnid', 'transactionreference', 'reference']);
  const amountIndex = findColumn(['amount', 'amountbdt', 'paidamount', 'creditamount']);
  const senderIndex = findColumn(['senderphone', 'sender', 'from', 'mobile', 'mobileno', 'sendernumber']);

  if (transactionIndex < 0 || amountIndex < 0 || senderIndex < 0) {
    throw new Error('CSV headers must identify transaction ID, amount and sender mobile.');
  }

  return rows.slice(1).map((values, index) => {
    const transactionId = String(values[transactionIndex] ?? '').trim().toUpperCase();
    const amountText = String(values[amountIndex] ?? '').trim()
      .replace(/[,৳]/g, '').replace(/\bBDT\b/gi, '').replace(/\s/g, '');
    const amountBdt = /^\d{1,9}$/.test(amountText) ? Number(amountText) : NaN;
    const senderPhone = normalizeMobile(values[senderIndex]);

    if (transactionId.length < 5 || transactionId.length > 100) {
      throw new Error('Invalid transaction ID on CSV row ' + (index + 2) + '.');
    }
    if (!Number.isSafeInteger(amountBdt) || amountBdt <= 0) {
      throw new Error('Invalid BDT amount on CSV row ' + (index + 2) + '.');
    }
    if (!senderPhone) throw new Error('Invalid Bangladesh sender mobile on CSV row ' + (index + 2) + '.');
    return { provider: String(provider), transactionId, amountBdt, senderPhone };
  });
}

function reconcileWalletRows(statementRows, submissions) {
  const counts = new Map();
  for (const row of statementRows) {
    const key = row.provider + ':' + row.transactionId;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const ownersByPhone = new Map();
  for (const submission of submissions) {
    const phone = normalizeMobile(submission.sender_phone);
    if (!phone || !submission.student_id) continue;
    if (!ownersByPhone.has(phone)) ownersByPhone.set(phone, new Set());
    ownersByPhone.get(phone).add(submission.student_id);
  }

  return statementRows.map(row => {
    const key = row.provider + ':' + row.transactionId;
    const sameId = submissions.filter(item => String(item.transaction_id ?? '').trim().toUpperCase() === row.transactionId);
    const sameProvider = sameId.filter(item => item.provider === row.provider);
    let reason = null;
    let submission = null;

    if ((counts.get(key) ?? 0) > 1) reason = 'duplicate_statement_row';
    else if (sameId.some(item => item.provider !== row.provider)) reason = 'cross_provider_duplicate';
    else if (sameProvider.length === 0) reason = 'no_submission';
    else if (sameProvider.length !== 1) reason = 'ambiguous_submission';
    else {
      submission = sameProvider[0];
      if (submission.status !== 'pending_review') reason = 'already_reviewed';
      else if (Number(submission.amount_bdt) !== Number(row.amountBdt)) reason = 'amount_mismatch';
      else if (!normalizeMobile(submission.sender_phone)) reason = 'missing_sender_phone';
      else if (normalizeMobile(submission.sender_phone) !== normalizeMobile(row.senderPhone)) reason = 'sender_mismatch';
      else if ((ownersByPhone.get(normalizeMobile(row.senderPhone))?.size ?? 0) > 1) reason = 'repeated_sender';
    }

    if (reason) return { ...row, status: 'flagged', reason, submissionId: null };
    return {
      ...row,
      status: 'exact_match',
      reason: null,
      submissionId: submission.id,
      studentId: submission.student_id,
      courseId: submission.course_id,
    };
  });
}

module.exports = { normalizeMobile, parseCsv, parseWalletStatementCsv, reconcileWalletRows };
