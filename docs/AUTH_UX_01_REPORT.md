# AUTH-UX-01 — implementation and verification report

2026-10-05. **Local implementation and automated verification: PASS. Manual inbox/live-production E2E: PENDING.**

## Required deliverables

| Field | Result |
| --- | --- |
| ROOT CAUSE DUPLICATE BUSINESS FORM | Pending business/country/owner lived only in React state. Reload discarded them; OTP/link confirmation fell back to BUSINESS_SETUP_REQUIRED when the pending business name was absent. |
| EXISTING EMAIL STRATEGY | Exact inline error only for explicit provider existing-account semantics; generic login/recovery fallback for ambiguous responses, including obfuscated users. No identities-based inference or account lookup endpoint. |
| EMAIL ENUMERATION RISK | MITIGATED: no new existence oracle; existing Supabase protections remain. |
| REGISTER DRAFT | Strict non-secret whitelist in per-tab sessionStorage, 24h logical expiry; restored on reload; cleared on completion/navigation/account switch/sign-out. Completed operational onboarding takes precedence. |
| PASSWORD PERSISTED | NO. Form memory/request only, fields cleared after submission. |
| OTP LENGTH | 8; numeric signup OTP validated before provider call. |
| POST VERIFY FLOW | Verified same-account session → existing membership lookup → existing bootstrap RPC if absent → enrollment → PIN when missing; a configured locked local terminal still needs PIN. |
| BUSINESS BOOTSTRAP IDEMPOTENT | PASS in automated recovery scenarios; existing server RPC inspected, unchanged. Deployed production behavior remains a manual/live gate. |
| DUPLICATE BUSINESS | 0 in local integration including committed RPC response loss and refresh. |
| DUPLICATE MEMBERSHIP | 0 in the same local integration. |
| AUTH LIGHT DEFAULT | PASS across Login/Register/Verify/Forgot/Reset. |
| MAIN APP THEME | UNCHANGED; browser asserts saved dark preference and root dark class remain under the light auth surface. |
| VERIFY EMAIL BLUE ICON | REMOVED in both local template copies. |
| OTHER EMAIL DECORATIVE ICONS | Same purely decorative container removed from the other five templates in both directories; titles/copy/CTA/footer preserved; six mirrors match. |
| OFFLINE PIN | PASS in browser fallback integration and existing regression tests. Native stronghold/offline terminal manual E2E remains pending. |
| 320 | PASS |
| 360 | PASS |
| 390 | PASS |
| 412 | PASS |
| 768 | PASS |
| 1440 | PASS |
| TESTS | npm test: 807/807 Vitest executed tests + 46/46 Node harness tests; 91 pre-existing credential-dependent tests skipped in nine suites. No auth tests skipped. New focused auth tests: 30/30. |
| BROWSER | 109/109 checks, 30 viewport captures; actual UI and AuthContext with simulated cloud service and recovery session; all external HTTP blocked. |
| TYPECHECK | PASS |
| LINT | PASS, zero errors/warnings; no lint rules weakened. |
| BUILD | PASS; existing large-chunk/mixed-import warnings remain. |
| NATIVE CONTROLS | PASS: zero native select/date controls. |
| CARGO | PASS: cargo check --manifest-path src-tauri/Cargo.toml. |
| PRODUCTION | UNTOUCHED. No remote database/Auth/template mutation. |
| COMMIT / PUSH / DEPLOY | NONE. |

## Changed files in this task

Product/auth:

- `src/app/App.tsx`
- `src/context/AuthContext.tsx`
- `src/domain/auth/CloudAuthService.ts`
- `src/application/auth/RegistrationDraft.ts` (new)
- `src/application/auth/authMessages.ts` (new)
- `src/infrastructure/cloud/SupabaseAuthService.ts`
- `src/features/auth/AuthSurface.tsx` (new)
- `src/features/auth/AccountLoginPage.tsx`
- `src/features/auth/RegisterAccountPage.tsx`
- `src/features/auth/VerifyEmailPage.tsx`
- `src/features/auth/PasswordRecoveryPage.tsx`
- `src/components/ui/OtpInput.tsx`
- `src/styles/globals.css`

