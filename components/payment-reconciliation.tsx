'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { approveReconciledPayments, previewPaymentStatement } from '@/app/actions/payments';

type StatementRow = {
  provider: 'bkash' | 'nagad' | 'rocket';
  transactionId: string;
  amountBdt: number;
  senderPhone: string;
};
type Match = {
  submissionId: string;
  transactionId: string;
  amountBdt: number;
  senderLast4: string;
  studentName: string;
  courseTitle: string;
};
type Flagged = { transactionId: string; amountBdt: number; reason: string };
type Preview = { rows: StatementRow[]; matches: Match[]; flagged: Flagged[] };

const reasonLabels: Record<string, string> = {
  duplicate_statement_row: 'Duplicate transaction appears in the uploaded statement',
  cross_provider_duplicate: 'Same transaction ID appears under another wallet provider',
  no_submission: 'No student payment submission found',
  ambiguous_submission: 'More than one submission uses this transaction ID',
  already_reviewed: 'Submission has already been reviewed',
  amount_mismatch: 'Statement amount does not match the student submission',
  missing_sender_phone: 'Student submission has no verified sender mobile',
  sender_mismatch: 'Sender mobile does not match the student submission',
  repeated_sender: 'Sender mobile is associated with multiple students',
};

export function PaymentReconciliation() {
  const [provider, setProvider] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set('provider', provider);
    setMessage('');
    setPreview(null);
    startTransition(() => {
      void previewPaymentStatement(formData).then(result => {
        if ('error' in result) {
          setMessage(result.error === 'invalid_file'
            ? 'Choose a CSV file under 1 MB and select a wallet provider.'
            : result.error);
          return;
        }
        setPreview(result);
        setMessage('Statement checked. Only exact matches are eligible for bulk approval.');
      }).catch(() => setMessage('Could not process this statement. Please try again.'));
    });
  }

  function handleApprove() {
    if (!preview?.matches.length) return;
    const accepted = window.confirm(
      'Approve ' + preview.matches.length + ' exact-match payment(s)? Each payment will be rechecked by the database before approval.',
    );
    if (!accepted) return;
    startTransition(() => {
      void approveReconciledPayments(preview.rows).then(result => {
        if ('error' in result) {
          setMessage('Bulk approval could not run: ' + result.error);
          return;
        }
        setMessage('Bulk review finished: ' + result.approved + ' approved, ' + result.failed + ' failed, ' + result.skipped + ' flagged or skipped.');
        setPreview(null);
      }).catch(() => setMessage('Bulk approval could not be completed. Check the payment review queue.'));
    });
  }

  return (
    <section className="portal-card payment-reconciliation">
      <span className="auth-kicker">ADMIN FINANCE TOOL</span>
      <h2>Reconcile wallet statement</h2>
      <p className="muted">Upload a bKash, Nagad or Rocket CSV statement. The file is processed in memory and is not stored. Exact provider, transaction ID, amount and sender matches are separated from mismatches and duplicate warnings.</p>
      <form className="auth-form" onSubmit={handlePreview}>
        <label>Wallet provider
          <select value={provider} onChange={event => setProvider(event.target.value as typeof provider)}>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
            <option value="rocket">Rocket</option>
          </select>
        </label>
        <label>Wallet statement CSV (maximum 1 MB / 500 rows)
          <input name="statement" type="file" accept=".csv,text/csv" required />
        </label>
        <p className="muted small-note">Required CSV columns: Transaction ID / TrxID, Amount / Amount BDT, and Sender Phone / Sender. Amounts must be whole BDT values.</p>
        <button className="auth-submit" type="submit" disabled={isPending}>{isPending ? 'Checking statement…' : 'Preview reconciliation'}</button>
      </form>
      {message && <p className="form-success" role="status">{message}</p>}
      {preview && <>
        <div className="portal-stats">
          <article><b>{preview.matches.length}</b><span>Exact matches</span></article>
          <article><b>{preview.flagged.length}</b><span>Flagged / unmatched</span></article>
          <article><b>{preview.rows.length}</b><span>Statement rows</span></article>
        </div>
        {preview.matches.length > 0 && <>
          <h3>Exact matches ready for approval</h3>
          <div className="table-scroll"><table><thead><tr><th>Transaction</th><th>Student</th><th>Course</th><th>Amount</th><th>Sender</th></tr></thead>
            <tbody>{preview.matches.map(match => <tr key={match.submissionId}><td><code>{match.transactionId}</code></td><td>{match.studentName}</td><td>{match.courseTitle}</td><td>৳{match.amountBdt.toLocaleString('en-BD')}</td><td>•••• {match.senderLast4}</td></tr>)}</tbody>
          </table></div>
          <button type="button" className="auth-submit" disabled={isPending} onClick={handleApprove}>Approve {preview.matches.length} exact matches</button>
        </>}
        {preview.flagged.length > 0 && <>
          <h3>Manual review required</h3>
          <div className="table-scroll"><table><thead><tr><th>Transaction</th><th>Statement amount</th><th>Reason</th></tr></thead>
            <tbody>{preview.flagged.map((item,index) => <tr key={item.transactionId+'-'+index}><td><code>{item.transactionId}</code></td><td>৳{item.amountBdt.toLocaleString('en-BD')}</td><td>{reasonLabels[item.reason] ?? item.reason}</td></tr>)}</tbody>
          </table></div>
        </>}
      </>}
    </section>
  );
}
