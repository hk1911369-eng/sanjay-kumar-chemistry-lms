# JMT Database Reconciliation and Safe Rollout Runbook

**Status:** Read-only findings and proposed sequence; no SQL in this document has been applied.  
**Date:** 11 November 2026  
**Projects:** Primary Supabase project and JMT Test.  
**Rule:** Never replay the JMT Test migration ledger into the primary project or modify production privileges/schema without a reviewed backup, staging rehearsal and explicit release authorization.

## 1. Current verified database facts

All figures below were obtained from read-only Supabase metadata/table inventory queries on 11 November 2026. No row contents or personal data were read.

| Check | Primary project | JMT Test |
|---|---:|---:|
| Public base tables | 49 | 57 |
| RLS-enabled public tables | 49 | 57 |
| Public tables owned by postgres | 49 | 57 |
| Current tables granting authenticated TRUNCATE | 33 | 0 |
| Current tables granting authenticated TRIGGER | 33 | 0 |
| Current tables granting anon TRUNCATE or TRIGGER | 0 | 0 |
| Academic subjects | 0 | 8 |
| Courses | 0 | 3 |
| Course-subject mappings | 0 | 24 |
| Enrollments | 0 | 0 |
| Lessons | 0 | 0 |
| Quizzes / questions / attempts | 0 / 0 / 0 | 0 / 0 / 0 |
| Written exams / submissions | 0 / 0 | 0 / 0 |
| Written-exam drafts table | Absent | Absent |
| Virtual-lab catalogue | Absent | 17 |
| Lab notebook/evidence/practical tables | Absent | Present, zero rows |
| Student practice questions/attempts | Absent | Present, zero rows |

Both projects have RLS enabled on every current public base table. This does not by itself prove that each policy is correct.

## 2. Privilege findings and important nuance

### Existing table grants

- Primary: all 49 public tables are owned by `postgres`; 33 grant authenticated users TRUNCATE and 33 grant authenticated users TRIGGER.
- JMT Test: all 57 public tables are owned by `postgres`; none grant authenticated TRUNCATE or TRIGGER.
- Neither project currently grants anon TRUNCATE or TRIGGER on existing public tables.

### Default privileges

The read-only `pg_default_acl` check found:
- Primary `postgres` default table ACL still includes TRUNCATE and TRIGGER for both `anon` and `authenticated`.
- JMT Test `postgres` default table ACL does not include those two privileges for either client role.
- `supabase_admin` default table ACL still includes TRUNCATE and TRIGGER for `anon` and `authenticated` in both projects.

All currently inventoried public tables are owned by `postgres`. The `supabase_admin` defaults are a future-object risk only if that role (or an execution path using its defaults) creates exposed public tables. Confirm actual migration/object-creation roles and role membership before changing platform-managed defaults. Do not blindly alter `supabase_admin` privileges.

### Candidate hardening SQL — template only, NOT EXECUTED

After confirming the target project, object owner, grantor, backup and migration execution role, the owner-specific pattern to review is:

```sql
-- Run as a role that owns the affected tables / can revoke these grants.
REVOKE TRUNCATE, TRIGGER
ON ALL TABLES IN SCHEMA public
FROM anon, authenticated;

-- Applies only to future tables created by postgres.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE TRUNCATE, TRIGGER ON TABLES
FROM anon, authenticated;
```

This template is not a complete migration. Before adopting it:
1. Verify whether any intentional operational client workflow depends on either privilege (normally clients should not).
2. Inspect grants by grantor, not just `has_table_privilege`.
3. Verify sequence/function grants separately; this statement changes only table TRUNCATE/TRIGGER.
4. Confirm the migration connection actually creates objects as `postgres`.
5. Decide whether a supported, non-platform-managed owner role should replace `supabase_admin` for application DDL.
6. Apply to disposable staging first; re-query all current tables and default ACLs afterward.
7. Confirm normal student, teacher and admin CRUD still works through RLS and least-privilege grants.

Do not add `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin` unless role membership/authority and the actual need are proven.

## 3. Migration reconciliation blockers

### A. Virtual-lab catalogue subject foreign keys

Branch migration:
`supabase/migrations/20261110100000_database_driven_virtual_lab_catalog.sql`

