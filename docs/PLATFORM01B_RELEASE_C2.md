# PLATFORM-01B Release C2 — billing expiry scheduler

Target: production Supabase `byrjbrmsyusonhjovavp`, Vercel project `sevenpos`.

Architecture: Vercel Cron → GET `/api/cron/billing-expiry` → POST Supabase
`billing-expire-subscriptions` → service-only `platform_expire_manual_pro()`.
The browser does not participate. The standalone Node Function under `api/`
uses Web Request/Response handlers; the Vite frontend is unchanged.

## Credentials and access

Production-only Vercel scheduler secret: `CRON_SECRET`, identical to the Edge
`CRON_SECRET`. The caller sends only `x-cron-secret`; it neither reads nor sends
the service-role credential. Supabase's service-role built-in stays internal to Edge.
Server upstream configuration: `SUPABASE_URL`, fixed to the production project.
No secret uses a `VITE_` prefix or is imported by frontend source.
Missing/wrong cron authorization returns 401 before upstream activity. Secrets,
upstream bodies, headers and exception messages are never logged or returned.
The Edge prioritizes the existing `x-cron-secret` authorization branch and retains
legacy service-role bearer compatibility. No unrelated function auth changes.
RPC EXECUTE remains service_role-only (authenticated/anon denied).

## Release order and validation

1. Publish/deploy the endpoint and matching Edge without a cron registration.
2. Read-only audit all due manual/provider candidates. Only the dedicated
   QA Tester Entitlement Biz (`413028dd-6950-4400-9b6c-3281181eb380`) may be
   prepared for the controlled expiry proof. Preserve its billing contracts.
3. Run `scripts/Invoke-BillingExpiryQA.ps1` from a secure console. It prompts
   for a hidden secret if CRON_SECRET is absent from process environment and
   prints only status/counts/time. Expected: 401, 401, then 200/manualExpired=1,
   followed by 200/manualExpired=0. Check hosted row/event/payment evidence.
4. Register exactly one production cron: `10 5 * * *`, **05:10 UTC daily**.
   Existing brand caching and SPA routing are retained; the explicit API route
   precedes the SPA catch-all.
5. Confirm registration, production scope, scheduled invocation logs, and the
   corresponding Edge invocation. Manual calls alone do not prove scheduling.
6. Once the path is healthy, validate two simultaneous identical canonical
   activations on the FREE QA business through independent hosted connections.
   Require distinct backend PIDs and overlapping transaction windows, one new
   contract/subscription event/admin event, no payments, idempotent second call.
7. Read-only compare Minimarket Don Pepe subscription/contract hashes before
   and after. Never use it as a mutation fixture.

Manual/internal/promotional fixed terms use the canonical transaction and are
excluded from both provider expiry branches. Existing provider cancellation and
seven-day grace behavior is retained. Responses expose only operational counts.
Contract immutability, subscription event attribution and retention remain in
the hosted RPC; no migration/table/column/UI changes are part of this release.

## Evidence policy

Do not declare PLATFORM-01B CLOSED until full-path expiry, idempotent retry,
actual scheduled execution, concurrency, and provider preservation all have
live evidence. A configured cron plus a manual request is insufficient.
If the next daily invocation has not happened, report scheduled execution as
pending and PLATFORM-01B NOT CLOSED. Do not shorten the production schedule
solely to turn a pending validation into PASS.

Relevant gates: npm test, typecheck, lint, build. Native controls and cargo are
not applicable because frontend controls and Rust source/build are untouched.
