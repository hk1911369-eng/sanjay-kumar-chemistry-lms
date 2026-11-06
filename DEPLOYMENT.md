# Production deployment guide (owner account required)

## Selected candidate: Netlify Free + Supabase

Netlify's current Next.js documentation lists App Router, SSR, Server Actions, Route Handlers and middleware support through its OpenNext adapter. Its Free plan is published as allowing commercial projects, but it has a 300-credit monthly allowance and projects may pause at the limit. See `FREE_HOSTING_PLAN.md` and check the dashboard before launch.

## Owner actions

1. Create or select the owner's Supabase project.
2. In Supabase SQL Editor, apply migrations `0001` through `0007` in order only after reviewing the existing schema and migration history. Use a separate test project first.
3. In Supabase Auth, enable email/password, configure SMTP/email templates, set the Site URL to the Netlify production origin and allow the exact `/auth/confirm` redirect URL.
4. Create the owner's account through public registration, confirm its email, then promote that account to Admin using `ADMIN_PROVISIONING.md` in the Supabase SQL Editor.
5. Create Teacher accounts through normal registration and trusted role provisioning; assign each Teacher to courses from the Admin dashboard.
6. Create a private GitHub repository for the source and connect it to Netlify through the official account authorization flow. Do not publish private lesson content or secrets.
7. Configure these Netlify environment variables in the site dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `APP_URL` (the actual HTTPS Netlify site origin)
8. Build command: `npm run build`. Node: 22. Netlify's Next.js adapter should auto-detect the framework; do not use static export.
9. Deploy, then test registration, confirmation, login, password reset, Student/Teacher/Admin isolation, course publication, manual payment submission, Admin verification/approval/rejection, lesson access and language switching.
10. Only after independently verifying each wallet account, enter the receiving number and enable bKash/Nagad/Rocket in Admin settings.

## Never send credentials in chat

Do not paste passwords, OTPs, service-role keys, private keys or merchant secrets here. Enter Supabase and hosting values only in the corresponding provider dashboard. The current application needs only the public Supabase URL and anon/publishable key at runtime; never expose a service-role key to browser code.

## Not completed by this archive preparation

No Supabase project was connected, no migration was applied, no GitHub repository was created, no Netlify deployment was performed, no payment method was enabled and no public URL was verified. Do not treat a local ZIP as a live website.
