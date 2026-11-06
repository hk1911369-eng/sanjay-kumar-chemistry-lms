# Manual payment verification (API not issued yet)

This is a safe interim design for bKash, Nagad and Rocket while merchant API access is pending.

## Student flow
1. Student signs in and selects a published course.
2. Server loads the authoritative course fee from the database. The browser cannot choose or alter the fee.
3. Portal displays the configured merchant payment instructions privately to signed-in students.
4. Student selects wallet, enters transaction ID, amount, and sender mobile number (normalized to the Bangladesh local format; new claims retain the number for Admin verification, while older v8 claims may contain only the last four digits).
5. The submission is stored as `pending_review`. It is NOT a paid order and does NOT unlock course content.

## Admin flow
1. Admin signs in using a separately provisioned admin account with MFA where available.
2. Admin opens the pending submissions queue.
3. Admin signs in to the relevant official merchant dashboard independently and searches the transaction.
4. Admin verifies recipient merchant, transaction ID, amount, currency, status and timestamp.
5. Admin approves/rejects. Approval records reviewer and timestamp, writes an audit log, and activates the enrollment atomically.
6. Duplicate transaction IDs are rejected by a unique constraint.

## Non-negotiable rules
- A transaction ID alone is not proof. No automatic confirmation is possible without a trusted provider API or direct merchant ledger verification.
- Never ask for or store wallet PIN, OTP, password, or full card/account credentials.
- Do not publish the merchant receiving number on the public landing page. Show payment instructions only to authenticated students after course selection.
- Do not put merchant secrets in frontend code, GitHub, or chat.
- Screenshots may help a human reviewer but are not conclusive proof.
- Keep a review/audit trail. Provide a dispute path for students.
- Apply migrations `0001` through `0007` in order on a fresh test project, and review the existing schema and policies before applying to production. Migration 0007 adds the sender mobile field for new claims; RLS restricts it to the submitting student and Admin. The migration is a database building block, not a complete working payment UI/API.

## Database-enforced safeguards (migration 0004)
- A student can submit only for their own account, only for a published course, and only for the exact configured course fee.
- Disabled/unconfigured wallet methods are rejected by the database.
- Transaction references are trimmed and uppercased before uniqueness checks.
- Students cannot update or delete submitted claims.
- Only Admins can read the review queue and call the approval/rejection RPCs. Teachers cannot read payment submissions.
- Approval locks the submission, records the reviewer and audit event, and activates enrollment in the same database transaction.
- Rejection requires an admin reason and records an audit event.
- Admin approval still requires an independent check in the official merchant dashboard. The database cannot prove a transaction ID represents received funds.
