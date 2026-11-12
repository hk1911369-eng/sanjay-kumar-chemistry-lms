# JMT Learning OS — Offline, Media and AI Technical Architecture

**Status:** Architecture proposal; no schema or production changes are applied by this document.  
**Parent scope:** `docs/JMT_EXPANDED_LEARNING_PLATFORM_SCOPE.md`  
**Design target:** Next.js application, Supabase Auth/Postgres/Storage, mobile-first browser/PWA, Bangladesh mobile-network conditions.

## 1. Architectural decisions

1. Keep the server authoritative for identity, roles, payment, enrolment, deadlines, grading, publication, entitlements and final submissions.
2. Treat the browser as an intermittently connected client with a local content cache and a durable mutation outbox.
3. Separate public application-shell caching from private learner content. Never put authenticated API responses, access tokens, payment records or private student submissions in a generic service-worker cache.
4. Make every offline mutation idempotent and version-aware. A retry must not create a duplicate grade, attempt, event or submission.
5. Make media rights and offline permission explicit metadata. A playable URL is not permission to download.
6. Keep AI model credentials and authoritative retrieval on the server. The browser never receives provider secrets.
7. Build shared content identity/versioning first so lessons, videos, labs, tutor citations and offline packages refer to the same academic concepts.

## 2. System context

```text
Student PWA / browser
  ├── App shell + route assets (service worker)
  ├── Local content vault (IndexedDB, encrypted records)
  ├── Download manager (manifest + checksums + quota)
  ├── Mutation outbox (idempotency key + base version)
  ├── Sync coordinator (retry + conflict UI)
  ├── Video player (streaming or explicitly licensed offline file)
  └── AI Tutor UI (online requests; queued question draft only when offline)
             │
             ▼
Next.js server actions / route handlers
  ├── Auth/session verification
  ├── Entitlement and role checks
  ├── Content manifest and signed download issuance
  ├── Sync ingestion and conflict responses
  ├── Video metadata/progress
  └── AI orchestration, retrieval, quotas and safety
             │
             ▼
Supabase Postgres + private Storage + approved AI provider
  ├── Content/version registry
  ├── Entitlements and RLS
  ├── Idempotent learning event ledger
  ├── Video catalogue/progress
  ├── Tutor threads/messages/source references
  └── Audit, rate limits and operational telemetry
```

## 3. Offline application shell

### Cache classes

| Data | Storage | Policy |
|---|---|---|
| Versioned JS/CSS/fonts/icons and offline fallback page | Service-worker Cache Storage | Cache-first with content-hash filenames; remove old build caches on activation |
| Public course catalogue metadata | Cache Storage or IndexedDB | Network-first; bounded stale fallback, clearly labelled |
| Authenticated lesson/notes content | Encrypted IndexedDB records | Explicit download; user/account scoped; content version and expiry |
| Private media file | Encrypted IndexedDB/approved offline-media mechanism | Only where rights and browser/provider support allow |
| Access/refresh tokens, payment state, admin pages, exam answer keys | No offline cache | Network-only; never cache |
| Final assessment submission, payment, role changes, grades | Server only | No offline success state |

The service worker should precache only the minimal app shell, static assets and offline fallback. Use explicit route allowlists. Never use a broad cache-all navigation or API strategy.

### App lifecycle

- On install/update, download the new shell and activate only after the new cache is complete.
- Do not delete a learner's locally saved work merely because the app shell version changes.
- Keep content package schema version separate from app build version; provide migrations for IndexedDB records.
- If a local schema migration fails, preserve the old database and show a recoverable error rather than deleting it.
- On logout/account switch, lock and remove the previous account's private local data according to the retention policy.
- On account disablement or entitlement expiry, block new downloads and require online revalidation before protected content is opened. Offline access has a documented maximum lease; never imply indefinite access.

## 4. Local data model

Use IndexedDB, not localStorage, for durable content and queues. Suggested object stores:

| Store | Key | Important fields |
|---|---|---|
| `content_packages` | `user_id:resource_id:version` | resource type, version, hash, size, rights, expires_at, downloaded_at |
| `content_chunks` | `package_key:chunk_id` | encrypted payload, nonce, content type |
| `download_jobs` | `job_id` | resource, state, bytes, retry count, last error |
| `outbox` | `mutation_id` | user, entity, operation, base_version, payload, local sequence, created_at, state |
| `sync_cursors` | `user_id:stream` | last acknowledged server sequence |
| `local_preferences` | `user_id:key` | non-sensitive preferences only |
| `crypto_metadata` | `user_id` | non-extractable CryptoKey reference, key version |

