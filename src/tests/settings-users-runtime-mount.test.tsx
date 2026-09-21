import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { UsersSection } from '../features/settings/components/UsersSection';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { AuthContext, AuthContextType } from '../context/AuthContext';
import { OperationalSessionProvider } from '../context/OperationalSessionContext';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { User } from '../domain/user/User';
import { OnboardingState } from '../types/onboarding';

function createMockAuthContext(overrides?: Partial<AuthContextType>): AuthContextType {
  return {
    isHydrated: true,
    bootStatus: 'READY',
    retryBoot: vi.fn(),
    authMachineState: 'DEVICE_UNLOCKED',
    onboardingStatus: 'completed',
    sessionStatus: 'unlocked',
    isCompletionCelebrationActive: false,
    cloudUser: null,
    cloudMembership: null,
    deviceEnrollment: null,
    cloudBusinessLink: null,
    isCloudLinked: false,
    pendingEmailForVerification: '',
    state: {
      onboardingStatus: 'completed',
      sessionStatus: 'unlocked',
      currentStep: 6,
      countryCode: 'CL',
      business: {
        name: 'Minimarket Don Pepe',
        fiscalId: '76.123.456-7',
        phone: '912345678',
        phonePrefix: '+56',
        address: 'Av. Providencia 1234',
      },
      regionalSettings: {
        primaryCurrencyCode: 'CLP',
        enableSecondaryUSD: false,
      },
      owner: {
        firstName: 'José',
        lastName: 'Pérez',
        email: 'pepe@donpepe.cl',
        role: 'Dueño',
      },
    },
    updateDraftState: vi.fn(),
    activeBusinessName: 'Minimarket Don Pepe',
    activeOwnerName: 'José Pérez',
    activeCountryCode: 'CL',
    businessId: 'biz-test-01',
    signInWithEmail: vi.fn(),
    reauthenticateOwnerForBilling: vi.fn().mockResolvedValue({ success: true }),
    signUpWithEmail: vi.fn(),
    setupCloudBusiness: vi.fn(),
    checkEmailVerified: vi.fn(),
    verifyEmailOtp: vi.fn(),
    updatePendingVerificationEmail: vi.fn(),
    resendVerificationEmail: vi.fn(),
    sendPasswordReset: vi.fn(),
    enrollDevice: vi.fn(),
    setupNewDevicePin: vi.fn(),
    isLinkingModalOpen: false,
    openLinkingModal: vi.fn(),
    closeLinkingModal: vi.fn(),
    linkExistingLocalBusiness: vi.fn(),
    linkExistingLocalBusinessWithNewAccount: vi.fn(),
    linkExistingLocalBusinessWithExistingAccount: vi.fn(),
    completeOnboarding: vi.fn(),
    acknowledgeCompletion: vi.fn(),
    unlockWithPin: vi.fn(),
    lockSession: vi.fn(),
    resetOnboarding: vi.fn(),
    startRegistration: vi.fn(),
    goToLogin: vi.fn(),
    goToAccountLogin: vi.fn(),
    goToRegister: vi.fn(),
    switchLocalAccount: vi.fn(),
    signOutCloudAccount: vi.fn(),
    ...overrides,
  };
}

describe('Settings Users Section Runtime Mount & Error Resilience Tests', () => {
  let userRepo: InMemoryUserRepository;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
    userRepo = repositoryFactory.getUserRepository() as InMemoryUserRepository;
    userRepo.resetAll();
  });

  it('renders gracefully without crashing when users list is empty (Empty State)', () => {
    const authContext = createMockAuthContext();

    const html = renderToString(
      <AuthContext.Provider value={authContext}>
        <OperationalSessionProvider>
          <UsersSection />
        </OperationalSessionProvider>
      </AuthContext.Provider>
    );

    expect(html).toContain('Usuarios y permisos');
    expect(html).toContain('Controla quién puede usar SevenPOS');
    expect(html).toContain('Nuevo usuario');
    expect(html).toContain('Operadores');
    expect(html).toContain('Roles y permisos');
  });

  it('renders gracefully without crashing when state.owner is undefined / null', () => {
    const brokenStateAuth = createMockAuthContext({
      state: {
        onboardingStatus: 'completed',
        sessionStatus: 'unlocked',
        currentStep: 6,
        countryCode: 'CL',
        business: {
          name: 'Minimarket Don Pepe',
          fiscalId: '76.123.456-7',
          phone: '912345678',
          phonePrefix: '+56',
        },
        regionalSettings: {
          primaryCurrencyCode: 'CLP',
          enableSecondaryUSD: false,
        },
      } as unknown as OnboardingState, // Missing owner property completely
      activeOwnerName: '',
    });

    const html = renderToString(
      <AuthContext.Provider value={brokenStateAuth}>
        <OperationalSessionProvider>
          <UsersSection />
        </OperationalSessionProvider>
      </AuthContext.Provider>
    );

    expect(html).toContain('Usuarios y permisos');
    expect(html).toContain('Nuevo usuario');
  });

  it('renders existing users table with role and status badges', async () => {
    const testUser: User = {
      id: 'usr-101',
      businessId: 'biz-test-01',
      firstName: 'Carlos',
      lastName: 'Cajero',
      email: 'carlos@test.cl',
      role: 'CASHIER',
      active: true,
      lastLoginAt: '2026-09-12T10:00:00Z',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };
    await userRepo.saveUser(testUser);

    const authContext = createMockAuthContext();

    const html = renderToString(
      <AuthContext.Provider value={authContext}>
        <OperationalSessionProvider>
          <UsersSection />
        </OperationalSessionProvider>
      </AuthContext.Provider>
    );

    expect(html).toContain('Usuarios y permisos');
    expect(html).toContain('Operadores');
    expect(html).toContain('Roles y permisos');
  });
});
