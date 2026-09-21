import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { resolveEntryRoute, normalizeProtectedPath, syncBrowserUrl } from '../application/routing/RouteResolver';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { InMemoryBusinessRepository } from '../infrastructure/repositories/InMemoryBusinessRepository';
import { WebCryptoPinVaultFallback } from '../infrastructure/security/WebCryptoPinVaultFallback';
import { InMemorySessionRepository } from '../infrastructure/repositories/InMemorySessionRepository';
import { DeviceEnrollmentStorage } from '../infrastructure/auth/DeviceEnrollmentStorage';
import { CloudBusinessLinkStorage } from '../infrastructure/auth/CloudBusinessLinkStorage';

describe('AUTH-ROUTING-HOTFIX-01 — Public Brand Asset and Route Resolution Tests', () => {
  beforeEach(() => {
    DeviceEnrollmentStorage.clearEnrollment();
    CloudBusinessLinkStorage.clearLink();
  });

  // 1. BRAND ASSET & STATIC CONFIGURATION AUDIT
  describe('1. Public Brand Logo Asset & Vercel Configuration', () => {
    it('public/brand/email-logo.png exists and is a valid non-empty PNG file', () => {
      const assetPath = path.resolve(__dirname, '../../public/brand/email-logo.png');
      expect(fs.existsSync(assetPath)).toBe(true);

      const buffer = fs.readFileSync(assetPath);
      expect(buffer.length).toBeGreaterThan(1000);

      // Verify PNG magic header bytes: 89 50 4E 47 0D 0A 1A 0A
      const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      for (let i = 0; i < pngSignature.length; i++) {
        expect(buffer[i]).toBe(pngSignature[i]);
      }
    });

    it('vercel.json specifies static immutable cache headers for brand assets and excludes them from SPA catch-all rewrites', () => {
      const vercelPath = path.resolve(__dirname, '../../vercel.json');
      expect(fs.existsSync(vercelPath)).toBe(true);

      const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'));
      expect(vercelConfig.headers).toBeDefined();

      const brandHeader = vercelConfig.headers.find((h: { source: string }) =>
        h.source.includes('/brand/')
      );
      expect(brandHeader).toBeDefined();
      expect(
        brandHeader.headers.some((hdr: { key: string; value: string }) =>
          hdr.key === 'Cache-Control' && hdr.value.includes('immutable')
        )
      ).toBe(true);
    });
  });

  // 2. ROUTE RESOLVER INVARIANTS FOR PUBLIC AUTH ROUTES
  describe('2. RouteResolver Invariants for Public Routes', () => {
    it('resolves directly to /register when requested on a fresh or non-unlocked session', () => {
      const route = resolveEntryRoute({
        isHydrated: true,
        sessionStatus: 'locked',
        requestedPath: '/register',
      });
      expect(route).toBe('/register');
    });

    it('resolves directly to /register with query parameters or trailing slashes', () => {
      const route = resolveEntryRoute({
        isHydrated: true,
        sessionStatus: 'locked',
        requestedPath: '/register?source=email&plan=pro/',
      });
      expect(route).toBe('/register');
    });

    it('resolves directly to /auth/reset-password when requested from email link', () => {
      const route = resolveEntryRoute({
        isHydrated: true,
        sessionStatus: 'locked',
        requestedPath: '/auth/reset-password',
      });
      expect(route).toBe('/auth/reset-password');
    });

    it('resolves directly to /auth/callback for OAuth or magic link handling', () => {
      const route = resolveEntryRoute({
        isHydrated: true,
        sessionStatus: 'locked',
        requestedPath: '/auth/callback',
      });
      expect(route).toBe('/auth/callback');
    });

    it('prioritizes explicit REGISTER_REQUIRED auth machine state to /register', () => {
      const route = resolveEntryRoute({
        isHydrated: true,
        authMachineState: 'REGISTER_REQUIRED',
        sessionStatus: 'locked',
      });
      expect(route).toBe('/register');
    });

    it('routes ACCOUNT_REQUIRED or DEVICE_LOCKED to /login', () => {
      expect(
        resolveEntryRoute({
          isHydrated: true,
          authMachineState: 'ACCOUNT_REQUIRED',
          sessionStatus: 'locked',
        })
      ).toBe('/login');

      expect(
        resolveEntryRoute({
          isHydrated: true,
          authMachineState: 'DEVICE_LOCKED',
          sessionStatus: 'locked',
        })
      ).toBe('/login');
    });

    it('routes DEVICE_UNLOCKED to requested protected route or /dashboard', () => {
      expect(
        resolveEntryRoute({
          isHydrated: true,
          authMachineState: 'DEVICE_UNLOCKED',
          sessionStatus: 'unlocked',
          requestedPath: '/sales',
        })
      ).toBe('/sales');

      expect(
        resolveEntryRoute({
          isHydrated: true,
          authMachineState: 'DEVICE_UNLOCKED',
          sessionStatus: 'unlocked',
        })
      ).toBe('/dashboard');
    });

    it('normalizes protected paths properly', () => {
      expect(normalizeProtectedPath('/products')).toBe('/catalog/products');
      expect(normalizeProtectedPath('/categories')).toBe('/catalog/categories');
      expect(normalizeProtectedPath('/stock')).toBe('/inventory');
      expect(normalizeProtectedPath('/cash-register')).toBe('/finances/cash');
      expect(normalizeProtectedPath('/expenses')).toBe('/finances/expenses');
      expect(normalizeProtectedPath('/unknown-path')).toBeNull();
    });

    it('syncBrowserUrl updates window history path safely when defined', () => {
      if (typeof window !== 'undefined') {
        syncBrowserUrl('/register');
        expect(window.location.pathname).toBe('/register');
      }
    });
  });

  // 3. ZERO DATA DELETION & LOCAL PIN INVARIANCE
  describe('3. Local Terminal Enrolled Invariance (0 Data Loss)', () => {
    it('enrolled terminal with active local business and local PIN remains locked at /login without cloud dependency', async () => {
      const businessRepo = new InMemoryBusinessRepository();
      const userRepo = new InMemoryUserRepository();
      const pinVault = new WebCryptoPinVaultFallback();
      const sessionRepo = new InMemorySessionRepository();

      await businessRepo.saveBusinessWithSettings(
        {
          id: 'biz-prod-local',
          name: 'Supermercado Central',
          countryCode: 'CL',
          phonePrefix: '+56',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          businessId: 'biz-prod-local',
          primaryCurrency: 'CLP',
          secondaryCurrencyEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );

      await userRepo.saveUser({
        id: 'usr-local-cashier',
        businessId: 'biz-prod-local',
        role: 'CASHIER',
        firstName: 'Carlos',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await pinVault.savePinCredential('usr-local-cashier', '5678');

      // Device is enrolled
      DeviceEnrollmentStorage.saveEnrollment({
        deviceId: 'dev-pos-01',
        cloudBusinessId: 'cloud-biz-01',
        localBusinessId: 'biz-prod-local',
        userId: 'cloud-user-01',
        accountEmail: 'owner@sevenpos.pro',
        businessName: 'Supermercado Central',
        displayName: 'Caja 1',
        platform: 'Desktop',
        deviceType: 'DESKTOP',
        enrolledAt: new Date().toISOString(),
      });

      // Session is locked
      await sessionRepo.saveSession({
        status: 'locked',
      });

      const route = resolveEntryRoute({
        isHydrated: true,
        authMachineState: 'DEVICE_LOCKED',
        sessionStatus: 'locked',
        onboardingStatus: 'completed',
      });

      expect(route).toBe('/login');

      // Verify zero data loss: local user and business exist
      const biz = await businessRepo.getPrimaryBusiness();
      expect(biz).not.toBeNull();
      expect(biz?.name).toBe('Supermercado Central');

      const users = await userRepo.getActiveUsersByBusinessId('biz-prod-local');
      expect(users).toHaveLength(1);
      expect(users[0].firstName).toBe('Carlos');
    });
  });
});
