import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAuthService } from '../infrastructure/cloud/SupabaseAuthService';
import { EXISTING_ACCOUNT_MESSAGE } from '../application/auth/authMessages';
const params = { email: ' qa@example.com ', password: 'synthetic-only', firstName: ' Ana ', lastName: ' QA ', businessName: ' QA negocio ', countryCode: 'CL' };
function fixture(result: unknown) {
  const auth = { signUp: vi.fn().mockResolvedValue(result), resend: vi.fn().mockResolvedValue({ error: null }), verifyOtp: vi.fn().mockResolvedValue(result) };
  return { auth, service: new SupabaseAuthService({ auth } as unknown as SupabaseClient) };
}
describe('AUTH-UX-01 provider contract and sanitization', () => {
  it('uses a single signup with non-secret identity metadata and no automatic resend', async () => {
    const { auth, service } = fixture({ data: { user: { id: 'qa', email: 'qa@example.com', email_confirmed_at: null } }, error: null });
    expect(await service.signUp(params)).toMatchObject({ requiresEmailVerification: true });
    expect(auth.signUp).toHaveBeenCalledOnce(); expect(auth.resend).not.toHaveBeenCalled();
    expect(auth.signUp.mock.calls[0][0].options.data).toEqual({ first_name: 'Ana', last_name: 'QA', business_name: 'QA negocio', country_code: 'CL' });
  });
  it('shows exact existing-email UX only for explicit provider semantics', async () => {
    const { auth, service } = fixture({ data: { user: null }, error: { code: 'user_already_exists', message: 'raw Auth internals' } });
    await expect(service.signUp(params)).rejects.toThrow(EXISTING_ACCOUNT_MESSAGE);
    expect(auth.resend).not.toHaveBeenCalled();
  });
  it.each([{ identities: [] }, { identities: [{ identity_id: 'qa' }] }])('does not infer account existence from identities $identities', async ({ identities }) => {
    const { auth, service } = fixture({ data: { user: { id: 'obfuscated-or-unconfirmed', email: 'qa@example.com', identities, email_confirmed_at: null } }, error: null });
    expect(await service.signUp(params)).toMatchObject({ requiresEmailVerification: true }); expect(auth.resend).not.toHaveBeenCalled();
  });
  it('sanitizes unexpected signup error payloads', async () => {
    const { service } = fixture({ data: { user: null }, error: { message: 'access_token=canary', code: 'unexpected' } });
    await expect(service.signUp(params)).rejects.toThrow(EXISTING_ACCOUNT_MESSAGE);
  });
  it.each([null, { id: '', email: 'qa@example.com' }, { id: 'qa', email: 'other@example.com' }])('rejects missing or mismatched pending identity safely', async user => {
    const { service } = fixture({ data: { user }, error: null });
    await expect(service.signUp(params)).rejects.toThrow(EXISTING_ACCOUNT_MESSAGE);
  });
  it.each(['123456', '123456789', 'abcd1234', ''])('rejects non-canonical signup OTP before HTTP', async token => {
    const { auth, service } = fixture({});
    await expect(service.verifyEmailOtp('qa@example.com', token)).rejects.toThrow('Código incorrecto');
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });
  it('accepts eight digits and returns verified identity', async () => {
    const { auth, service } = fixture({ data: { user: { id: 'qa', email: 'qa@example.com', email_confirmed_at: '2026-10-05' } }, error: null });
    expect(await service.verifyEmailOtp('qa@example.com', '12345678')).toMatchObject({ emailConfirmed: true });
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'qa@example.com', token: '12345678', type: 'signup' });
  });
  it.each([['Token has expired', 'venció'], ['Invalid token', 'Código incorrecto'], ['Too many requests', 'Demasiados intentos']])('maps OTP failure %s safely', async (message, expected) => {
    const { service } = fixture({ data: { user: null }, error: { message } });
    await expect(service.verifyEmailOtp('qa@example.com', '12345678')).rejects.toThrow(expected);
  });
  it('resends only on an explicit resend action', async () => {
    const { auth, service } = fixture({}); await service.resendVerificationEmail(' qa@example.com ');
    expect(auth.resend).toHaveBeenCalledOnce(); expect(auth.resend.mock.calls[0][0]).toMatchObject({ type: 'signup', email: 'qa@example.com' }); expect(auth.signUp).not.toHaveBeenCalled();
  });
});
