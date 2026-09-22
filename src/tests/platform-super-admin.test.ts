import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isPlatformHost } from '../app/App';
import { PlatformAdminService } from '../platform/services/PlatformAdminService';
import { ManualProActivationParams } from '../platform/types/PlatformTypes';

const mockSupabase = {
  rpc: vi.fn(),
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
  },
};

vi.mock('../infrastructure/cloud/supabaseClient', () => ({
  getSupabaseClient: () => mockSupabase,
}));

describe('PLATFORM-01 — Super Admin Platform, Business Directory & Manual PRO Tests', () => {
  let service: PlatformAdminService;

  beforeEach(() => {
    mockSupabase.rpc.mockReset();
    mockSupabase.auth.getUser.mockReset();
    mockSupabase.auth.signInWithPassword.mockReset();
    mockSupabase.auth.updateUser.mockReset();
    mockSupabase.auth.signOut.mockReset();
    service = new PlatformAdminService();
  });

  // 1. HOST AND SUBDOMAIN ROUTING ISOLATION
  describe('1. Subdomain and Host-Based Routing Isolation', () => {
    it('detects platform host for platform.sevenpos.pro, /platform, and __platform=1', () => {
      if (typeof window !== 'undefined') {
        const originalLocation = window.location;
        
        // Test platform.sevenpos.pro
        Object.defineProperty(window, 'location', {
          value: { hostname: 'platform.sevenpos.pro', pathname: '/', search: '' },
          writable: true,
        });
        expect(isPlatformHost()).toBe(true);

        // Test local dev /platform
        Object.defineProperty(window, 'location', {
          value: { hostname: 'localhost', pathname: '/platform', search: '' },
          writable: true,
        });
        expect(isPlatformHost()).toBe(true);

        // Test normal customer domain sevenpos.pro
        Object.defineProperty(window, 'location', {
          value: { hostname: 'sevenpos.pro', pathname: '/pos', search: '' },
          writable: true,
        });
        expect(isPlatformHost()).toBe(false);

        // Restore
        Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
      }
    });
  });

  // 2. SUPER ADMIN AUTHORIZATION & RPC CONTRACTS
  describe('2. Super Admin Authorization & Mock Platform Service', () => {
    it('returns PlatformAdmin when user is an active SUPER_ADMIN', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          is_admin: true,
          id: 'admin-1',
          user_id: 'usr-admin-uuid',
          email: 'admin@sevenpos.pro',
          role: 'SUPER_ADMIN',
          created_at: '2026-09-21T10:00:00Z',
          last_login_at: '2026-09-21T14:00:00Z',
        },
        error: null,
      });

      const admin = await service.getCurrentAdmin();
      expect(admin).not.toBeNull();
      expect(admin?.role).toBe('SUPER_ADMIN');
      expect(admin?.email).toBe('admin@sevenpos.pro');
    });

    it('denies access when user is not in platform_admins or is inactive', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { is_admin: false, error: 'NOT_PLATFORM_ADMIN' },
        error: null,
      });

      const admin = await service.getCurrentAdmin();
      expect(admin).toBeNull();
    });

    it('denies access if rpc returns an authentication error', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'UNAUTHENTICATED' },
      });

      const admin = await service.getCurrentAdmin();
      expect(admin).toBeNull();
    });
  });

  // 3. DASHBOARD SAAS METRICS
  describe('3. Dashboard SaaS Health Metrics', () => {
    it('calculates plan and source distributions accurately without counting courtesy as paid revenue', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          total_businesses: 50,
          pro_active: 12,
          free_active: 38,
          manual_active: 4,
          mercadopago_active: 8,
          promotional_active: 0,
          internal_active: 0,
          country_distribution: [
            { country_code: 'CL', count: 35 },
            { country_code: 'VE', count: 10 },
            { country_code: 'CO', count: 5 },
          ],
          growth_trend: [
            { month: '2026-07', count: 10 },
            { month: '2026-08', count: 18 },
            { month: '2026-09', count: 22 },
          ],
          recent_activity: [
            {
              id: 'act-1',
              action: 'MANUAL_PRO_ACTIVATED',
              reason: 'TESTER',
              created_at: '2026-09-21T12:00:00Z',
              business_name: 'Minimarket Don Pepe',
              business_id: 'biz-1',
              admin_email: 'admin@sevenpos.pro',
            },
          ],
        },
        error: null,
      });

      const metrics = await service.getDashboardMetrics();
      expect(metrics.totalBusinesses).toBe(50);
      expect(metrics.proActive).toBe(12);
      expect(metrics.freeActive).toBe(38);
      expect(metrics.manualActive).toBe(4);
      expect(metrics.mercadopagoActive).toBe(8);
      expect(metrics.countryDistribution).toHaveLength(3);
      expect(metrics.growthTrend).toHaveLength(3);
      expect(metrics.recentActivity).toHaveLength(1);
    });
  });

  // 4. BUSINESS DIRECTORY & SERVER-SIDE PAGINATION
  describe('4. Business Directory & Search Filtering', () => {
    it('lists businesses with server pagination and multi-parameter filters', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          items: [
            {
              business_id: 'biz-1',
              business_name: 'Ferretería Central',
              country_code: 'CL',
              created_at: '2026-09-20T10:00:00Z',
              owner_user_id: 'usr-1',
              owner_email: 'owner@ferreteria.cl',
              owner_name: 'Juan Pérez',
              plan_code: 'PRO',
              subscription_status: 'ACTIVE',
              billing_source: 'MANUAL',
              manual_reason: 'TESTER',
              current_period_end: '2026-10-20T23:59:59Z',
              active_devices_count: 2,
              active_members_count: 3,
            },
          ],
          total_count: 1,
          page: 1,
          page_size: 25,
          total_pages: 1,
        },
        error: null,
      });

      const res = await service.listBusinesses({
        search: 'Ferretería',
        plan: 'PRO',
        source: 'MANUAL',
        country: 'CL',
        page: 1,
        pageSize: 25,
      });

      expect(res.items).toHaveLength(1);
      expect(res.items[0].businessName).toBe('Ferretería Central');
      expect(res.items[0].billingSource).toBe('MANUAL');
      expect(res.items[0].manualReason).toBe('TESTER');
      expect(res.totalCount).toBe(1);
    });
  });

  // 5. MANUAL PRO ACTIVATION & MERCADO PAGO PROTECTION
  describe('5. Manual PRO Activation & Business Lifecycle', () => {
    it('activates manual PRO successfully for courtesy/tester with 0 payment', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          business_id: 'biz-tester',
          subscription_id: 'sub-tester',
          contract_id: 'ctr-tester',
          plan_code: 'PRO',
          status: 'ACTIVE',
          billing_source: 'MANUAL',
        },
        error: null,
      });

      const params: ManualProActivationParams = {
        businessId: 'biz-tester',
        interval: 'MONTHLY',
        startsAt: '2026-09-21T00:00:00Z',
        periodEnd: '2026-10-21T23:59:59Z',
        reason: 'TESTER',
        notes: 'Cuenta beta ferretería familiar',
      };

      const res = await service.activateManualPro(params);
      expect(res.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('platform_activate_manual_pro', {
        p_business_id: 'biz-tester',
        p_interval: 'MONTHLY',
        p_starts_at: '2026-09-21T00:00:00Z',
        p_period_end: '2026-10-21T23:59:59Z',
        p_reason: 'TESTER',
        p_amount: 0,
        p_currency: 'CLP',
        p_payment_method: null,
        p_reference: null,
        p_notes: 'Cuenta beta ferretería familiar',
      });
    });

    it('rejects manual activation when business already has an active Mercado Pago PRO subscription', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'CANNOT_OVERWRITE_ACTIVE_MERCADO_PAGO_PRO: Business already has an active provider-backed subscription' },
      });

      const res = await service.activateManualPro({
        businessId: 'biz-mp',
        interval: 'MONTHLY',
        startsAt: '2026-09-21T00:00:00Z',
        periodEnd: '2026-10-21T23:59:59Z',
        reason: 'FRIEND_FAMILY',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('CANNOT_OVERWRITE_ACTIVE_MERCADO_PAGO_PRO');
    });

    it('terminates manual PRO and returns business to FREE while preserving history', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          business_id: 'biz-tester',
          plan_code: 'FREE',
          status: 'EXPIRED',
        },
        error: null,
      });

      const res = await service.endManualPro('biz-tester', 'Término de período de prueba');
      expect(res.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('platform_end_manual_pro', {
        p_business_id: 'biz-tester',
        p_reason: 'Término de período de prueba',
      });
    });
  });

  // 6. REGIONAL CONFIGURATION ADMINISTRATION (PLATFORM-01C)
  describe('6. Platform Regional Configuration Administration', () => {
    it('updates business country and currency successfully for valid combination (VE + VES)', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          business_id: 'biz-ve',
          country_code: 'VE',
          currency_code: 'VES',
        },
        error: null,
      });

      const res = await service.updateBusinessRegion({
        businessId: 'biz-ve',
        countryCode: 'VE',
        currencyCode: 'VES',
        reason: 'Corrección de registro inicial Venezuela',
        notes: 'Cliente de Barquisimeto',
      });

      expect(res.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('platform_update_business_region', {
        p_business_id: 'biz-ve',
        p_country_code: 'VE',
        p_currency_code: 'VES',
        p_reason: 'Corrección de registro inicial Venezuela',
        p_notes: 'Cliente de Barquisimeto',
      });
    });

    it('updates business country and currency successfully for VE + USD', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          business_id: 'biz-ve-usd',
          country_code: 'VE',
          currency_code: 'USD',
        },
        error: null,
      });

      const res = await service.updateBusinessRegion({
        businessId: 'biz-ve-usd',
        countryCode: 'VE',
        currencyCode: 'USD',
        reason: 'Precios en dólares',
      });

      expect(res.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('platform_update_business_region', {
        p_business_id: 'biz-ve-usd',
        p_country_code: 'VE',
        p_currency_code: 'USD',
        p_reason: 'Precios en dólares',
        p_notes: null,
      });
    });

    it('handles RPC rejection for invalid country/currency combination (e.g. VE + CLP)', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'INVALID_COUNTRY_CURRENCY_COMBINATION: CLP is not allowed for country VE' },
      });

      const res = await service.updateBusinessRegion({
        businessId: 'biz-invalid',
        countryCode: 'VE',
        currencyCode: 'CLP' as unknown as 'VES',
        reason: 'Prueba inválida',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('INVALID_COUNTRY_CURRENCY_COMBINATION');
    });
  });

  // 7. SUPER ADMIN SETTINGS & CHANGE PASSWORD (PLATFORM-01D)
  describe('7. Super Admin Settings & Change Password', () => {
    it('rejects password change when current password is wrong during re-authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'admin-usr-1', email: 'admin@sevenpos.pro' } },
        error: null,
      });

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const res = await service.changePassword({
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewSecurePassword2026@',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('La contraseña actual no es correcta.');
      expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
    });

    it('changes password successfully when current password is verified', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'admin-usr-1', email: 'admin@sevenpos.pro' } },
        error: null,
      });

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: { id: 'admin-usr-1' }, session: {} },
        error: null,
      });

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: { id: 'admin-usr-1' } },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });

      const res = await service.changePassword({
        currentPassword: 'OldAdminPassword123!',
        newPassword: 'NewSuperAdmin2026#',
      });

      expect(res.success).toBe(true);
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'admin@sevenpos.pro',
        password: 'OldAdminPassword123!',
      });
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'NewSuperAdmin2026#',
      });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('platform_log_password_changed');
    });

    it('handles session missing or expired error safely', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const res = await service.changePassword({
        currentPassword: 'AnyPassword123!',
        newPassword: 'NewPassword12345!',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('Sesión no válida o expirada.');
    });

    it('handles Supabase updateUser errors with natural Spanish copy', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'admin-usr-1', email: 'admin@sevenpos.pro' } },
        error: null,
      });

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: { id: 'admin-usr-1' }, session: {} },
        error: null,
      });

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Database error updating password' },
      });

      const res = await service.changePassword({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword12345!',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('No pudimos actualizar la contraseña. Inténtalo nuevamente.');
    });
  });
});

