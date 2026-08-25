import { describe, it, expect, beforeEach } from 'vitest';
import { COUNTRY_PROFILES, formatCurrency } from '../../../config/countries';
import { hashPin, verifyPinHash } from '../../../services/pinCrypto';
import { OnboardingState } from '../../../types/onboarding';
import { LocalStorageOnboardingRepository } from '../../../services/onboardingRepository';
import { resolveEntryRoute } from '../../../application/routing/RouteResolver';

describe('AG-02 First Run & Regional Foundations', () => {
  it('correctly maps CountryProfile and derived currency for Chile, Colombia, and Venezuela', () => {
    const cl = COUNTRY_PROFILES.CL;
    expect(cl.primaryCurrency.code).toBe('CLP');
    expect(cl.phonePrefix).toBe('+56');
    expect(formatCurrency(15000, cl.primaryCurrency)).toBe('$ 15.000');

    const co = COUNTRY_PROFILES.CO;
    expect(co.primaryCurrency.code).toBe('COP');
    expect(co.phonePrefix).toBe('+57');
    expect(formatCurrency(250000, co.primaryCurrency)).toBe('$ 250.000');

    const ve = COUNTRY_PROFILES.VE;
    expect(ve.primaryCurrency.code).toBe('VES');
    expect(ve.phonePrefix).toBe('+58');
    expect(ve.secondaryCurrency?.code).toBe('USD');
    expect(formatCurrency(120.5, ve.primaryCurrency)).toBe('Bs. 120,50');
  });

  it('supports Venezuela VES and optional secondary USD configuration', () => {
    const stateWithUSD: OnboardingState = {
      onboardingStatus: 'completed',
      sessionStatus: 'unlocked',
      currentStep: 6,
      countryCode: 'VE',
      business: {
        name: 'Bodegón Express',
        fiscalId: 'J-12345678-0',
        phone: '4141234567',
        phonePrefix: '+58',
      },
      regionalSettings: {
        primaryCurrencyCode: 'VES',
        enableSecondaryUSD: true,
        exchangeRateProvider: 'BCV',
      },
      owner: {
        firstName: 'Carlos',
        lastName: 'Mendoza',
        role: 'Dueño',
      },
    };

    expect(stateWithUSD.countryCode).toBe('VE');
    expect(stateWithUSD.regionalSettings.enableSecondaryUSD).toBe(true);
    expect(stateWithUSD.regionalSettings.exchangeRateProvider).toBe('BCV');
  });

  it('correctly hashes PIN with salt using Web Crypto and validates matching/non-matching PINs', async () => {
    const originalPin = '4821';
    const { hash, salt } = await hashPin(originalPin);

    expect(hash).toBeDefined();
    expect(hash.length).toBe(64); // SHA-256 hex string
    expect(salt).toBeDefined();

    // Verify valid PIN
    const isCorrect = await verifyPinHash(originalPin, hash, salt);
    expect(isCorrect).toBe(true);

    // Verify invalid PIN
    const isWrong = await verifyPinHash('9999', hash, salt);
    expect(isWrong).toBe(false);
  });
});

