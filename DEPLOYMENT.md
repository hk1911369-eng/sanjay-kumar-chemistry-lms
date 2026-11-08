# JMT Academy — Render deployment

## Current production service

- Provider: Render Web Service
- Service: `sanjay-kumar-chemistry-lms`
- Repository: `hk1911369-eng/sanjay-kumar-chemistry-lms`
- Branch: `main`
- Region: Singapore
- Runtime: Node.js 22
- Build: `npm ci && npm run build`
- Start: `npm start`
- Health endpoint: `/api/health`
- Production URL: https://sanjay-kumar-chemistry-lms.onrender.com

The checked-in `render.yaml` is the desired Blueprint configuration. It names the existing service so Render can associate it during Blueprint setup/sync. Review the diff in Render before confirming any Blueprint sync; do not create a duplicate production service.

## Environment variable names

Set values only in the Render dashboard or secure provider interface. Never commit or paste values into GitHub or chat.

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `APP_URL`
- `NEXT_PUBLIC_SITE_URL`

Optional server-side rate limiting:
- `SUPABASE_SERVICE_ROLE_KEY`

Use the production Supabase project for the production service. A separate staging service must use the test Supabase project and its own environment variables; never point staging at production.

## CI and deployment

The GitHub Actions workflow runs dependency installation, ESLint, guardrail tests, TypeScript, production build and dependency audit. Configure Render's auto-deploy trigger to deploy only after checks pass when syncing the Blueprint. Confirm the CI status is green before promoting a commit.

## Database migrations

1. Review each migration and its rollback implications.
2. Apply it to the test Supabase project first.
3. Verify the schema, policies and required RPCs.
4. Apply the same migration to production only after validation and an approved release.
5. Confirm the migration history and application health after deployment.

Never run `supabase db reset` against production. Never apply a demo purge as a migration.

## Rollback

1. Open the Render service dashboard.
2. Open Events / Deploys and select the last known-good deployment.
3. Use Render's rollback action to restore that deployment.
4. Verify `/api/health`, public pages and sign-in.
5. If a database migration caused the issue, use a forward corrective migration. Do not drop columns or restore a database backup unless the data-loss implications have been reviewed.

## Staging

A separate Render staging service definition is prepared in `render.yaml`, but the service has **not** been provisioned. It uses the audit/staging branch and requires its own environment values.

Before any Blueprint sync:
1. Obtain the test Supabase project's URL, anon key and (if needed) service-role key.
2. Enter them directly in Render's secure environment-variable interface; never commit them.
3. Confirm the staging service uses only the test Supabase project.
4. Obtain explicit approval before syncing the Blueprint or creating the Render service.

Do not sync the Blueprint while the staging environment variables are blank. Never point staging at production.

## Database backup and restore

Use the scripts in `scripts/` only with an explicitly selected non-production/test database unless a production backup has been specifically approved. They require a connection URL supplied through the environment, use restrictive file permissions, and never print credentials.

A restore must require an explicit confirmation string and must refuse a production target. Do not use `supabase db reset` or any seed/purge script against production.
