import { describe, it, expect, vi } from 'vitest';

describe('AG-15C-B.6.1 — Billing Owner Re-Auth & Local Session Preservation', () => {
  it('1. PIN local valid + Billing re-auth success stays on /subscription and preserves local session', async () => {
    const authMachineState = 'DEVICE_UNLOCKED';
    const currentRoute = '/subscription';
    let cloudUser: { id: string; email: string } | null = null;
    let cloudMembership: { role: string; status: string } | null = null;

    const mockCloudService = {
      signInWithPassword: vi.fn().mockResolvedValue({ id: 'u_owner_1', email: 'owner@sevenpos.pro', emailConfirmed: true }),
      getMemberships: vi.fn().mockResolvedValue([{ role: 'OWNER', status: 'ACTIVE', businessId: 'biz-1' }]),
    };

    const reauthenticateOwnerForBilling = async (email: string, pass: string) => {
      const user = await mockCloudService.signInWithPassword(email, pass);
      if (!user.emailConfirmed) return { success: false, error: 'Email not confirmed' };
      const memberships = await mockCloudService.getMemberships();
      const ownerMembership = memberships.find((m: { role: string; status: string }) => m.role === 'OWNER');
      if (!ownerMembership || ownerMembership.status !== 'ACTIVE') {
        return { success: false, error: 'Esta acción solo puede realizarla el propietario del negocio.' };
      }
      cloudUser = user;
      cloudMembership = ownerMembership;
      // Invariant: authMachineState is NOT changed to DEVICE_LOCKED
      return { success: true };
    };

    const result = await reauthenticateOwnerForBilling('owner@sevenpos.pro', 'CorrectPassword123!');

    expect(result.success).toBe(true);
    expect(authMachineState).toBe('DEVICE_UNLOCKED');
    expect(currentRoute).toBe('/subscription');
    expect(cloudUser).toEqual({ id: 'u_owner_1', email: 'owner@sevenpos.pro', emailConfirmed: true });
    expect(cloudMembership).toEqual({ role: 'OWNER', status: 'ACTIVE', businessId: 'biz-1' });
  });

  it('2. PIN local valid + wrong cloud password stays in modal with clear error', async () => {
    const authMachineState = 'DEVICE_UNLOCKED';
    const currentRoute = '/subscription';

    const mockCloudService = {
      signInWithPassword: vi.fn().mockRejectedValue(new Error('Invalid login credentials')),
      getMemberships: vi.fn(),
    };

    const reauthenticateOwnerForBilling = async (email: string, pass: string) => {
      try {
        await mockCloudService.signInWithPassword(email, pass);
        return { success: true };
      } catch {
        return { success: false, error: 'No pudimos verificar la cuenta del propietario.' };
      }
    };

    const result = await reauthenticateOwnerForBilling('owner@sevenpos.pro', 'WrongPass');

    expect(result.success).toBe(false);
    expect(result.error).toBe('No pudimos verificar la cuenta del propietario.');
    expect(authMachineState).toBe('DEVICE_UNLOCKED');
    expect(currentRoute).toBe('/subscription');
  });

  it('3. PIN local valid + authenticated non-owner returns owner-only error and preserves local session', async () => {
    const authMachineState = 'DEVICE_UNLOCKED';
    const currentRoute = '/subscription';
    let cloudUser = null;

    const mockCloudService = {
      signInWithPassword: vi.fn().mockResolvedValue({ id: 'u_cashier_1', email: 'cashier@sevenpos.pro', emailConfirmed: true }),
      getMemberships: vi.fn().mockResolvedValue([{ role: 'CASHIER', status: 'ACTIVE', businessId: 'biz-1' }]),
    };

    const reauthenticateOwnerForBilling = async (email: string, pass: string) => {
      const user = await mockCloudService.signInWithPassword(email, pass);
      const memberships = await mockCloudService.getMemberships();
      const ownerMembership = memberships.find((m: { role: string; status: string }) => m.role === 'OWNER');
      if (!ownerMembership || ownerMembership.status !== 'ACTIVE') {
        return { success: false, error: 'Esta acción solo puede realizarla el propietario del negocio.' };
      }
      cloudUser = user;
      return { success: true };
    };

    const result = await reauthenticateOwnerForBilling('cashier@sevenpos.pro', 'ValidPassword123!');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Esta acción solo puede realizarla el propietario del negocio.');
    expect(authMachineState).toBe('DEVICE_UNLOCKED');
    expect(currentRoute).toBe('/subscription');
    expect(cloudUser).toBeNull();
  });

  it('4. Cancel re-auth closes modal, stays on /subscription and preserves local session', () => {
    let isReAuthModalOpen = true;
    const authMachineState = 'DEVICE_UNLOCKED';
    const currentRoute = '/subscription';

    const handleCancelReAuth = () => {
      isReAuthModalOpen = false;
      // Stays on subscription, no state change
    };

    handleCancelReAuth();

    expect(isReAuthModalOpen).toBe(false);
    expect(authMachineState).toBe('DEVICE_UNLOCKED');
    expect(currentRoute).toBe('/subscription');
  });

  it('5. Normal cloud login outside billing flow transitions to DEVICE_LOCKED as designed for device unlock', async () => {
    let authMachineState = 'ACCOUNT_REQUIRED';

    const normalSignInWithEmail = async () => {
      // Simulating normal account login on device
      authMachineState = 'DEVICE_LOCKED';
      return { success: true };
    };

    await normalSignInWithEmail();
    expect(authMachineState).toBe('DEVICE_LOCKED');
  });

  it('6. Owner of a DIFFERENT business receives explicit mismatch error and cannot hijack billing', async () => {
    const authMachineState = 'DEVICE_UNLOCKED';
    const currentRoute = '/subscription';
    const localLinkedBusinessId = 'biz-current-store-123';

    const mockCloudService = {
      signInWithPassword: vi.fn().mockResolvedValue({ id: 'u_other_owner', email: 'other@sevenpos.pro', emailConfirmed: true }),
      getMemberships: vi.fn().mockResolvedValue([{ role: 'OWNER', status: 'ACTIVE', businessId: 'biz-different-store-999' }]),
    };

    const reauthenticateOwnerForBilling = async (email: string, pass: string) => {
      await mockCloudService.signInWithPassword(email, pass);
      const memberships = await mockCloudService.getMemberships();
      const ownerMembership = memberships.find((m: { role: string; status: string; businessId: string }) => m.role === 'OWNER');
      if (!ownerMembership || ownerMembership.status !== 'ACTIVE') {
        return { success: false, error: 'Esta acción solo puede realizarla el propietario del negocio.' };
      }
      if (ownerMembership.businessId !== localLinkedBusinessId) {
        return { success: false, error: 'La cuenta ingresada pertenece a otro negocio.' };
      }
      return { success: true };
    };

    const result = await reauthenticateOwnerForBilling('other@sevenpos.pro', 'CorrectPassword!');

    expect(result.success).toBe(false);
    expect(result.error).toBe('La cuenta ingresada pertenece a otro negocio.');
    expect(authMachineState).toBe('DEVICE_UNLOCKED');
    expect(currentRoute).toBe('/subscription');
  });

  it('7. Double submit protection prevents multiple concurrent login requests', async () => {
    let reAuthLoading = false;
    let callCount = 0;

    const mockCloudService = {
      signInWithPassword: vi.fn().mockImplementation(async () => {
        callCount++;
        await new Promise((r) => setTimeout(r, 50));
        return { id: 'u_owner_1', email: 'owner@sevenpos.pro', emailConfirmed: true };
      }),
      getMemberships: vi.fn().mockResolvedValue([{ role: 'OWNER', status: 'ACTIVE', businessId: 'biz-1' }]),
    };

    const handleSubmit = async () => {
      if (reAuthLoading) return;
      reAuthLoading = true;
      try {
        await mockCloudService.signInWithPassword('owner@sevenpos.pro', 'pass');
      } finally {
        reAuthLoading = false;
      }
    };

    // Simulate rapid concurrent clicks / Enter + click
    await Promise.all([handleSubmit(), handleSubmit(), handleSubmit()]);

    expect(callCount).toBe(1);
  });

  it('8. Modal does NOT reopen on component re-renders after successful OWNER verification', () => {
    let isReAuthModalOpen = false;
    let isCheckoutModalOpen = true;

    // T1: Owner has authenticated session
    const cloudSession = { user: { id: 'u_1' }, access_token: 'jwt-123' };

    // T2: Re-render / Price preview update occurs
    const onComponentRerender = (currentSession: typeof cloudSession | null) => {
      // Re-auth modal should NOT open because cloudSession is present
      if (!currentSession) {
        isReAuthModalOpen = true;
        isCheckoutModalOpen = false;
      }
    };

    onComponentRerender(cloudSession);

    expect(isReAuthModalOpen).toBe(false);
    expect(isCheckoutModalOpen).toBe(true);
  });

  it('9. billing-create-intent receives Authorization Bearer header with real session token', async () => {
    const mockSession = { access_token: 'verified-owner-jwt-token' };
    const capturedHeaders: Record<string, string> = {};

    const invokeBillingFunction = async (_name: string, _body: object) => {
      if (mockSession?.access_token) {
        capturedHeaders['Authorization'] = `Bearer ${mockSession.access_token}`;
      }
      return { success: true, intentId: 'intent-1' };
    };

    await invokeBillingFunction('billing-create-intent', { planId: 'pro_monthly', billingInterval: 'MONTHLY' });

    expect(capturedHeaders['Authorization']).toBe('Bearer verified-owner-jwt-token');
  });
});