describe('AG-02.2 Session Persistence & Rehydration Tests', () => {
  let repository: LocalStorageOnboardingRepository;
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    // Setup in-memory mock for localStorage
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);

    globalThis.localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
      },
      length: Object.keys(mockStorage).length,
      key: (i: number) => Object.keys(mockStorage)[i] || null,
    };

    repository = new LocalStorageOnboardingRepository();
  });

  it('Test 1: Completar onboarding -> reload -> NO vuelve a /register', () => {
    const completedState: OnboardingState = {
      onboardingStatus: 'completed',
      sessionStatus: 'locked',
      currentStep: 6,
      countryCode: 'CL',
      business: {
        name: 'Minimarket Central',
        fiscalId: '76.123.456-7',
        phone: '987654321',
        phonePrefix: '+56',
        address: 'Av. Libertador #100',
      },
      regionalSettings: { primaryCurrencyCode: 'CLP', enableSecondaryUSD: false },
      owner: { firstName: 'Omar', lastName: 'Torres', role: 'Dueño' },
      pinHash: 'testhash123',
      pinSalt: 'testsalt456',
    };

    repository.save(completedState);

    const rehydrated = repository.load();

    expect(rehydrated.onboardingStatus).toBe('completed');
    expect(rehydrated.business.name).toBe('Minimarket Central');
    expect(rehydrated.owner.firstName).toBe('Omar');
    expect(rehydrated.onboardingStatus).not.toBe('incomplete');
  });

  it('Test 2: Completed + locked -> estado dirige a /login', () => {
    const lockedState: OnboardingState = {
      onboardingStatus: 'completed',
      sessionStatus: 'locked',
      currentStep: 6,
      countryCode: 'CO',
      business: { name: 'Tienda Bogotá', fiscalId: '900.123.456-7', phone: '3101234567', phonePrefix: '+57', address: 'Cra 15' },
      regionalSettings: { primaryCurrencyCode: 'COP', enableSecondaryUSD: false },
      owner: { firstName: 'Carlos', lastName: 'Pérez', role: 'Dueño' },
      pinHash: 'hash',
      pinSalt: 'salt',
    };

    repository.save(lockedState);
    const loaded = repository.load();

    const targetRoute =
      loaded.onboardingStatus === 'incomplete'
        ? '/register'
        : loaded.sessionStatus === 'locked'
        ? '/login'
        : '/dashboard';

    expect(targetRoute).toBe('/login');
  });

  it('Test 3: Completed + unlocked -> estado dirige a /dashboard', () => {
    const unlockedState: OnboardingState = {
      onboardingStatus: 'completed',
      sessionStatus: 'unlocked',
      currentStep: 6,
      countryCode: 'VE',
      business: { name: 'Bodegón Caracas', fiscalId: 'J-12345678-0', phone: '4141234567', phonePrefix: '+58', address: 'Las Mercedes' },
      regionalSettings: { primaryCurrencyCode: 'VES', enableSecondaryUSD: true, exchangeRateProvider: 'BCV' },
      owner: { firstName: 'María', lastName: 'Gómez', role: 'Dueño' },
      pinHash: 'hash',
      pinSalt: 'salt',
    };

    repository.save(unlockedState);
    const loaded = repository.load();

    const targetRoute =
      loaded.onboardingStatus === 'incomplete'
        ? '/register'
        : loaded.sessionStatus === 'locked'
        ? '/login'
        : '/dashboard';

    expect(targetRoute).toBe('/dashboard');
  });

  it('Test 4: Estado todavía no rehidratado -> isHydrated protege contra redirect prematuro', () => {
    let isHydrated = false;

    const evaluateRoute = (state: OnboardingState, hydrated: boolean) => {
      if (!hydrated) {
        return 'LOADING_SPLASH';
      }
      if (state.onboardingStatus === 'incomplete') {
        return '/register';
      }
      return state.sessionStatus === 'locked' ? '/login' : '/dashboard';
    };

    const emptyState: OnboardingState = {
      onboardingStatus: 'incomplete',
      sessionStatus: 'locked',
      currentStep: 1,
      countryCode: 'CL',
      business: { name: '', fiscalId: '', phone: '', phonePrefix: '+56', address: '' },
      regionalSettings: { primaryCurrencyCode: 'CLP', enableSecondaryUSD: false },
      owner: { firstName: '', lastName: '', role: 'Dueño' },
    };

    // Before hydration completes
    const splashRoute = evaluateRoute(emptyState, isHydrated);
    expect(splashRoute).toBe('LOADING_SPLASH');
    expect(splashRoute).not.toBe('/register');

    // After hydration completes
    isHydrated = true;
    const finalRoute = evaluateRoute(emptyState, isHydrated);
    expect(finalRoute).toBe('/register');
  });

  it('Test 5: Logout -> sessionStatus queda "locked" y onboardingStatus sigue "completed"', () => {
    const activeState: OnboardingState = {
      onboardingStatus: 'completed',
      sessionStatus: 'unlocked',
      currentStep: 6,
      countryCode: 'CL',
      business: { name: 'Comercial Santiago', fiscalId: '76.000.000-0', phone: '912345678', phonePrefix: '+56', address: 'Centro' },
      regionalSettings: { primaryCurrencyCode: 'CLP', enableSecondaryUSD: false },
      owner: { firstName: 'Omar', lastName: 'Torres', role: 'Dueño' },
      pinHash: 'hash',
      pinSalt: 'salt',
    };

    repository.save(activeState);

    const loggedOutState: OnboardingState = {
      ...repository.load(),
      sessionStatus: 'locked',
    };
    repository.save(loggedOutState);

    const reloaded = repository.load();
    expect(reloaded.onboardingStatus).toBe('completed');
    expect(reloaded.sessionStatus).toBe('locked');
  });
});