### Local encryption and threat boundary

- Encrypt private cached content and queued answer payloads with Web Crypto AES-GCM; use a fresh random 96-bit nonce per encryption.
- Store a non-extractable key reference in IndexedDB and bind encrypted records to user/resource/version as authenticated additional data.
- Do not claim this defeats active same-origin script compromise: an XSS payload can invoke the app's decryption key. Enforce a strict Content Security Policy, minimise third-party scripts, validate rich content and protect session handling.
- Never place credentials, service-role keys, AI provider keys or payment secrets in browser storage.
- Provide a clear "remove offline data" control and account-switch cleanup.

## 5. Content package and download protocol

A server-generated manifest should describe exactly what a user may download:

```json
{
  "manifest_version": 1,
  "resource_id": "stable-content-id",
  "resource_version": 7,
  "resource_type": "lesson",
  "entitlement": "course-enrolment",
  "offline_allowed": true,
  "offline_expires_at": "server-issued timestamp",
  "total_bytes": 123456,
  "sha256": "hex digest",
  "chunks": [
    {"id": "part-1", "size": 123456, "sha256": "hex digest"}
  ]
}
```

The values above are illustrative, not production IDs or credentials.

Download sequence:
1. Authenticate online and request a manifest for a resource.
2. Server checks active profile, course publication, enrolment/payment, role, content status, licence and offline policy.
3. Server issues short-lived, resource-scoped download access.
4. Client downloads to a temporary record, verifies byte count and SHA-256, then atomically marks the package complete.
5. Client stores version, expiry, rights and server signature/manifest evidence.
6. Before opening protected content, apply the documented offline lease policy; refresh when online.
7. On changed content, retain or replace the old package according to the content migration policy. Never silently mix chunks from two versions.

Downloads must support pause/retry, storage quota checks, cancellation and cleanup of incomplete chunks. Avoid starting large downloads automatically on mobile data; expose size and network choice.

## 6. Synchronisation contract

### Mutation envelope

Every queued mutation should include:

- `mutation_id`: client-generated UUID, unique per logical operation.
- `entity_type` and `entity_id`: allowlisted resource.
- `operation`: allowlisted command, not arbitrary SQL or table/column names.
- `base_version`: server version the client last observed.
- `local_sequence`: monotonically increasing within the device/user stream.
- `client_created_at`: diagnostic only; never authoritative for deadlines.
- `payload_schema_version` and validated payload.
- authenticated user derived from the server session; never trust a client-supplied user ID.

### Server processing

1. Authenticate the session and verify the active profile.
2. Enforce per-user/device rate and payload-size limits.
3. Validate operation schema and current role/entitlement/course/exam rules.
4. Insert the idempotency record under a unique constraint such as `(actor_id, mutation_id)`.
5. If the key already exists, return the original result without repeating side effects.
6. Compare `base_version` with the current server version.
7. Apply safe operations transactionally; return an explicit conflict for stale edits.
8. Append an immutable acknowledgement/result and return the new server version.
9. Client removes an outbox item only after receiving and persisting an acknowledgement.

### Conflict policy

| Operation | Policy |
|---|---|
| Read-only lesson progress heartbeat | Merge monotonic progress fields; deduplicate by mutation ID |
| Bookmark toggle | Prefer explicit set/unset command, not blind toggle |
| Student notes/drafts | Version check; show conflict and allow compare/merge |
| Practice attempt | Append-only attempt; server validates eligibility and deduplicates |
| Written-exam draft | Optimistic version check; final submission remains online-only |
| Attendance, grades, payment, role, enrolment | Never accept client-authoritative offline mutation |
| Final exam submission | Online-only; server receipt is the only success confirmation |

No silent last-write-wins for assessed student work. Device clocks are not trusted for exam timing, expiry or billing periods.

### Retry and observability

- Retry transient failures with exponential backoff and jitter; stop retrying permanent validation/permission errors.
- Preserve failed items with a human-readable reason and a safe retry path.
- Show queued, syncing, synced, conflict and action-required states.
- Record sync latency, duplicate rate, conflict rate, queue age, rejected operations and payload-size distribution without logging answer contents or secrets.