Templates: `verify_account.html`, `password_recovery.html`, `email_change.html`, `user_invitation.html`, `security_email_changed.html` and `security_password_changed.html`, each under both `supabase/templates/` and `src/infrastructure/email/templates/` (12 files).

Verification/docs:

- `src/tests/authux01-registration.test.ts`
- `src/tests/authux01-supabase.test.ts`
- `scripts/authux01-browser.mjs`
- `scripts/authux01-vite.config.ts`
- `scripts/fixtures/authux01-browser.html`
- `scripts/fixtures/authux01-browser.tsx`
- `docs/AUTH_UX_01_AUDIT.md`
- `docs/AUTH_UX_01_REPORT.md`
- `docs/diagnostics/authux01/` generated local screenshots and sanitized JSON.

Existing unrelated working-tree changes were retained. No migration, production RPC, authorization policy, billing reauthentication implementation, operational ThemeProvider, Rust or PIN vault implementation was changed by this task.

## Known limitations

1. Actual email delivery, eight-digit OTP issuance, production signup ambiguity configuration and secure recovery-link consumption have not been certified against a real inbox. The user will execute that stage.
2. The patch and template cleanup are local. A run on sevenpos.pro/app.sevenpos.pro today observes the deployed version, not necessarily this patch. Updated production certification must follow review and a separately authorized deployment/template publication.
3. Exact existing-account error cannot be guaranteed where Supabase intentionally obfuscates signup responses. Generic fallback is deliberate and approved by the requested security strategy.
4. Draft recovery is scoped to the same tab and 24h. Blocked sessionStorage, expired drafts or a closed tab can require legacy recovery/setup; secrets are never persisted to solve this.
5. Browser PIN testing uses the existing WebCrypto fallback. cargo check verifies compilation; it is not proof of physical Tauri/Stronghold execution.
6. Nine existing suites / 91 tests requiring external staging credentials were skipped. They were not rerouted to the production project.

## Exact manual handoff

The user did not supply an existing controlled QA mailbox address. Suggested dedicated mailbox: **qa-authux01-20261005@sevenpos.pro**. Create it and confirm that it receives mail before using it; this report does not assert that it exists. If that domain's inbox cannot be administered, substitute a fresh address/alias in a mailbox you control.

After reviewing the patch and resolving the deployment prerequisite:

1. Open an isolated browser profile/new QA terminal, not an operational terminal with real sales. For the user-selected hosted project, use app.sevenpos.pro and verify the expected version is running.
2. Register that fresh QA email with owner `QA Auth`, last name `UX01`, business `QA AUTH-UX-01 20261005`, country Chile (CLP). Choose the password privately.
3. Reload while waiting for OTP. Confirm the verification screen retains the QA email. Inspect the real email: logo → title, no decorative circle, unchanged OTP/CTA/security/footer.
4. Enter the received eight-digit OTP yourself. Confirm no repeated business/currency form appears and the retained business/country/currency reach enrollment.
5. Enroll the QA terminal, create a private PIN, enter the app. Lock it; disconnect the network; unlock with the same PIN. Reconnect.
6. In a separate isolated session, register the now-confirmed email again. Expect exact inline existing-account error only if the provider supplies explicit semantics; otherwise expect the documented generic login/recovery fallback. Confirm there is no harness-generated automatic resend.
7. Test “Iniciar sesión”, “Recuperar contraseña” and “Cambiar correo” navigation. Receive the recovery email and execute the approved link flow privately. Do not share the recovery URL or credentials.
8. Report only sanitized PASS/FAIL outcomes, whether a repeated form appeared, the version tested and any safe UI error text. Never share password, PIN, OTP, tokens or credential-bearing links. Preserve the QA business as explicitly identifiable QA data; no automated production cleanup is authorized here.

STOP. Await review. No commit, push or deploy.
