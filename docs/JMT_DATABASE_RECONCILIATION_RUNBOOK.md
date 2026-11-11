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
