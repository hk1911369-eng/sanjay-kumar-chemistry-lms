'use client';
import { reviewManualPayment } from '@/app/actions/payments';
export function PaymentReviewForm({submissionId}:{submissionId:string}) {
 return <form action={reviewManualPayment} className="auth-form payment-form" onSubmit={(event)=>{const submitter=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;const decision=submitter?.value==='approve'?'approve':'reject';if(!window.confirm(decision==='approve'?'Confirm that you independently verified this transaction in the merchant account and approve enrollment?':'Confirm rejection of this payment request?')) event.preventDefault();}}>
  <input type="hidden" name="submission_id" value={submissionId}/><label>Admin note / rejection reason<input name="admin_note" maxLength={500} placeholder="Required for rejection"/></label><div className="review-actions"><button className="auth-submit" name="decision" value="approve">Approve & activate</button><button className="danger-button" name="decision" value="reject">Reject</button></div>
 </form>;
}