It creates `public.virtual_lab_catalog` with a non-null FK to `public.academic_subjects(id)`, then inserts catalogue rows using fixed subject UUIDs:
- Physics: `10000000-0000-4000-8000-000000000002`
- Chemistry: `10000000-0000-4000-8000-000000000001`
- Biology: `10000000-0000-4000-8000-000000000003`
- Mathematics: `10000000-0000-4000-8000-000000000004`
- ICT: `10000000-0000-4000-8000-000000000006`

Primary currently has zero academic subjects; JMT Test has eight and 17 catalogue rows. The migration cannot safely be assumed to apply to an empty primary database. The FK seed precondition must be made explicit and verified before rollout.

**Required design:** use stable subject slugs/codes as canonical identity; seed required subject rows idempotently before catalogue insertion; resolve catalogue FKs from those stable keys rather than relying solely on opaque fixed UUIDs; verify the expected five subject mappings and catalogue count. Preserve existing subject IDs in an already-populated environment—do not overwrite or duplicate them.

### B. Written-exam draft recovery

Branch migration:
`supabase/migrations/20261111110000_add_written_exam_autosave_recovery.sql`

It creates `written_exam_drafts`, guarded load/save RPCs, optimistic version checks, and a trigger that clears the draft after final submission. The table is absent from both live projects. Its version is not present in the currently reported JMT Test migration ledger, which already contains later migration versions.

**Required design:** do not assume this migration can be applied by simply appending it to the end of the current test ledger. Reconcile version ordering and semantic dependencies against both ledgers, inspect later migrations for overlapping policy/function changes, and test a clean replay from a known baseline. Verify draft load/save, two-tab conflict, paid/schedule gates, final-submit cleanup and immutability in staging.

### C. Migration ledger

Migration histories differ substantially. Matching normalized names is not proof that SQL semantics match. Never:
- replay the entire JMT Test ledger into primary;
- delete migration history to force parity;
- manually mark migrations applied without proving equivalent schema/data state;
- edit an already-applied migration and assume the test project will rerun it.

Build a migration-by-migration reconciliation matrix with version, checksum/source, dependencies, schema effect, data effect, idempotency, target-project presence and test evidence.

## 4. Safe rollout sequence

### Gate 0 — freeze and evidence
- Record exact PR SHA, migration file hashes and both project refs.
- Export schema-only snapshots and migration ledgers.
- Confirm recoverable backups and perform a restore rehearsal into a disposable environment.
- Do not include personal data in fixtures or evidence artifacts.

### Gate 1 — representative staging
- Use a genuinely isolated project/branch with schema aligned to the intended release candidate.
- Confirm cost and project ownership before provisioning any new Supabase project/branch.
- Seed synthetic profiles for student-paid, student-unpaid, student-expired, inactive student, assigned/unassigned teacher, active/inactive admin.
- Seed two courses, course assignments, enrollments, lessons, quiz questions, written exam, practical assignment, notebook and payment test records.
- Use synthetic storage files and stubbed payment-provider responses.

### Gate 2 — privilege and policy verification
- Apply the reviewed table/default privilege fix in staging.
- Verify current table privileges and default ACLs by object owner.
- Exercise role matrix: anonymous, paid student, unpaid student, expired student, assigned teacher, unassigned teacher, active admin, inactive admin.
- Test direct Data API and RPC calls, not just UI visibility.
- Verify Storage object ownership and signed URL expiration.

### Gate 3 — migration rehearsal
- Test clean baseline installation and upgrade from a representative prior schema.
- Test empty academic-subject precondition and idempotent subject/catalogue seed.
- Test written-exam draft migration in correct order.
- Capture before/after schema, migration ledger, row counts and FK integrity.
- Test rollback only where truly reversible; otherwise prepare a forward-fix plan.

### Gate 4 — release decision
- Require P0 browser journeys to pass against staging.
- Require all RLS/RPC/storage role-matrix tests to pass.
- Require no unexplained privilege drift or migration ledger ambiguity.
- Require restore and rollback/forward-fix rehearsal.
- Only then request a separate production release authorization.

## 5. Verification queries — read-only

### Existing table privileges