## 7. Video Library and media delivery

### Proposed server entities

- `learning_videos`: stable ID, title, description, language, duration, poster, source/provider asset ID, publication state, rights metadata, offline policy, content version.
- `video_playlist`: owner/visibility, title, course/subject/chapter mapping, publication state.
- `video_playlist_items`: ordered video references, optional section/title and required/optional marker.
- `video_progress`: user/video, position, duration, completed threshold, last updated, version.
- `video_bookmarks`: user/video/timecode/note.
- Optional `media_processing_jobs`: upload, transcode, caption, thumbnail and failure states.

These are design names, not existing live tables. Reuse current course, chapter, lesson and concept IDs rather than creating duplicate academic hierarchies.

### Delivery rules

- Prefer adaptive streaming (HLS/DASH) from a managed media provider/CDN for online playback.
- Keep provider origin credentials and upload secrets server-side.
- Use short-lived signed playback access for protected media; do not treat an unguessable URL as authorisation.
- Store captions/transcripts with language and review status; support keyboard controls and accessible captions.
- Persist watch position at sensible intervals and on pause/visibility change; rate-limit writes.
- A completion threshold is a UX progress indicator only. It is not mastery evidence.
- Offline video is opt-in per asset and requires explicit rights, entitlement and device policy. Some DRM/provider/browser combinations do not permit browser-based offline playback; in that case show streaming-only clearly rather than bypassing DRM.
- Avoid transcoding/upload infrastructure spend until a provider and cost model are selected through an engineering review.

## 8. AI Tutor architecture beside Virtual Labs

### Request pipeline

1. Verify authenticated active student and course access.
2. Apply per-user quotas, rate limits, input size limits and abuse controls.
3. Resolve the student's active course, language and allowed content scope.
4. Retrieve only approved, published and entitled lesson/textbook/video transcript/lab material.
5. Treat retrieved documents as untrusted data, not system instructions; resist prompt injection.
6. Generate an answer with source IDs, source versions and quoted spans.
7. Validate that each citation resolves to a retrieved source; omit unsupported citations.
8. Return uncertainty and ask for clarification or escalate where evidence is weak.
9. Persist minimal conversation metadata and retention controls; do not log sensitive prompts by default.
10. Record provider, model version, latency, token/cost bucket and safety outcome for operations without exposing provider secrets.

### Academic behaviour

- Default to hints and guided reasoning before a full solution when the learner is practising.
- Offer a complete worked explanation when appropriate, with units, assumptions and intermediate steps.
- For chemistry, physics and mathematics, validate notation, dimensional consistency, significant figures and calculations where possible.
- Never fabricate textbook page numbers, quotations, curriculum claims or teacher instructions.
- Separate retrieved source facts from model-generated explanation.
- AI-generated quizzes/notes/lessons are drafts until reviewed and published by an authorised teacher.
- Lab safety instructions are grounded in approved lab content; do not improvise hazardous procedures.
- Offline mode may expose downloaded reference notes and save a doubt draft, but must not claim live AI inference when the model service is unreachable.

### Evaluation gates

Maintain a versioned benchmark with:
- Bangla and English questions across chemistry, physics and mathematics.
- Textbook-grounded questions with known source spans.
- Misconception diagnosis and hints-first scoring.
- Calculation/unit correctness and equation rendering.
- Unanswerable and out-of-syllabus questions.
- Prompt-injection documents and malicious user prompts.
- Cross-student data isolation and entitlement bypass attempts.
- Citation precision/recall, unsupported-claim rate, latency and cost per successful session.

Teacher review is required before using real student conversations as training/evaluation material; default to synthetic or explicitly consented, minimised data.

## 9. Proposed backend contract and migration sequence

Do not create all tables in one large migration. Suggested slices:

1. **Content identity:** stable content/resource IDs, version and publication metadata; map existing lessons/chapters/concepts without duplicating them.
2. **Offline manifest:** server-side manifest query/RPC, entitlement checks, rights and expiry metadata.
3. **Sync ledger:** idempotency table, allowlisted mutation RPCs, per-entity version checks and audit events.
4. **Client storage:** service worker shell, IndexedDB schema, encryption, migration and account cleanup.
5. **Video catalogue:** metadata, playlists, RLS, storage bucket policies and admin workflow.
6. **Video progress:** privacy-scoped progress/bookmarks and playback integration.
7. **AI tutor:** server-only provider adapter, retrieval index, conversation/source tables, quota controls and evaluation harness.
8. **Integration:** video/AI/lab/lesson deep links and learning event semantics.

