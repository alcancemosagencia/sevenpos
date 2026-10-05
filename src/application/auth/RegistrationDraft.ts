import { COUNTRY_PROFILES } from '../../config/countries';
import type { SupportedCountryCode } from '../../types/country';
import type { CloudAuthService, CloudBusinessMembership, CloudUser } from '../../domain/auth/CloudAuthService';
import type { OnboardingState } from '../../types/onboarding';

export interface RegistrationDraft {
  firstName: string;
  lastName: string;
  email: string;
  businessName: string;
  countryCode: SupportedCountryCode;
  currencyCode: string;
}
export const REGISTRATION_DRAFT_KEY = 'sevenpos-registration-draft-v1';
export function registrationDraft(value: unknown): RegistrationDraft | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const country = String(raw.countryCode) as SupportedCountryCode;
  if (!Object.hasOwn(COUNTRY_PROFILES, country)) return null;
  const text = (key: string, limit: number) => typeof raw[key] === 'string' ? raw[key].trim().slice(0, limit) : '';
  const email = text('email', 254).toLowerCase();
  const firstName = text('firstName', 100), businessName = text('businessName', 200);
  if (!firstName || !businessName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return { firstName, lastName: text('lastName', 100), email, businessName, countryCode: country, currencyCode: COUNTRY_PROFILES[country].primaryCurrency.code };
}
export function readRegistrationDraft(): RegistrationDraft | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = JSON.parse(sessionStorage.getItem(REGISTRATION_DRAFT_KEY) ?? 'null');
    if (!raw || !Number.isFinite(raw.startedAt) || Date.now() - raw.startedAt > 86400000 || raw.startedAt > Date.now()) return null;
    return registrationDraft(raw.draft);
  } catch { return null; }
}
export function saveRegistrationDraft(draft: RegistrationDraft): void {
  const safe = registrationDraft(draft);
  if (!safe) throw new Error('REGISTRATION_DRAFT_INVALID');
  try { sessionStorage.setItem(REGISTRATION_DRAFT_KEY, JSON.stringify({ startedAt: Date.now(), draft: safe })); } catch { /* Memory state still supports verification when storage is blocked. */ }
}
export function clearRegistrationDraft(): void { try { sessionStorage.removeItem(REGISTRATION_DRAFT_KEY); } catch { /* Storage may be unavailable. */ } }
export function restoreRegistrationFields(state: OnboardingState, draft: RegistrationDraft | null): OnboardingState {
  if (!draft || state.onboardingStatus === 'completed') return state;
  const profile = COUNTRY_PROFILES[draft.countryCode];
  return { ...state, countryCode: draft.countryCode, business: { ...state.business, name: draft.businessName, phonePrefix: profile.phonePrefix }, owner: { ...state.owner, firstName: draft.firstName, lastName: draft.lastName, email: draft.email }, regionalSettings: { ...state.regionalSettings, primaryCurrencyCode: draft.currencyCode, secondaryCurrencyCode: profile.secondaryCurrency?.code, enableSecondaryUSD: draft.countryCode === 'VE' } };
}

// The existing transactional RPC remains the sole creator. A response lost after
// commit is recovered by querying the membership before retrying bootstrap.
export async function completeRegistration(service: CloudAuthService, user: CloudUser, draft: RegistrationDraft | null): Promise<CloudBusinessMembership | null> {
  if (!user.emailConfirmed) throw new Error('EMAIL_NOT_CONFIRMED');
  const memberships = await service.getMemberships();
  const owner = memberships.find(item => item.role === 'OWNER');
  if (owner) {
    if (owner.status !== 'ACTIVE') throw new Error('BUSINESS_ACCESS_DENIED');
    return owner;
  }
  if (!draft || draft.email !== user.email.trim().toLowerCase()) return null;
  const result = await service.bootstrapOwnerBusiness(draft);
  return { businessId: result.businessId, businessName: result.businessName, countryCode: result.countryCode, role: result.role, status: 'ACTIVE' };
}