```sql
SELECT
  count(*) AS public_tables,
  count(*) FILTER (WHERE has_table_privilege('authenticated', c.oid, 'TRUNCATE')) AS authenticated_truncate,
  count(*) FILTER (WHERE has_table_privilege('authenticated', c.oid, 'TRIGGER')) AS authenticated_trigger,
  count(*) FILTER (WHERE has_table_privilege('anon', c.oid, 'TRUNCATE')
                    OR has_table_privilege('anon', c.oid, 'TRIGGER')) AS anon_truncate_or_trigger
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r';
```

### Object owners

```sql
SELECT c.relowner::regrole AS owner_role, count(*) AS public_tables
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
GROUP BY c.relowner::regrole
ORDER BY owner_role;
```

### Default table ACLs

```sql
SELECT d.defaclrole::regrole AS object_owner,
       x.grantee::regrole AS grantee,
       x.privilege_type
FROM pg_default_acl d
CROSS JOIN LATERAL aclexplode(d.defaclacl) x
WHERE d.defaclnamespace = 'public'::regnamespace
  AND d.defaclobjtype = 'r'
  AND x.privilege_type IN ('TRUNCATE', 'TRIGGER')
ORDER BY object_owner, grantee, privilege_type;
```

### Required table presence

```sql
SELECT required.table_name,
       to_regclass('public.' || required.table_name) IS NOT NULL AS exists
FROM (VALUES
  ('academic_subjects'),
  ('virtual_lab_catalog'),
  ('written_exam_drafts'),
  ('student_practice_questions'),
  ('student_practice_attempts'),
  ('lab_notebook_entries'),
  ('lab_notebook_evidence'),
  ('lab_practical_assignments')
) AS required(table_name)
ORDER BY required.table_name;
```

These queries inspect metadata only. Row counts and synthetic fixture checks should be performed separately in the isolated test environment.

## 6. Current disposition

- PR #42 remains open and draft.
- Latest verified code/documentation head at this runbook creation: see the PR for the current SHA; the preceding head's configured CI passed.
- Latest live checks are read-only; no SQL/DDL, Auth settings, Storage settings, migration history or production data were changed.
- Browser E2E remains unexecuted because the BrowserAct CLI could not be installed in the current execution environment; no browser result is claimed.
- Release decision: **NOT READY**.


## 7. Live migration-ledger version check

A fresh read-only migration inventory on 11 November 2026 returned:

| Measure | Primary project | JMT Test |
|---|---:|---:|
| Recorded migration entries | 105 | 255 |
| Latest recorded version | `20261108221907` | `20261111133701` |

Important exact differences:
- Primary has no recorded `database_driven_virtual_lab_catalog` migration; JMT Test records it as version `20261109134826`.
- The branch file is named/versioned `20261110100000_database_driven_virtual_lab_catalog.sql`. A matching migration name under a different version is not evidence that its SQL body is identical.
- JMT Test records three `revoke_client_truncate_and_trigger` entries at versions `20261110171105`, `20261110175009` and `20261110175102`. Primary records none. The branch currently contains a single migration file `20261110263000_revoke_client_truncate_and_trigger.sql`. Do not replay or collapse these entries without comparing their SQL bodies and the resulting ACL state.
- Neither project records `20261111110000_add_written_exam_autosave_recovery`; neither has the `written_exam_drafts` table.
- JMT Test records later feature migrations and additional practice/assignment-history migrations that are not part of the primary ledger.

This confirms that the migration histories differ not only in entry count but also in version ordering and feature coverage. The branch migration directory, primary ledger and JMT Test ledger must be reconciled semantically before a release plan is executable.


## 8. Live SECURITY DEFINER function comparison

The following function definitions were read from both live databases using read-only `pg_get_functiondef` queries. They were not invoked and no records were changed.

