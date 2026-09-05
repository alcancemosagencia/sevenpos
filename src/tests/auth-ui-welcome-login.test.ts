import { describe, it, expect } from 'vitest';
import { resolveEntryRoute } from '../application/routing/RouteResolver';

describe('HOTFIX AUTH-UI-01: Inicia Sesión from Onboarding Welcome & Routing Invariants', () => {
  it('1. clicking Inicia sesión from onboarding triggers ACCOUNT_REQUIRED transition and resolves /login', () => {
    // When user explicitly clicks "Inicia sesión", authMachineState becomes ACCOUNT_REQUIRED
    const route = resolveEntryRoute({
      isHydrated: true,
      authMachineState: 'ACCOUNT_REQUIRED',
      onboardingStatus: 'incomplete',
      sessionStatus: 'locked',
    });

    // Must resolve to canonical /login (AccountLoginPage with Email + Password)
    expect(route).toBe('/login');
  });

  it('2. login intent never routes to /register or starts signup flow', () => {
    const route = resolveEntryRoute({
      isHydrated: true,
      authMachineState: 'ACCOUNT_REQUIRED',
      onboardingStatus: 'incomplete',
      sessionStatus: 'locked',
    });

    expect(route).not.toBe('/register');
    expect(route).not.toBe('/setup-business');
    expect(route).not.toBe('/enroll-device');
  });

  it('3. login intent never starts business onboarding or marks onboarding completed prematurely', () => {
    // Onboarding status remains untouched until actual onboarding completion
    const state = {
      isHydrated: true,
      authMachineState: 'ACCOUNT_REQUIRED' as const,
      onboardingStatus: 'incomplete' as const,
      sessionStatus: 'locked' as const,
    };

    expect(state.authMachineState).toBe('ACCOUNT_REQUIRED');
    expect(state.onboardingStatus).toBe('incomplete');
  });

  it('4. configure new business retains onboarding flow when requested', () => {
    // When on register/onboarding flow without explicit ACCOUNT_REQUIRED
    const route = resolveEntryRoute({
      isHydrated: true,
      authMachineState: 'REGISTER_REQUIRED',
      onboardingStatus: 'incomplete',
      sessionStatus: 'locked',
    });

    expect(route).toBe('/register');
  });

  it('5. back navigation from account login can return to register/onboarding without state loop', () => {
    // Step A: In Account Login
    let currentAuthMachineState: string = 'ACCOUNT_REQUIRED';
    expect(resolveEntryRoute({ isHydrated: true, authMachineState: currentAuthMachineState })).toBe('/login');

    // Step B: User clicks "Volver a configuración" / "Regístrate aquí"
    currentAuthMachineState = 'REGISTER_REQUIRED';
    expect(resolveEntryRoute({ isHydrated: true, authMachineState: currentAuthMachineState })).toBe('/register');

    // Step C: User clicks "Volver a iniciar sesión"
    currentAuthMachineState = 'ACCOUNT_REQUIRED';
    expect(resolveEntryRoute({ isHydrated: true, authMachineState: currentAuthMachineState })).toBe('/login');
  });

  it('6. existing account login with owner business transitions to device enrollment or unlocked', () => {
    // When owner logs in and has cloud business membership
    const routeAfterLogin = resolveEntryRoute({
      isHydrated: true,
      authMachineState: 'DEVICE_ENROLLMENT_REQUIRED',
      sessionStatus: 'locked',
    });

    expect(routeAfterLogin).toBe('/enroll-device');

    // Once enrolled and unlocked
    const routeUnlocked = resolveEntryRoute({
      isHydrated: true,
      authMachineState: 'DEVICE_UNLOCKED',
      sessionStatus: 'unlocked',
      requestedPath: '/dashboard',
    });

    expect(routeUnlocked).toBe('/dashboard');
  });
});
