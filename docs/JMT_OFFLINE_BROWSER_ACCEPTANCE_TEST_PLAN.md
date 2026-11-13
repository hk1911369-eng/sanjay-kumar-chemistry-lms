# JMT Offline Learning — Browser Acceptance Test Plan

Status: **planned; execution evidence not yet recorded**
Scope: text-only lesson packages, account-scoped encrypted IndexedDB vault, offline library, and generic PWA shell.

This checklist is an acceptance gate, not a claim that the scenarios have passed. Record browser/device, OS, build SHA, test account, date, result, and evidence for every executed case. Use synthetic student accounts and non-sensitive lesson content.

## Test setup

- Deploy the candidate build only to an approved non-production environment.
- Use two synthetic student accounts (A and B), one admin, and one teacher/staff account.
- Prepare a published course and lesson with offline permission enabled; a second lesson with the flag false; an unpublished lesson; and an account with expired or unpaid entitlement.
- Confirm the test environment has the required migration applied.
- Use current Chrome/Android and at least one desktop browser with IndexedDB and Web Crypto support.
- Capture the exact application commit SHA and browser versions. Do not use real student records.

## Acceptance matrix

| ID | Scenario | Expected result |
|---|---|---|
| OFF-BR-01 | Account A downloads an eligible published lesson while online | Package is fetched over authenticated same-origin request, integrity-verified, encrypted, and listed only for A |
| OFF-BR-02 | Student requests a lesson with offline permission disabled | Server denies package; no vault record or download job is created |
| OFF-BR-03 | Student requests unpublished lesson or lesson in unpublished/archived course | Generic unavailable response; no lesson-existence disclosure |
| OFF-BR-04 | Unpaid, inactive, or expired student entitlement requests a package | Server denies package; no content is persisted |
| OFF-BR-05 | Teacher/staff attempts to enable offline permission through a crafted request | Server-side role guard prevents changing the permission |
| OFF-BR-06 | Account A signs out, then B signs in on the same device | A's metadata/content is not shown to B; account cleanup is best-effort and account scoped |
| OFF-BR-07 | Switch accounts while library metadata is loading | Stale A results are discarded; only current account metadata may render |
| OFF-BR-08 | Switch accounts while a lesson is decrypting | Lesson content is not rendered after the current session no longer matches the initiating account |
| OFF-BR-09 | Open a saved lesson with network disabled and valid lease | Correct account can decrypt and display verified text content |
| OFF-BR-10 | Open with missing key, missing chunk, altered ciphertext, or altered manifest | Content is not displayed; a specific recoverable error is shown |
| OFF-BR-11 | Open after offline lease or paid entitlement expiry | Content remains inaccessible; reconnect is required to refresh entitlement |
| OFF-BR-12 | Change device clock backwards | Documented limitation is observed; client clock is not treated as tamper-proof authorization |
| OFF-BR-13 | Browser denies IndexedDB, CryptoKey structured cloning, or storage writes | Download fails safely; online learning remains usable and no false completed state is shown |
| OFF-BR-14 | Storage quota is exhausted during package persistence | No successful completion is reported; partial package data is cleaned up or detected as incomplete |
| OFF-BR-15 | Network drops during package transfer | Download does not become complete; user can retry online. Transfer is not currently resumable |
| OFF-BR-16 | Browser reloads after successful download | Encrypted package and metadata remain available to the same account |
| OFF-BR-17 | Remove one saved lesson | Only that lesson's metadata and encrypted chunks are removed |
| OFF-BR-18 | Install/update service worker while online, then navigate offline | Generic offline route and required immutable Next assets load; no authenticated HTML is replayed |
| OFF-BR-19 | API, private storage, payment, assessment submission, or student work requests occur | Service worker does not cache or intercept private API/storage data |
| OFF-BR-20 | Static asset or offline route redirects to login or another path | Redirected content is not cached as the offline route or a Next static asset |
| OFF-BR-21 | Cache Storage quota failure during runtime static asset caching | Network response remains usable; caching failure does not break the online page |
| OFF-BR-22 | HTTP 5xx occurs during navigation | Server error is returned; it is not disguised as an offline state |
| OFF-BR-23 | Browser is offline before first successful service-worker installation | No offline shell is promised; online connection is required for initial installation |
| OFF-BR-24 | Logout while storage cleanup is unavailable | User can still complete sign-out; cleanup failure is not treated as a successful deletion guarantee |

## Required evidence

For each case, attach:
- Pass / fail / blocked result and short reproduction steps.
- Browser console and network evidence with tokens, cookies, signed URLs, and personal data redacted.
- IndexedDB inspection confirming lesson bytes are ciphertext at rest; never export real student content.
- Cache Storage inspection confirming only the generic offline shell and immutable same-origin Next assets are cached.
- Relevant server response status and audit evidence for authorization denials.

## Release blockers

Do not declare offline learning production-ready until:
1. All applicable OFF-BR cases pass on the exact release candidate SHA.
2. CI, TypeScript, lint, and production build pass on the exact PR heads.
3. Account-switch, entitlement expiry, and storage failure cases are exercised on real browsers/devices.
4. Security review confirms no private lesson bytes, signed URLs, API responses, tokens, assessment data, or student submissions enter Cache Storage.
5. Support and recovery instructions exist for lost device keys and expired offline leases.

## Known limitations (must remain visible)

- The current package supports text lesson content only, with a 1 MiB lesson-content ceiling.
- Network transfer is not streamed or resumable.
- Offline access cannot be revoked immediately while a device remains disconnected.
- A browser/device owner can manipulate local storage and the device clock; local expiry is not a tamper-proof clock.
- AES-GCM protects saved bytes at rest, but cannot protect plaintext from active same-origin XSS or a compromised browser session.
- SHA-256 detects corruption only when compared to the supplied manifest; without a server signature it does not prove manifest authenticity.
- Lost IndexedDB CryptoKeys may make saved packages permanently unreadable.
- The PWA shell does not cache authenticated pages, API data, lesson content, or media.

These limitations must not be described as solved by the current implementation.