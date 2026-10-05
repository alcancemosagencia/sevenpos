# AUTH-UX-01 — audit and local implementation

Date: 2026-10-05. Work is local and uncommitted. No push, deployment, migration, remote Auth administration or production mutation was performed.

## Root cause and source of truth

`src/context/AuthContext.tsx` previously kept pending email, business, country and owner in separate React state variables. Signup did not persist those pending fields through the onboarding repository. The Supabase user was created by `SupabaseAuthService.signUp`; only first/last name went into metadata. Reload discarded the pending business. Both OTP and link confirmation queried memberships, then bootstrapped only when the in-memory business name existed; otherwise they transitioned to `BUSINESS_SETUP_REQUIRED`. That fallback rendered another business/currency setup form.

The current registration form derives currency from the selected country: CL/CLP, CO/COP and VE/VES with secondary USD. There is no independent currency picker to preserve. The new strict draft records that canonical derived currency.

The existing `bootstrap_owner_business` RPC is the only cloud business creator. The latest repository definition in `supabase/migrations/20261002231615_phase12d_suspended_bootstrap_guard.sql` serializes by authenticated owner using an advisory transaction lock and reuses existing owner membership. It preserves suspension/inactive access guards. AUTH-UX-01 does not change this RPC, database contracts or grants. Local mocked integration verifies client recovery; it does not certify the deployed production RPC definition.

## Auth state machine

Actual states are BOOTING, ACCOUNT_REQUIRED, REGISTER_REQUIRED, EMAIL_VERIFICATION_REQUIRED, BUSINESS_SETUP_REQUIRED, EXISTING_LOCAL_BUSINESS_LINK_REQUIRED, DEVICE_ENROLLMENT_REQUIRED, PIN_SETUP_REQUIRED, DEVICE_LOCKED, DEVICE_UNLOCKED, CLOUD_CONFIGURATION_ERROR and OFFLINE_NEW_DEVICE.

| Flow | Transition and persistence |
| --- | --- |
| Register | REGISTER_REQUIRED → Supabase signup → non-secret session draft → EMAIL_VERIFICATION_REQUIRED. Explicit provider existing-email error stays in the form. |
| Verify | Eight-digit OTP or confirmation link → verified cloud identity → existing membership lookup → existing transactional bootstrap only if absent → DEVICE_ENROLLMENT_REQUIRED. |
| Business fallback | BUSINESS_SETUP_REQUIRED remains available for legacy confirmed accounts without a matching registration draft. A restored valid registration draft bypasses this redundant form. |
| Refresh before OTP | Local boot first; on a fresh terminal restore the session draft and EMAIL_VERIFICATION_REQUIRED. |
| Refresh during bootstrap | Verified same-account session + retained draft → membership lookup; reuse a committed business after response loss. |
| Network interruption | Keep draft. Retry/link-confirmation can reuse the verified session rather than consuming the OTP again. Server RPC idempotency covers simultaneous retries. |
| Enrollment | Authenticated account/membership → cloud device record → existing enrollment/link storage → PIN_SETUP_REQUIRED when local owner/PIN is absent; existing PIN remains locked unless already locally unlocked. |
| PIN creation | Save local business/settings and owner through existing repositories; credential goes through existing PIN vault; save local unlocked session; clear registration draft. |
| Existing login | ACCOUNT_REQUIRED → email/password and memberships → existing business/link/enrollment resolution. Cloud sign-in does not substitute for a locked terminal's PIN. |
| Existing offline terminal | Local BootApplication/repositories/vault/session determine DEVICE_LOCKED or DEVICE_UNLOCKED; no pending cloud draft forces OTP. |
| Account switch | Clear registration draft and local session only; retain operational repositories and enrollment. |
| Recovery | Existing AccountLoginPage recovery mode sends the approved recovery link; PasswordRecoveryPage consumes the recovery session on the canonical recovery origin. No second recovery service. |

## Existing-email security strategy

Use strategy A for explicit provider error codes `user_already_exists`/`email_exists`, with the exact inline message and SPA login/recovery actions. Use strategy C for ambiguous responses: show “Si ya tienes una cuenta, inicia sesión o recupera tu contraseña.” on verification for all signup responses requiring confirmation. Do not interpret `identities: []` as proof that an account exists.