| Function | Primary project | JMT Test | Risk / follow-up |
|---|---|---|---|
| `get_public_course_teachers(uuid)` | Public directory function returns assigned teacher/staff IDs and names for published, non-archived courses; does not filter inactive profiles | Same function also requires `profiles.is_active IS TRUE` | P2 privacy/data freshness: reconcile active-profile filtering. Keep public exposure only if intentionally required. |
| `complete_revision_task(uuid)` | Checks signed-in student, task ownership/pending state and active enrollment; does not enforce due time, published course/concept, current paid-through period or evidence for spaced-repetition completion | Also checks due time, published course/concept, active paid-through entitlement and verified concept-linked practice/exam evidence for spaced-repetition completion | P1 behavior/entitlement drift: primary permits completion of an owned pending task after expiry or before scheduled time. It does not expose another student's records, but can corrupt learning/revision state and bypass the stronger test-project rules. |
| `can_staff_access_student(uuid)` | Teacher/staff access predicate includes any manual-payment submission for a course assigned to that teacher | Payment-submission branch additionally restricts to `status = 'pending_review'` | P2 privacy minimization: primary may permit staff visibility to historical payment-submission-linked student records; review every caller and data path. |
| `record_simulation_completion(uuid,text,integer)` | Uses fixed subject-name mapping and course subject arrays/subject mappings | Resolves a published virtual-lab catalogue entry and validates its subject mapping against course-subject rows | Feature/schema drift: primary has no virtual-lab catalogue and uses a legacy RPC contract. Do not expose the catalogue-driven UI/RPC until its schema and data migration are reconciled. |

All inspected definitions pin `search_path` to `pg_catalog, public, pg_temp`. The relevant functions are SECURITY DEFINER and have authenticated execution warnings from the Supabase advisor; this is not automatically a vulnerability because some are intentional guarded RPCs. Continue to review their EXECUTE grants, identity/role/ownership checks and intended exposure individually.

**Priority order:** reconcile `complete_revision_task` semantics first; then staff payment-visibility minimization; then public teacher active-state filtering; finally align the legacy and catalogue-driven virtual-lab contracts. Implement only through reviewed migrations after staging tests. Do not patch live function definitions directly.


## 9. Re-probed live schema and ledger comparison — 11 November 2026

A further read-only Supabase MCP inventory was taken after the prior section. Project identities were confirmed from the connected project list:
- Primary project: `jpoxrxjixkcgjqvyyznw` (ACTIVE_HEALTHY, ap-southeast-2).
- JMT Test: `cullxqklmbdiosibgois` (ACTIVE_HEALTHY, ap-south-1).

### Current public schema inventory

| Measure | Primary project | JMT Test |
|---|---:|---:|
| Public tables | 49 | 57 |
| Recorded migration entries | 105 | 255 |
| Profiles | 3 | 3 |
| Courses | 0 | 3 |
| Academic subjects | 0 | 8 |
| Enrollments | 0 | 0 |
| Lessons | 0 | 0 |

All 49 primary public tables and all 57 JMT Test public tables returned RLS enabled in the compact table inventory. This is not proof that every policy is correct or that grants are minimal.

The eight tables present in JMT Test but absent from Primary are:

1. `student_practice_questions`
2. `student_practice_attempts`
3. `virtual_lab_catalog`
4. `lab_notebook_entries`
5. `lab_practical_assignments`
6. `lab_notebook_evidence`
7. `lab_notebook_review_history`
8. `assignment_submission_versions`

No public table was found in Primary that was absent from JMT Test in this inventory.

### Migration-ledger semantic mismatch

The latest recorded versions remain `20261108221907` in Primary and `20261111133701` in JMT Test. Exact (version, name) pairs shared by both ledgers: **0**. There are 88 Primary entries whose migration names also appear somewhere in JMT Test, but their version/name pairs differ; the remaining entries include project-specific and differently named migrations.

This is a stronger warning than a simple 105-versus-255 count. It means neither a blind replay of JMT Test migrations nor a simple version-number merge is safe. For each candidate migration, compare:
- exact SQL body and checksum;
- objects/columns/functions/policies/triggers/ACLs created or changed;
- prerequisites and dependency order;
- whether the live schema already contains the effect;
- whether the migration is reversible or requires a forward fix;
- data backfill and idempotency behavior.

The current public catalogue result of 0 courses is consistent with Primary having 0 rows in both `courses` and `academic_subjects`. Do not copy the three JMT Test courses or eight test subjects to Primary; those are test records and not approved production curriculum/catalogue content.

### Consequence and safe next action

**Release remains NOT READY.** The immediate engineering task is to create a migration-by-migration reconciliation matrix and compare the eight missing table definitions plus their dependencies against the branch. Then provision or designate an approved isolated staging environment, subject to cost approval, and rehearse only the semantically selected migration set there.

