import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { PinLoginPage } from '../features/auth/PinLoginPage';
import { SubscriptionPage } from '../pages/SubscriptionPage';
import { AuthContext, AuthContextType } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { CountryProvider } from '../context/CountryContext';
import {
  getBillingCapability,
  buildSalesWhatsAppUrl,
} from '../domain/billing/CountryBillingConfig';

// Mock storage before anything imports
const store = new Map<string, string>();
if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.getItem !== 'function') {
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    length: 0,
    key: () => null,
  } as unknown as Storage;
}

// Mock dependencies
vi.mock('../infrastructure/cloud/supabaseClient', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    functions: {
      invoke: vi.fn(),
    },
  })),
}));

vi.mock('../infrastructure/billing/BillingApiClient', () => ({
  billingApiClient: {
    getSubscriptionStatus: vi.fn(),
    getPricePreview: vi.fn(),
    createBillingIntent: vi.fn(),
    cancelSubscription: vi.fn(),
  },
}));

vi.mock('../infrastructure/repositories/RepositoryFactory', () => ({
  repositoryFactory: {
    getUsageService: vi.fn(() => ({
      getUsageOverview: vi.fn().mockResolvedValue({
        plan: 'FREE',
        products: { current: 15, limit: 100, percentage: 15, label: 'Productos activos' },
        customers: { current: 10, limit: 50, percentage: 20, label: 'Clientes registrados' },
        users: { current: 1, limit: 1, percentage: 100, label: 'Usuarios y operadores' },
        salesMilestone: { currentMonthlySales: 120 },
        historyWindow: { displayLabel: '7 días de historial' },
      }),
    })),
    getSubscriptionRepository: vi.fn(() => ({
      getSubscription: vi.fn().mockResolvedValue({
        businessId: 'biz-1',
        plan: 'FREE',
        status: 'ACTIVE',
        source: 'CLOUD',
        updatedAt: new Date().toISOString(),
      }),
    })),
  },
}));

const mockAuthContextValue = (overrides?: Partial<AuthContextType>): AuthContextType => ({
  isHydrated: true,
  bootStatus: 'READY',
  bootError: undefined,
  retryBoot: vi.fn(),
  authMachineState: 'DEVICE_LOCKED',
  onboardingStatus: 'completed',
  sessionStatus: 'locked',
  isCompletionCelebrationActive: false,
  cloudUser: null,
  cloudMembership: null,
  deviceEnrollment: null,
  cloudBusinessLink: null,
  isCloudLinked: false,
  pendingEmailForVerification: '',
  state: {
    business: { name: 'Almacén Don Mario', fiscalId: '76123456-7' },
    countryCode: 'CL',
    owner: { firstName: 'Mario', lastName: 'Gómez', role: 'Administrador' },
  } as unknown as AuthContextType['state'],
  updateDraftState: vi.fn(),
  activeBusinessName: 'Almacén Don Mario',
  activeOwnerName: 'Mario Gómez',
  activeCountryCode: 'CL',
  businessId: 'biz-test-123',
  signInWithEmail: vi.fn(),
  reauthenticateOwnerForBilling: vi.fn(),
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
});

describe('AG-15D-01: Login CTA Buttons', () => {
  it('renders Regístrate and Cambiar sesión buttons with valid testids and labels on PinLoginPage', () => {
    const authVal = mockAuthContextValue();

    const html = renderToString(
      <ThemeProvider>
        <AuthContext.Provider value={authVal}>
          <PinLoginPage />
        </AuthContext.Provider>
      </ThemeProvider>
    );

    expect(html).toContain('data-testid="pin-login-register-btn"');
    expect(html).toContain('data-testid="pin-login-switch-account-btn"');
    expect(html).toContain('Regístrate');
    expect(html).toContain('Cambiar sesión');
  });
});

describe('AG-15D-01: Country Capabilities & WhatsApp Link Generation', () => {
  it('configures Chile with Mercado Pago primary and WhatsApp secondary fallback', () => {
    const cap = getBillingCapability('CL');
    expect(cap.primaryMode).toBe('MERCADO_PAGO');
    expect(cap.supportedModes).toContain('MERCADO_PAGO');
    expect(cap.supportedModes).toContain('SALES_ASSISTED');
  });

  it('configures Venezuela with Sales Assisted only (0 Mercado Pago CTAs)', () => {
    const cap = getBillingCapability('VE');
    expect(cap.primaryMode).toBe('SALES_ASSISTED');
    expect(cap.supportedModes).toEqual(['SALES_ASSISTED']);
    expect(cap.supportedModes).not.toContain('MERCADO_PAGO');
  });

  it('generates WhatsApp Sales CTA URL with business name and country metadata without token leakage', () => {
    const url = buildSalesWhatsAppUrl({
      businessName: 'Almacén Don Mario',
      countryName: 'Chile',
      interval: 'MONTHLY',
    });

    expect(url).toContain('https://wa.me/');
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('Almacén Don Mario');
    expect(decoded).toContain('Chile');
    expect(decoded).toContain('Mensual');
    expect(decoded).not.toContain('Bearer');
    expect(decoded).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });
});

describe('AG-15D-01: Subscription Page - Chile vs Venezuela vs Pro & Monochrome Rendering', () => {
  it('renders Chile FREE business with Mercado Pago primary and WhatsApp fallback', () => {
    const authVal = mockAuthContextValue();
    const html = renderToString(
      <CountryProvider initialCountry="CL">
        <AuthContext.Provider value={authVal}>
          <SubscriptionPage />
        </AuthContext.Provider>
      </CountryProvider>
    );

    expect(html).toContain('Continuar con Mercado Pago');
    expect(html).toContain('Hablar con Ventas');
    expect(html).toContain('Pago seguro procesado por Mercado Pago');
    // Ensure no amber or yellow classes in rendered output
    expect(html).not.toContain('bg-amber-500');
    expect(html).not.toContain('text-amber-600');
  });

  it('renders Venezuela FREE business with 0 Mercado Pago CTAs and assisted onboarding message', () => {
    const authVal = mockAuthContextValue();
    const html = renderToString(
      <CountryProvider initialCountry="VE">
        <AuthContext.Provider value={authVal}>
          <SubscriptionPage />
        </AuthContext.Provider>
      </CountryProvider>
    );

    expect(html).not.toContain('Continuar con Mercado Pago');
    expect(html).toContain('Contactar a Ventas por WhatsApp');
    expect(html).toContain('Activación asistida para Venezuela');
    expect(html).toContain('Te ayudaremos con la activación de SevenPOS Pro');
  });
});
