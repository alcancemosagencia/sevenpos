import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearRegistrationDraft, completeRegistration, readRegistrationDraft, registrationDraft, REGISTRATION_DRAFT_KEY, restoreRegistrationFields, saveRegistrationDraft } from '../application/auth/RegistrationDraft';
import { authMessage, EXISTING_ACCOUNT_MESSAGE } from '../application/auth/authMessages';
import type { CloudAuthService, CloudBusinessMembership } from '../domain/auth/CloudAuthService';
import type { OnboardingState } from '../types/onboarding';

const draft = registrationDraft({ firstName: ' Ana ', lastName: ' QA ', email: ' QA@EXAMPLE.COM ', businessName: ' QA negocio ', countryCode: 'VE', password: 'never-store', pin: 'never-store', currencyCode: 'USD' })!;
const user = { id: 'qa-user', email: 'qa@example.com', emailConfirmed: true };
const member: CloudBusinessMembership = { businessId: 'qa-business', businessName: 'QA negocio', countryCode: 'VE', role: 'OWNER', status: 'ACTIVE' };
const initial: OnboardingState = { onboardingStatus: 'incomplete', sessionStatus: 'locked', currentStep: 1, countryCode: 'CL', business: { name: '', fiscalId: '', phone: '', phonePrefix: '+56' }, owner: { firstName: '', role: 'Dueño' }, regionalSettings: { primaryCurrencyCode: 'CLP', enableSecondaryUSD: false } };
function service(members: CloudBusinessMembership[] = []) {
  return { getMemberships: vi.fn(async () => members), bootstrapOwnerBusiness: vi.fn(async () => ({ ...member, userId: user.id, email: user.email, firstName: draft.firstName, lastName: draft.lastName, bootstrapCreated: true })) } as unknown as CloudAuthService;
}
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
});
describe('AUTH-UX-01 canonical registration recovery', () => {
  it('normalizes identity and preserves selected currency separately from country', () => {
    expect(draft).toEqual({ firstName: 'Ana', lastName: 'QA', email: user.email, businessName: 'QA negocio', countryCode: 'VE', currencyCode: 'USD' });
  });
  it.each([['CL', 'CLP'], ['CO', 'COP'], ['VE', 'VES'], ['VE', 'USD']])('preserves %s + %s through refresh and bootstrap', async (countryCode, currencyCode) => {
    const selected = registrationDraft({ ...draft, countryCode, currencyCode })!;
    saveRegistrationDraft(selected);
    const restored = readRegistrationDraft(); expect(restored).toEqual(selected);
    const api = service(); await completeRegistration(api, user, restored);
    expect(api.bootstrapOwnerBusiness).toHaveBeenCalledWith(selected);
  });
  it.each(['EUR', '', 'COP'])('rejects unsupported VE currency %s instead of overwriting it', currencyCode => {
    expect(registrationDraft({ ...draft, currencyCode })).toBeNull();
  });
  it.each(['', 'bad-email', 'qa@', '@example.com'])('rejects invalid email %s', email => {
    expect(registrationDraft({ ...draft, email })).toBeNull();
  });
  it('persists a strict non-secret whitelist through refresh', () => {
    saveRegistrationDraft({ ...draft, password: 'secret', accessToken: 'secret', pin: 'secret' } as typeof draft);
    expect(readRegistrationDraft()).toEqual(draft);
    expect(sessionStorage.getItem(REGISTRATION_DRAFT_KEY)).not.toMatch(/password|secret|accessToken|pin/);
  });
  it('expires abandoned drafts and rejects corrupt storage', () => {
    sessionStorage.setItem(REGISTRATION_DRAFT_KEY, JSON.stringify({ startedAt: Date.now() - 86400001, draft }));
    expect(readRegistrationDraft()).toBeNull();
    sessionStorage.setItem(REGISTRATION_DRAFT_KEY, '{invalid');
    expect(readRegistrationDraft()).toBeNull();
  });
  it('clears only the registration draft during account navigation', () => {
    sessionStorage.setItem('operational-data', 'keep'); saveRegistrationDraft(draft); clearRegistrationDraft();
    expect(readRegistrationDraft()).toBeNull(); expect(sessionStorage.getItem('operational-data')).toBe('keep');
  });
  it('restores business, owner and currency without another form', () => {
    const restored = restoreRegistrationFields(initial, draft);
    expect(restored.business.name).toBe(draft.businessName);
    expect(restored.owner.firstName).toBe('Ana'); expect(restored.owner.email).toBe(user.email);
    expect(restored.regionalSettings).toMatchObject({ primaryCurrencyCode: 'USD', enableSecondaryUSD: true });
  });
  it('never overwrites completed local onboarding with a pending cloud draft', () => {
    const completed = { ...initial, onboardingStatus: 'completed' as const };
    expect(restoreRegistrationFields(completed, draft)).toBe(completed);
  });
  it('bootstraps exactly the retained registration fields after verification', async () => {
    const api = service(); expect(await completeRegistration(api, user, draft)).toEqual(member);
    expect(api.bootstrapOwnerBusiness).toHaveBeenCalledOnce(); expect(api.bootstrapOwnerBusiness).toHaveBeenCalledWith(draft);
  });
  it('reuses committed membership after a lost response, reload or repeated verification', async () => {
    const api = service([member]);
    expect(await completeRegistration(api, user, draft)).toEqual(member);
    expect(await completeRegistration(api, user, draft)).toEqual(member);
    expect(api.bootstrapOwnerBusiness).not.toHaveBeenCalled();
  });
  it('recovers an RPC response lost after commit without a second creation', async () => {
    const api = service(); let committed = false;
    vi.mocked(api.getMemberships).mockImplementation(async () => committed ? [member] : []);
    vi.mocked(api.bootstrapOwnerBusiness).mockImplementation(async () => { committed = true; throw new Error('network interruption'); });
    await expect(completeRegistration(api, user, draft)).rejects.toThrow('network interruption');
    expect(await completeRegistration(api, user, readRegistrationDraft() ?? draft)).toEqual(member);
    expect(api.bootstrapOwnerBusiness).toHaveBeenCalledOnce();
  });
  it('does not create business for unverified or different cloud identities', async () => {
    const api = service(); await expect(completeRegistration(api, { ...user, emailConfirmed: false }, draft)).rejects.toThrow('EMAIL_NOT_CONFIRMED');
    expect(await completeRegistration(api, { ...user, email: 'other@example.com' }, draft)).toBeNull();
    expect(api.bootstrapOwnerBusiness).not.toHaveBeenCalled();
  });
  it('does not bypass inactive membership by creating a replacement business', async () => {
    const api = service([{ ...member, status: 'INACTIVE' }]);
    await expect(completeRegistration(api, user, draft)).rejects.toThrow('BUSINESS_ACCESS_DENIED');
    expect(api.bootstrapOwnerBusiness).not.toHaveBeenCalled();
  });
  it('maps explicit provider semantics without exposing arbitrary provider errors', () => {
    expect(authMessage({ code: 'user_already_exists', message: 'internal id' }, 'generic')).toBe(EXISTING_ACCOUNT_MESSAGE);
    expect(authMessage(new Error('access_token=secret'), 'generic')).toBe('generic');
    expect(authMessage({ code: 'otp_expired' }, 'generic')).toContain('venció');
    expect(authMessage({ code: 'over_request_rate_limit' }, 'generic')).toContain('Demasiados intentos');
  });
});