This inventory was read-only. No migration was applied, no SQL/DDL was executed, no Auth/Storage configuration was changed, and no production data was inserted, updated or deleted.


## 10. Virtual-lab subject seed correction prepared on PR branch

The earlier section 3.A identified a real empty-database defect: the Learning OS foundation only creates academic subjects by deriving them from existing course subject arrays. Primary currently has no courses and no academic-subject rows. The original virtual-lab catalogue migration then attempted to insert catalogue rows using fixed UUIDs, which would violate the subject foreign key on a fresh/empty primary schema.

**Correction committed on PR #42:**
- Migration: `supabase/migrations/20261110100000_database_driven_virtual_lab_catalog.sql`
- Commit: `df53d8a5f524707aeb84ac215cb94e536c01a0c4`
- Test: `tests/virtual-lab-catalog-subject-seed.test.mjs`
- Test commit: `9499dc448e9b1e6d34f3d0770da016f775b1374e`

The migration now:
1. Inserts the five required canonical subject slugs (physics, chemistry, biology, mathematics, ict) with `ON CONFLICT (slug) DO NOTHING`.
2. Resolves subject foreign keys by joining the stable slug, rather than assuming UUIDs generated in another environment.
3. Preserves existing subject IDs and any existing course-subject relationships.
4. Keeps the catalogue upsert idempotent by `lab_key`.

This makes the catalogue seed independent of pre-existing course rows and environment-specific subject UUIDs. It does **not** prove that the migration runs successfully on either live database. The static Node test only guards the migration source contract; a disposable PostgreSQL integration test must still verify clean install, rerun behavior, existing-subject preservation, FK validity and catalogue row count.

**Status:** code correction committed on the unmerged PR branch; CI run `43074650506` was queued/in progress at the time of this note. No live database was modified and no migration was applied. This resolves the identified source-level seed precondition, not the broader migration-ledger, schema-parity or release blockers.


### Seed rerun safety refinement

A follow-up review found that the first subject-seed correction still updated catalogue title, explanatory text, publication state and sort order on a `lab_key` conflict. That could overwrite teacher/admin editorial changes if the seed were replayed in a rehearsal or recovery workflow.

The PR migration now updates only the resolved `subject_id` and `updated_at` on conflict. It does not overwrite `is_published`, title, summary, principle, simulation type or sort order. The static guardrail test now asserts this editorial-state preservation rule.

- Migration refinement commit: `40fa8635e9295bc9543cc9f986fbf8cd26b0500d`
- Test refinement commit: `fce4adc79e43012ec704de42f2a94376a29037e4`
- Current PR CI run: `43074970623` (in progress at documentation time).

This remains source-level protection until PostgreSQL integration tests verify both first application and repeated execution against a disposable database.


## 11. Fresh Supabase security-advisor comparison — 11 November 2026

Read-only Supabase security advisor results were refreshed for both projects at approximately 18:09 UTC.

| Advisor finding | Primary | JMT Test | Interpretation |
|---|---:|---:|---|
| RLS enabled with no policies | 2 | 2 | Both are `app_rate_limit_events` and `auth_rate_limit_events`; likely intentional server-only tables, but confirm they are not expected to be client-accessible. |
| Anon can execute SECURITY DEFINER RPC | 1 | 1 | `get_public_course_teachers(uuid)`; public exposure may be intentional, but review returned fields, inactive-profile filtering and course publication checks. |
| Authenticated can execute SECURITY DEFINER RPC | 18 | 23 | Advisor warns on all exposed SECURITY DEFINER RPCs, including intended guarded operations. Review function-by-function; warning count alone is not a vulnerability count. |
| Leaked-password protection disabled | 1 | 1 | Both Auth projects have compromised-password checking disabled; enablement requires an authorized Auth configuration change and should be tested before rollout. |

### Immediate review priorities