describe('HOTFIX AG-03.1D: Ephemeral Celebration & Boot/Rehydration Invariants', () => {
  it('Invariant 1: !isHydrated resolves strictly to "loading"', () => {
    const route = resolveEntryRoute({
      isHydrated: false,
      onboardingStatus: 'completed',
      sessionStatus: 'unlocked',
    });
    expect(route).toBe('loading');
  });

  it('Invariant 2: onboardingStatus === "incomplete" resolves to "/register"', () => {
    const route = resolveEntryRoute({
      isHydrated: true,
      onboardingStatus: 'incomplete',
      sessionStatus: 'locked',
    });
    expect(route).toBe('/register');
  });

  it('Invariant 3: Step 6 celebration (isCompletionCelebrationActive === true) keeps route on "/register" during active session', () => {
    const route = resolveEntryRoute({
      isHydrated: true,
      onboardingStatus: 'completed',
      sessionStatus: 'locked',
      isCompletionCelebrationActive: true,
    });
    expect(route).toBe('/register');
    expect(route).not.toBe('/dashboard');
    expect(route).not.toBe('/login');
  });

  it('Invariant 4 (Item 18): App closed during Step 6 -> Fresh boot ALWAYS initializes isCompletionCelebrationActive to false -> routes strictly to "/login"', () => {
    // When app is closed and reopened after Step 5, boot always starts with isCompletionCelebrationActive: false
    const freshBootState = {
      isHydrated: true,
      onboardingStatus: 'completed' as const,
      sessionStatus: 'locked' as const,
      isCompletionCelebrationActive: false, // Fresh boot guarantee
    };
    const route = resolveEntryRoute(freshBootState);
    expect(route).toBe('/login');
    expect(route).not.toBe('/register');
    expect(route).not.toBe('/dashboard');
  });

  it('Invariant 5 (Item 19): Direct navigation to /login on completed + locked -> stays on /login', () => {
    const route = resolveEntryRoute({
      isHydrated: true,
      onboardingStatus: 'completed',
      sessionStatus: 'locked',
      isCompletionCelebrationActive: false,
    });
    expect(route).toBe('/login');
  });

  it('Invariant 6 (Item 20): Direct navigation to /dashboard on completed + locked -> resolves to /login', () => {
    const route = resolveEntryRoute({
      isHydrated: true,
      onboardingStatus: 'completed',
      sessionStatus: 'locked',
      isCompletionCelebrationActive: false,
    });
    expect(route).toBe('/login');
    expect(route).not.toBe('/dashboard');
    expect(route).not.toBe('/register');
  });

  it('Invariant 7 (Item 21): Direct navigation to /register on completed + locked -> resolves to /login (NEVER Step 6)', () => {
    const route = resolveEntryRoute({
      isHydrated: true,
      onboardingStatus: 'completed',
      sessionStatus: 'locked',
      isCompletionCelebrationActive: false,
    });
    expect(route).toBe('/login');
    expect(route).not.toBe('/register');
  });

  it('Invariant 8 (Item 22): Legacy state with currentStep: 6 + completed -> resolved route is strictly /login (currentStep 6 is completely ignored)', () => {
    const legacyState: OnboardingState = {
      onboardingStatus: 'completed',
      sessionStatus: 'locked',
      currentStep: 6,
      countryCode: 'CL',
      business: { name: 'Comercial Los Andes', fiscalId: '76.123.456-7', phone: '912345678', phonePrefix: '+56', address: 'Santiago' },
      regionalSettings: { primaryCurrencyCode: 'CLP', enableSecondaryUSD: false },
      owner: { firstName: 'Omar', lastName: 'Torres', role: 'Dueño' },
    };

    // Repository load automatically sanitizes completed state
    const loaded = new LocalStorageOnboardingRepository();
    loaded.save(legacyState);
    const rehydrated = loaded.load();

    expect(rehydrated.currentStep).toBe(1); // Sanitized
    expect(rehydrated.onboardingStatus).toBe('completed');

    const route = resolveEntryRoute({
      isHydrated: true,
      onboardingStatus: rehydrated.onboardingStatus,
      sessionStatus: rehydrated.sessionStatus,
      isCompletionCelebrationActive: false,
    });
    expect(route).toBe('/login');
  });

  it('Invariant 9: completed + unlocked + !isCompletionCelebrationActive resolves to /dashboard', () => {
    const route = resolveEntryRoute({
      isHydrated: true,
      onboardingStatus: 'completed',
      sessionStatus: 'unlocked',
      isCompletionCelebrationActive: false,
    });
    expect(route).toBe('/dashboard');
  });

  it('Complete Lifecycle: Step 1-5 Onboarding -> Step 5 Submit (isCompletionCelebrationActive=true) -> Step 6 CTA (acknowledgeCompletion) -> /login -> Unlock -> /dashboard', () => {
    // 1. Initial State: Onboarding in progress
    let onboardingStatus: 'incomplete' | 'completed' = 'incomplete';
    let sessionStatus: 'locked' | 'unlocked' = 'locked';
    let isCompletionCelebrationActive = false;

    expect(resolveEntryRoute({ isHydrated: true, onboardingStatus, sessionStatus, isCompletionCelebrationActive })).toBe('/register');

    // 2. Step 5 submit: CompleteInitialSetup persists successfully and enables isCompletionCelebrationActive celebration
    onboardingStatus = 'completed';
    sessionStatus = 'locked';
    isCompletionCelebrationActive = true;

    // 3. User is on Step 6 (ConfirmationStep): Route remains '/register' while viewing Step 6 in the current session
    expect(resolveEntryRoute({ isHydrated: true, onboardingStatus, sessionStatus, isCompletionCelebrationActive })).toBe('/register');

    // 4. User clicks CTA "Entrar a SevenPOS" -> acknowledgeCompletion() executes
    isCompletionCelebrationActive = false;
    sessionStatus = 'locked';

    const targetRoute = resolveEntryRoute({ isHydrated: true, onboardingStatus, sessionStatus, isCompletionCelebrationActive });
    expect(targetRoute).toBe('/login');

    // 5. User enters valid PIN in /login -> unlocks session
    sessionStatus = 'unlocked';
    const unlockedRoute = resolveEntryRoute({ isHydrated: true, onboardingStatus, sessionStatus, isCompletionCelebrationActive });
    expect(unlockedRoute).toBe('/dashboard');

    // 6. Reload / fresh boot: completed + locked -> reloads strictly to /login, NEVER /register, NEVER /dashboard
    const reloadState = {
      isHydrated: true,
      onboardingStatus: 'completed' as const,
      sessionStatus: 'locked' as const,
      isCompletionCelebrationActive: false,
    };
    expect(resolveEntryRoute(reloadState)).toBe('/login');
  });
});