Each migration must be checked against Primary and Test histories independently. Use a disposable PostgreSQL environment for clean install and upgrade rehearsals. Do not replay the Test ledger into Primary or mark migrations applied without proving equivalent schema and data state.

### RLS and access principles

- Public catalogue reads may expose only published, public metadata.
- Private lesson/media manifests require active user and current entitlement.
- Students can read/write only their own progress, bookmarks, tutor threads and draft data.
- Teachers can manage only assigned courses and authorised content; publication actions require explicit role checks and audit.
- Admin media actions require active admin role and audit trail.
- Service-role use is server-only and scoped; avoid bypassing RLS for ordinary student requests.
- Signed storage URLs must be short-lived and issued only after server-side entitlement checks.

## 10. Test plan — mandatory before calling a feature complete

### Offline/PWA
- First install online, reopen offline, app update while offline, and rollback from failed cache install.
- Download partial/corrupt content; verify checksum rejection and safe retry.
- Storage quota exhausted; browser eviction; device restart mid-write.
- Logout/account switch; expired entitlement; disabled profile; stale content version.
- Two devices edit the same draft; conflict resolution and no silent data loss.
- Duplicate/reordered sync requests; retry after server commits but before client acknowledgement.
- Clock drift forward/backward; offline attempt after deadline; server must reject or classify correctly.
- Low-end Android, slow 2G/3G-like network, metered data and background suspension.

### Video
- Private/unpublished asset cannot be discovered or played by unauthorised users.
- Signed URL expiry and replay after entitlement revocation.
- Captions, keyboard, screen reader, speed, seeking and low-bandwidth playback.
- Resume position across devices; progress spam throttling.
- Streaming-only media never offers a fake offline-download action.
- Upload/transcode/caption failures recover without duplicate assets.

### AI Tutor
- Cross-account isolation; unpaid/expired course denial; inactive user denial.
- Citation resolves to correct approved source version.
- Prompt injection in retrieved textbook/teacher document cannot override tutor policy.
- Unsupported question returns uncertainty, not invented citations.
- Bilingual scientific notation, calculation and unit tests.
- Provider timeout, quota exhaustion and cost cap; graceful fallback.
- Data retention/deletion and teacher-review workflow.

### Release evidence

A green build or static test is not acceptance. Require database/RLS tests, API/RPC tests, browser E2E, real-device/network tests, accessibility checks, monitoring and recovery evidence. Record exact commit SHA, environment, test fixture version and artifacts for every pass.

## 11. Explicit non-goals and safeguards

- No offline payment approval, role change, grade mutation or final exam submission.
- No client-side AI provider secret or service-role key.
- No DRM circumvention or offline download of unlicensed media.
- No broad service-worker cache of authenticated API responses.
- No client-supplied actor identity or trusted client clock.
- No silent conflict overwrite or duplicate side effects.
- No real student data in synthetic QA fixtures.
- No paid media provider, new cloud service or production migration until the cost/security/release gates are satisfied.


## 12. Implemented first vertical slice — app-shell fallback only

The current implementation branch adds:
- `public/manifest.webmanifest` and a JMT Academy SVG app icon.
- Production/secure-context service-worker registration from the root layout.
- A static `/offline` explanation route.
- A versioned service worker that caches the offline fallback and immutable `/_next/static/` assets only.
- A static guardrail test for the manifest, registration and cache boundary.

This is intentionally a **small, safe first slice**, not full offline learning. It does not yet provide installability proof on target Android devices, authenticated lesson downloads, IndexedDB content storage, encryption/key lifecycle, offline practice, mutation outbox, sync RPCs, conflict resolution, entitlement leases, video offline playback or background sync. Those capabilities remain not implemented/not evidenced until separately built and tested.

The service worker does not cache authenticated HTML or API responses. It must not be described as making the student dashboard, courses or exams available offline. The offline page explicitly tells learners that downloaded lessons and synchronisation are future capabilities.