Supabase intentionally can return an obfuscated user for an existing confirmed account with confirmation enabled: [official signup reference](https://supabase.com/docs/reference/javascript/auth-signup). The installed auth-js signup contract documents the same distinction. This means exact existing-account detection cannot be promised for every project configuration. No public account lookup, admin key, enumeration endpoint or extra automatic signup/resend request is introduced. Provider rate limits remain authoritative; the UI retains its 45-second resend cooldown. Client cooldown is not presented as brute-force protection.

Only approved, bounded Spanish messages reach the signup/OTP/login/recovery UI. Arbitrary SDK errors are replaced by generic messages. User metadata remains descriptive data, never authorization input.

## Draft and secret lifecycle

`sevenpos-registration-draft-v1` in per-tab sessionStorage contains only firstName, lastName, normalized email, businessName, validated countryCode and derived currencyCode, plus start time. It survives reload in the same tab, expires after 24 hours, and is cleared on PIN completion, change-email/register navigation, login navigation, account switch or cloud sign-out. Completed local onboarding is not overwritten by a pending draft.

Password stays in the form/request memory and is cleared after submission completes. No password, PIN, OTP or cloud token is included in the registration draft, diagnostic JSON or screenshots. Existing Supabase session persistence and existing local credential vault are unchanged. If sessionStorage is unavailable, the in-memory draft works until reload; after tab closure/expiry a legacy business fallback may be necessary.

## Light scope and email cleanup

`AuthSurface` and scoped CSS override both semantic variables and their Tailwind aliases for Login, Register, Verify, Forgot and Reset. They do not change ThemeProvider, root theme classes or saved operational preference. Chromium checks explicitly begin with an operational dark preference and assert it remains dark under the light auth surface.

OTP cells now shrink within the 320px layout. Numeric input, paste, autofocus progression, backspace and one-time-code autocomplete stay in the existing OtpInput. A synchronous guard prevents overlapping UI verification calls.

The repeated decorative SVG container between logo and title was removed from verify_account and from the five other templates: password_recovery, email_change, user_invitation, security_email_changed and security_password_changed. Their headings/copy communicate the same meaning; the block had no unique semantic content. Both template directories were updated. Canvas/card, logo, OTP, CTA, security text and footer are retained. Remote Supabase/Resend templates have not been published.

## Local verification scope

- Vitest exercises strict draft persistence/expiry/normalization, completed local data protection, verified identity matching, inactive membership guards, lost RPC response recovery, explicit versus ambiguous signup semantics, sanitization, eight-digit OTP, invalid/expired/rate-limited OTP and explicit resend.
- `scripts/authux01-browser.mjs` mounts actual auth screens and AuthContext via a local fixture with simulated CloudAuthService. Every external browser request is blocked. It tests refresh before OTP, invalid/expired OTP, refresh after a committed bootstrap with lost response, unique business/membership, device enrollment, local PIN creation, offline unlock and account switch preservation.
- Evidence: `docs/diagnostics/authux01/summary.json` and viewport screenshots at 320, 360, 390, 412, 768 and 1440. These are local UI evidence, not proof of inbox delivery or live production behavior.
- No new test dependency or weakened lint/test configuration is required. The Vite harness excludes evidence files from its watcher so screenshot JSON writes do not reload a canonical SPA route into another entry point.

## Manual E2E boundary

The user designated hosted production `sevenpos-db` / `byrjbrmsyusonhjovavp` on sevenpos.pro/app.sevenpos.pro and will operate their own controlled inbox. No QA mailbox address was supplied. Do not assume that a proposed address exists or send email on the user's behalf.

The local changes are not deployed. A production-domain run now tests the existing deployed version, not this patch. Review and separately authorized deployment/configuration must precede certification of the updated production UI/templates. Do not point the previous staging runner at production.

After review, use a newly created controlled dedicated QA mailbox or a fresh alias that the user's provider supports. In an isolated browser profile/terminal, register owner, business and country; verify the received eight-digit OTP locally; confirm no repeated business/currency form; enroll and set PIN; lock and disconnect; unlock with PIN; reconnect and test existing signup → safe login/recovery UX. Use a fresh recovery link without sharing it. Report only sanitized outcomes and the mailbox address if clarification is needed; never share password, PIN, OTP, tokens or links containing credentials.

Final gate results and limitations are recorded separately in `AUTH_UX_01_REPORT.md`.