1. Inspect `get_public_course_teachers(uuid)` anon contract and confirm only public teacher fields for published courses are returned; align active-profile filtering.
2. Review every SECURITY DEFINER RPC for explicit caller identity, role, ownership, paid-entitlement, input validation, pinned search_path, and minimal EXECUTE grants. Keep intentional authenticated RPCs only when their own guards are proven.
3. Confirm the two no-policy rate-limit tables are server-only and cannot be reached through exposed RPCs or other privileged paths.
4. Plan leaked-password protection as a separate Auth configuration change with user-impact assessment; do not toggle it during this read-only audit.

**Important:** These advisor findings are triage signals, not proof of exploitability. No function was invoked, no grant was changed, no Auth setting was modified, and no data was changed.


### Follow-up finding: virtual-lab migration now handles an empty subject catalogue

The PR branch migration `20261110100000_database_driven_virtual_lab_catalog.sql` originally depended on pre-existing academic-subject UUIDs. The primary project currently has zero subject rows, so that seed could not reliably create the virtual-lab catalogue.

The branch migration has now been amended to:
- insert canonical Physics, Chemistry, Biology, Mathematics and ICT subject slugs before catalogue rows;
- use `ON CONFLICT (slug) DO NOTHING` so existing subjects and their IDs are preserved;
- resolve catalogue foreign keys by stable slug rather than cross-environment UUID literals;
- preserve existing editorial fields when the catalogue seed is rerun, updating only the subject link and timestamp.

Read-only schema inspection confirmed that **both Primary and JMT Test** have the required unique constraint `academic_subjects_slug_key UNIQUE (slug)`, and the `academic_subjects` columns include `id` (generated UUID), `name`, `slug`, `description` (default empty string) and `created_at`. JMT Test already contains the five canonical slugs; Primary currently has zero subject rows. JMT Test also has 24 course-subject links, so preserving existing subject IDs is important.

A new source-level test `tests/virtual-lab-catalog-subject-seed.test.mjs` checks seed ordering, canonical slugs, slug-based foreign-key resolution, idempotency and preservation of editorial fields. The current-head CI run has passed guardrail tests, ESLint and TypeScript; production build and dependency audit were still running at the time of this update.

**Limit:** no SQL was executed against either Supabase project and no migration was applied. The test is a static source test, not a database integration test. The migration still needs a disposable empty-database rehearsal and a populated-database rehearsal before any release.


## 10. Supabase Security Advisor recheck — 11 November 2026

Security Advisor was queried read-only on both connected projects.

### Findings common to Primary and JMT Test

- Two rate-limit event tables have RLS enabled with no policies: `public.app_rate_limit_events` and `public.auth_rate_limit_events`. This commonly means client roles cannot read/write those tables through RLS, which may be intentional for server-only telemetry. Verify grants and service-role/server access before adding any policy; do not add broad policies just to silence the advisor.
- `public.get_public_course_teachers(uuid)` is callable by `anon` and is SECURITY DEFINER. This may be intentional for public course pages, but the function must expose only approved public teacher fields, filter inactive profiles, and constrain course visibility. The earlier function-definition comparison found Primary does not filter inactive profiles while JMT Test does. Treat this as a concrete P1 public-data minimization/function-drift issue, not merely a generic advisor warning.
- Authenticated execution of SECURITY DEFINER functions is flagged by the advisor (18 functions in Primary, 23 in JMT Test). This is not automatically a vulnerability: several functions are designed as guarded RPC entry points. For every function, review EXECUTE grants, auth/role/ownership/entitlement checks, search_path, returned columns and mutation boundaries. Do not blanket-revoke authenticated execution without checking application dependencies.

### Auth configuration

- Both projects report Supabase Auth leaked-password protection disabled. Enablement is recommended for account security, but it is an Auth configuration change and was not made during this read-only audit. Schedule a controlled configuration change with product-owner approval and test password signup/reset flows afterward.

### Severity and action

1. **P1:** Align `get_public_course_teachers` with the active-profile filter and confirm published-course scope.
2. **P1:** Review all SECURITY DEFINER functions by intended caller and prove each grant/guard pair. Start with payment approval/rejection, account activation, staff analytics, revision completion and student answer submission.
3. **P2:** Confirm rate-limit tables are intentionally server-only and that no client-facing operation is broken.
4. **P2:** Enable leaked-password protection after an approved auth-configuration window and verify recovery/signup flows.

No advisor remediation, grant change, function replacement or Auth setting change was performed.
