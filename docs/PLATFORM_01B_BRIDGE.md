# PLATFORM-01B-BRIDGE — isolated candidate, not released

Base: 467469faaf880d7381d8e859e0211354ff291d09. Branch: codex/platform01b-bridge.
Checkout: C:/Users/Omar/Documents/SevenPOS/.tmp/platform01b-bridge.

No commit, push, hosted migration, Edge deploy or production deploy. Main working tree and unpublished Phase12 files remain unchanged by this bridge work.

## Transport and capability

The production-based pages use one ListInput (search/country/plan/subscriptionStatus/billingSource/limit/offset) and one zero-cost ManualProActivationParams (reason/interval/startAt/reference/internalNote). UI does not select a backend version.

PlatformRpcCompatibilityAdapter sends canonical list arguments first. Only PGRST202 with the exact public.platform_list_businesses function name and schema-cache missing-function message allows fallback. Authorization, domain, validation, ambiguous-overload, network and unexpected errors never fall back. Legacy maps status/source and aligned offset to page/page_size. Canonical backend accepts arbitrary valid offset; legacy rejects non-aligned offset explicitly before its fallback request.

Version UNKNOWN/LEGACY/PLATFORM01B is stored only in memory, reset on signout/identity change. Canonical reads are re-probed, so the same loaded artifact notices a backend cutover. No long-lived storage flag. No version inference from frontend release number. Before every activation, a fresh harmless canonical list probe confirms PLATFORM01B.

Manual activation is disabled in UNKNOWN/LEGACY. Legacy mutation fallback is intentionally never executed, even if canonical mutation returns a missing signature after detection; that resets capability and surfaces a safe error. A pure legacyGrantArguments helper documents/tests UTC calendar clamping with zero amount and null payment method, but is unreachable from mutation dispatch while legacy is gated.

ASSISTED_SALE is absent from selectable reasons, marked Próximamente in the form, excluded from canonical type and rejected before any request at runtime. There are no amount/payment-method/end-date inputs. Backend calculates terms; new grant sends amount_minor=0, currency=null and no client admin attribution. Allowed reasons: FRIEND_FAMILY, TESTER, INTERNAL, COMPENSATION, OTHER.

Session RPC retains strict is_admin=true and SUPER_ADMIN role checks. Explicit inactive or malformed active flag is denied. Legacy omits the field but already validates active status in its trusted backend lookup; omission is accepted without inferring authorization from merchant role, PIN or email. This addresses the audited legacy/staging response mismatch without changing hosted Auth.

## Normalized truth

List fields are nullable when unavailable. No default Chile, owner name, subscription ACTIVE or unknown count=0 manufactured in transport. Effective PRO uses ACTIVE/PAST_DUE; PENDING/EXPIRED/missing resolves FREE. Detail preserves legacy devices/members arrays; new lean counts display without claiming there are zero rows when arrays are absent. Subscription events and counts are retained in the canonical model. Legacy diagnostic's reported plan is preserved internally and discrepancy is flagged, rather than silently erasing its inconsistent PAST_DUE mapping.

Manual terms show Vigencia fija, not automatic renewal. New admin UUID attribution is rendered when email is unavailable. No dashboard/host/shell redesign, charts, MRR, tax implementation or Phase12 operational panels.

## Validation

- 740/740 tests in isolated production-base checkout; 165 files, no skips. This is 708 production-base tests plus 32 bridge tests, not the broader unpublished working-tree suite.
- Focused matrix includes both signatures, list/search/filter/pagination arguments, null preservation, detail shapes, legacy/new session responses, all five new zero-cost reasons, assisted rejection, strict no-fallback errors, mutation no-retry, identity reset and cutover re-probing.
- Actual browser smoke against a legacy HTTP simulation: login, directory, detail, legacy arrays preserved, manual submit disabled, assisted option absent, no page crash.
- Same frontend then ran against the actual PLATFORM-01B SQL migration in local embedded PostgreSQL (auth transport simulated, backend authorization/read/activation functions real). Login, list, missing-subscription FREE, detail and TESTER grant succeeded; UI showed PRO/ACTIVE/MANUAL, immutable contract zero VES and fixed term. No hosted database was used. Other four reasons have transport coverage and earlier PLATFORM-01B PostgreSQL checks.
- Typecheck, lint, build, native-controls audit (0) and cargo check PASS. Logs are ignored bridge-*.log files in this checkout. Cargo-generated schema files restored and excluded.
- Screenshots/helper servers live under parent .tmp/platform01b-bridge-evidence and parent .tmp scripts, not in the release whitelist.
- The dev preview reused the parent node_modules; Vite denied some font asset requests outside its serving root. This is a preview-harness limitation, not a CSS change; the successful production build bundles font assets. Screenshots demonstrate behavior/gating, not a new visual approval. Temporary preview/backend servers were stopped after smoke.

## Exact release whitelist — 10 files

1. src/platform/services/PlatformRpcCompatibilityAdapter.ts
2. src/platform/services/PlatformAdminService.ts
3. src/platform/types/PlatformTypes.ts
4. src/platform/context/PlatformAuthContext.tsx
5. src/platform/components/ManualProActivationModal.tsx
6. src/platform/pages/PlatformBusinessesPage.tsx
7. src/platform/pages/PlatformBusinessDetailPage.tsx
8. src/tests/platform-rpc-bridge.test.ts
9. src/tests/platform-super-admin.test.ts
10. docs/PLATFORM_01B_BRIDGE.md

Excluded: backend migration, Edge expirator, PlatformMvpService from the broader working tree, Phase12 UI/tests, Auth/Landing/Sales/Tauri edits, schema artifacts, secrets, environment files, diagnostics and temporary files. Unrelated candidate files: 0.

## Subsequent release sequence (not executed)

A: publish this compatibility frontend and verify it on legacy production. B: apply PLATFORM-01B backend migration and verify automatic detection. C: deploy matching Edge expirator. D: live controlled manual/concurrency/expiry/scheduler tests. Never reverse the sequence. Actual production compatibility/deployment and live concurrency remain release-stage validation, not claims made by this local candidate.
