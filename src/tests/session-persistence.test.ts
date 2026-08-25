import { describe, it, expect, beforeEach } from 'vitest';
import { BootApplication } from '../application/boot/BootApplication';
import { DatabaseManager } from '../infrastructure/database/DatabaseManager';
import { InMemoryBusinessRepository } from '../infrastructure/repositories/InMemoryBusinessRepository';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { InMemorySessionRepository } from '../infrastructure/repositories/InMemorySessionRepository';
import { WebCryptoPinVaultFallback } from '../infrastructure/security/WebCryptoPinVaultFallback';
import { resolveEntryRoute, normalizeProtectedPath } from '../application/routing/RouteResolver';
import { generateUuid } from '../domain/common/IdGenerator';
import { getCurrentUtcIsoString } from '../domain/common/Timestamp';
import { setupMockLocalStorage } from './setupMockStorage';

describe('Session Persistence & Boot Semantics (Hotfix AG-05.1A)', () => {
  let dbManager: DatabaseManager;
  let businessRepo: InMemoryBusinessRepository;
  let userRepo: InMemoryUserRepository;
  let pinVault: WebCryptoPinVaultFallback;
  let sessionRepo: InMemorySessionRepository;
  let businessId: string;
  let ownerId: string;

  beforeEach(async () => {
    setupMockLocalStorage();
    localStorage.clear();
    sessionStorage.clear();

    dbManager = new DatabaseManager();
    businessRepo = new InMemoryBusinessRepository();
    userRepo = new InMemoryUserRepository();
    pinVault = new WebCryptoPinVaultFallback();
    sessionRepo = new InMemorySessionRepository();

    businessId = generateUuid();
    ownerId = generateUuid();

    // Setup completed onboarding baseline
    await businessRepo.saveBusinessWithSettings(
      {
        id: businessId,
        name: 'Minimarket Don Pepe',
        countryCode: 'CL',
        createdAt: getCurrentUtcIsoString(),
        updatedAt: getCurrentUtcIsoString(),
      },
      {
        businessId,
        primaryCurrency: 'CLP',
        secondaryCurrencyEnabled: false,
        createdAt: getCurrentUtcIsoString(),
        updatedAt: getCurrentUtcIsoString(),
      }
    );

    await userRepo.saveUser({
      id: ownerId,
      businessId,
      firstName: 'José',
      role: 'OWNER',
      active: true,
      createdAt: getCurrentUtcIsoString(),
      updatedAt: getCurrentUtcIsoString(),
    });
  });

  describe('1. Browser & Frontend Reload Persistence', () => {
    it('preserves unlocked session status on reload when session is active', async () => {
      // User unlocks session
      await sessionRepo.saveSession({
        status: 'unlocked',
        unlockedUserId: ownerId,
        unlockedAt: new Date().toISOString(),
      });

      // Browser reloads (F5) -> BootApplication runs
      const bootService = new BootApplication(dbManager, businessRepo, userRepo, pinVault, sessionRepo);
      const result = await bootService.execute();

      expect(result.status).toBe('READY');
      expect(result.onboardingStatus).toBe('completed');
      expect(result.sessionStatus).toBe('unlocked');
    });

    it('preserves deep link route on reload when session is unlocked', () => {
      const targetRoute = resolveEntryRoute({
        isHydrated: true,
        onboardingStatus: 'completed',
        sessionStatus: 'unlocked',
        requestedPath: '/inventory',
      });

      expect(targetRoute).toBe('/inventory');
    });

    it('preserves /inventory/movements on reload when session is unlocked', () => {
      const targetRoute = resolveEntryRoute({
        isHydrated: true,
        onboardingStatus: 'completed',
        sessionStatus: 'unlocked',
        requestedPath: '/inventory/movements',
      });

      expect(targetRoute).toBe('/inventory/movements');
    });

    it('normalizes and preserves /products alias to /catalog/products on reload', () => {
      const targetRoute = resolveEntryRoute({
        isHydrated: true,
        onboardingStatus: 'completed',
        sessionStatus: 'unlocked',
        requestedPath: '/products',
      });

      expect(targetRoute).toBe('/catalog/products');
    });

    it('normalizes and preserves /categories alias to /catalog/categories on reload', () => {
      const targetRoute = resolveEntryRoute({
        isHydrated: true,
        onboardingStatus: 'completed',
        sessionStatus: 'unlocked',
        requestedPath: '/categories',
      });

      expect(targetRoute).toBe('/catalog/categories');
    });
  });

  describe('2. Fresh Native Process & Locked Boot Semantics', () => {
    it('locks session on fresh app start when session repository starts locked', async () => {
      // Fresh process: session repo has locked state
      await sessionRepo.clearSession();

      const bootService = new BootApplication(dbManager, businessRepo, userRepo, pinVault, sessionRepo);
      const result = await bootService.execute();

      expect(result.status).toBe('READY');
      expect(result.onboardingStatus).toBe('completed');
      expect(result.sessionStatus).toBe('locked');

      const route = resolveEntryRoute({
        isHydrated: true,
        onboardingStatus: result.onboardingStatus,
        sessionStatus: result.sessionStatus,
        requestedPath: '/inventory',
      });

      // Even if /inventory was requested, locked session redirects strictly to /login
      expect(route).toBe('/login');
    });
  });

  describe('3. Logout Lifecycle', () => {
    it('clears session repository on logout and forces /login on reload', async () => {
      // Initially unlocked
      await sessionRepo.saveSession({
        status: 'unlocked',
        unlockedUserId: ownerId,
      });

      // User performs logout -> clearSession()
      await sessionRepo.clearSession();

      // Page reloads
      const bootService = new BootApplication(dbManager, businessRepo, userRepo, pinVault, sessionRepo);
      const result = await bootService.execute();

      expect(result.sessionStatus).toBe('locked');
      const route = resolveEntryRoute({
        isHydrated: true,
        onboardingStatus: result.onboardingStatus,
        sessionStatus: result.sessionStatus,
      });
      expect(route).toBe('/login');
    });
  });

  describe('4. Hydration & Uncompleted Invariants', () => {
    it('returns loading when isHydrated is false without premature redirect', () => {
      const route = resolveEntryRoute({
        isHydrated: false,
        onboardingStatus: 'completed',
        sessionStatus: 'unlocked',
        requestedPath: '/inventory',
      });

      expect(route).toBe('loading');
    });

    it('forces /register when onboarding is incomplete even if session repository had stray data', async () => {
      localStorage.clear();
      const emptyBusinessRepo = new InMemoryBusinessRepository();
      const emptyUserRepo = new InMemoryUserRepository();
      await sessionRepo.saveSession({ status: 'unlocked', unlockedUserId: 'someone' });

      const bootService = new BootApplication(dbManager, emptyBusinessRepo, emptyUserRepo, pinVault, sessionRepo);
      const result = await bootService.execute();

      expect(result.onboardingStatus).toBe('incomplete');
      expect(result.sessionStatus).toBe('locked');

      const route = resolveEntryRoute({
        isHydrated: true,
        onboardingStatus: result.onboardingStatus,
        sessionStatus: result.sessionStatus,
      });

      expect(route).toBe('/register');
    });
  });

  describe('5. Path Normalization Matrix', () => {
    it('correctly maps all canonical application routes', () => {
      expect(normalizeProtectedPath('/dashboard')).toBe('/dashboard');
      expect(normalizeProtectedPath('/pos')).toBe('/pos');
      expect(normalizeProtectedPath('/sales')).toBe('/sales');
      expect(normalizeProtectedPath('/catalog/products')).toBe('/catalog/products');
      expect(normalizeProtectedPath('/products')).toBe('/catalog/products');
      expect(normalizeProtectedPath('/catalog/categories')).toBe('/catalog/categories');
      expect(normalizeProtectedPath('/categories')).toBe('/catalog/categories');
      expect(normalizeProtectedPath('/inventory')).toBe('/inventory');
      expect(normalizeProtectedPath('/stock')).toBe('/inventory');
      expect(normalizeProtectedPath('/inventory/movements')).toBe('/inventory/movements');
      expect(normalizeProtectedPath('/stock-adjustments')).toBe('/inventory/movements');
      expect(normalizeProtectedPath('/purchases/orders')).toBe('/purchases/orders');
      expect(normalizeProtectedPath('/unknown-path')).toBeNull();
    });
  });
});
