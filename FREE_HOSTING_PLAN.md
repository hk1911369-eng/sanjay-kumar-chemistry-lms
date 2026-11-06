# Hosting and cost review — checked 7 November 2026

This LMS sells one-time courses, so the host must permit commercial use and support Next.js SSR, App Router, Server Actions, Route Handlers, cookies and middleware. A static export is not acceptable.

| Provider | Service | Free allowance / entry cost | Commercial use | Important limits / billing | Payment method / inactivity | Assessment |
|---|---|---:|---|---|---|---|
| Netlify | Free hosting + Next.js OpenNext adapter | $0, 300 usage credits/month | Netlify's published Free-plan announcement explicitly permits commercial projects | Monthly credit limit; sites can pause at the limit. No SLA on the free tier; Netlify reserves discretion to disable free-tier projects. | No auto-recharge on Free; payment-method requirements should be confirmed in the account dashboard. | Best first deployment candidate: official docs say App Router, SSR, Server Actions, middleware and Route Handlers are supported. |
| Supabase | Free Postgres, Auth, API and Storage | $0; 2 active projects; 500 MB database; 50,000 MAU; 5 GB egress; 1 GB file storage | Suitable for starting a commercial app subject to its current terms and quotas | Free projects can pause after a week of low activity; no production SLA. Pro starts at $25/month for a project. | A payment method may be needed if upgrading; free inactivity pause is documented. | Suitable for pilot/testing, but owner must accept pause risk and manage backups. |
| Cloudflare | Workers Free | 100,000 requests/day; 10 ms CPU per invocation | The reviewed pricing page lists limits, but commercial permission should be confirmed against the account's current terms before selection. | 10 ms CPU time on Free can be restrictive for SSR. Paid Workers starts at $5/month. Cloudflare recommends vinext for new apps; OpenNext remains the existing-app adapter and lists SSR, Server Actions, middleware and Route Handlers as supported. | Confirm billing setup with Cloudflare; usage beyond free limits may require paid plan. | Technically possible, but not selected for this Next.js 15 app without runtime testing. |
| Vercel | Hobby | $0 | **Not permitted** for this course-selling business; Hobby is personal/non-commercial only. | Pro is a paid commercial tier; usage overages may apply. | Payment method required for paid tier. | Do not use Hobby for this LMS. |

## Recommended low-cost path

- Start with Netlify Free for the Next.js application, subject to the current Free plan terms and monthly credits.
- Start with Supabase Free for a limited pilot, while understanding that a low-activity project may pause after 7 days.
- If the LMS becomes business-critical, budget for Supabase Pro (currently from $25/month) and a suitable paid hosting plan if the Netlify credit limit is exceeded.
- Keep a backup/export process for the database and do not treat any free tier as a permanent availability guarantee.

## Official references

- Netlify Next.js support: https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
- Netlify Free plan pricing: https://www.netlify.com/pricing/
- Netlify Free plan announcement (commercial projects): https://www.netlify.com/blog/introducing-netlify-free-plan/
- Supabase pricing: https://supabase.com/pricing
- Supabase free project pausing: https://supabase.com/docs/guides/platform/free-project-pausing
- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare OpenNext adapter: https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/
- Vercel Hobby terms: https://vercel.com/legal/terms

Prices and quotas can change. Check the provider dashboard and current terms before connecting billing or deploying.
