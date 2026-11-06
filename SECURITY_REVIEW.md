# Security review — v9 work increment

## Implemented / reinforced

- Public registration is Student-only; roles are not accepted from form fields or user metadata.
- Role escalation remains blocked by a database trigger and Admin provisioning is a trusted SQL operation.
- Server actions check the current authenticated user and role before sensitive operations.
- Payment claims are immutable to clients and remain pending until Admin review.
- Approval/rejection uses Admin-only database functions; approval locks the payment row, rechecks the allowed course and ৳700 amount, updates payment, activates enrollment and writes audit log in one database transaction.
- Duplicate transaction references are normalized and unique by provider/transaction ID.
- Admin payment review requires a browser confirmation before submission.
- Wallet receiving numbers remain blank/disabled until Admin configuration.
- Teacher RLS is restricted to assigned courses; teachers cannot view payment review or other students' enrollment lists.
- Student profile, payment, enrollment and progress access is owner-scoped; lesson access requires active enrollment and published lesson.
- Video links are HTTPS-only at the database boundary for new/updated lesson rows.
- Service-role client is marked server-only; the service-role key is not in `.env.example` and is not used by browser code.
- Security headers include nosniff, referrer policy, frame denial, HSTS and a restrictive permissions policy.

## Not yet verified / remaining risks

- RLS policies have not been executed against Supabase. They require tests using separate Student A, Student B, Teacher A, Teacher B and Admin accounts.
- Migration SQL has not been applied to a test or production database; validate against the actual schema/migration history before deployment.
- Rate limiting is not implemented on login, registration or payment submission.
- Admin MFA is not enforced by application policy; configure and test it in Supabase Auth before production.
- Private file uploads, private Storage buckets and signed download URLs are not implemented. Do not upload confidential files yet.
- External video links are not DRM; screen recording and copying cannot be prevented.
- Complete XSS/CSRF/dependency audit and production penetration testing have not been performed.
- Full email delivery depends on Supabase SMTP/provider configuration and has not been tested.
- The included tests are static source assertions, not proof of runtime security.

**Conclusion:** Useful security controls are present in source, but this increment must not be represented as fully security-tested or production-ready until the outstanding integration checks are completed.
