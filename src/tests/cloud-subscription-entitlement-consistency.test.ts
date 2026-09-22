import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CloudSubscriptionRepository } from '../infrastructure/repositories/CloudSubscriptionRepository';
import { EntitlementService } from '../application/subscription/EntitlementService';
import { DeviceEnrollmentStorage } from '../infrastructure/auth/DeviceEnrollmentStorage';
import { CloudBusinessLinkStorage } from '../infrastructure/auth/CloudBusinessLinkStorage';
import * as supabaseClientModule from '../infrastructure/cloud/supabaseClient';

interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>;
  auth: {
    getUser: ReturnType<typeof vi.fn>;
  };
}

describe('CloudSubscriptionRepository & Canonical Entitlement Consistency (PLATFORM-01B)', () => {
  let mockSupabase: MockSupabaseClient;
  let repo: CloudSubscriptionRepository;
  let entitlementService: EntitlementService;

  const validCloudBizId = '5b43a1b0-4198-4b94-a338-3f470f84cfd7';

  beforeEach(() => {
    DeviceEnrollmentStorage.clearEnrollment();
    CloudBusinessLinkStorage.clearLink();
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn(),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    };

    vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof supabaseClientModule.getSupabaseClient>
    );

    repo = new CloudSubscriptionRepository();
    entitlementService = new EntitlementService(repo);
  });

  it('resolves PRO ACTIVE plan directly when called with a valid cloud UUID', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              plan_code: 'PRO',
              status: 'ACTIVE',
              cancel_at_period_end: false,
              current_period_end: '2026-10-17T16:34:12+00:00',
              updated_at: '2026-09-18T02:12:31.566+00:00',
            },
            error: null,
          }),
        }),
      }),
    });

    const sub = await repo.getSubscription(validCloudBizId);
    expect(sub.plan).toBe('PRO');
    expect(sub.status).toBe('ACTIVE');
    expect(sub.source).toBe('CLOUD');

    // Verify EntitlementService unlocks PRO features
    const plan = await entitlementService.getPlan(validCloudBizId);
    expect(plan.code).toBe('PRO');
    expect(plan.name).toBe('SevenPOS Pro');

    const userLimit = await entitlementService.getLimit(validCloudBizId, 'users.active_operators');
    expect(userLimit.value).toBe(5); // 5 operators on PRO vs 1 on FREE

    const auditDecision = await entitlementService.can(validCloudBizId, 'analytics.advanced');
    expect(auditDecision.allowed).toBe(true);
  });

  it('resolves cloud UUID from DeviceEnrollmentStorage when businessId is primary-business', async () => {
    DeviceEnrollmentStorage.saveEnrollment({
      deviceId: 'dev-1',
      deviceType: 'WEB',
      displayName: 'Caja 1',
      platform: 'Windows',
      accountEmail: 'test@sevenpos.pro',
      userId: 'user-1',
      businessName: 'TestdeMP',
      cloudBusinessId: validCloudBizId,
      localBusinessId: 'local-1',
      enrolledAt: '2026-09-01T00:00:00Z',
    });

    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        plan_code: 'PRO',
        status: 'ACTIVE',
        cancel_at_period_end: false,
        current_period_end: '2026-10-17T16:34:12+00:00',
        updated_at: '2026-09-18T02:12:31.566+00:00',
      },
      error: null,
    });

    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    mockSupabase.from.mockReturnValue({ select: selectMock });

    const sub = await repo.getSubscription('primary-business');

    // Verified: query was sent with the resolved cloud UUID, not 'primary-business'
    expect(mockSupabase.from).toHaveBeenCalledWith('business_subscriptions');
    expect(eqMock).toHaveBeenCalledWith('business_id', validCloudBizId);
    expect(sub.plan).toBe('PRO');
    expect(sub.status).toBe('ACTIVE');
  });

  it('resolves cloud UUID from CloudBusinessLinkStorage when businessId is not a UUID', async () => {
    CloudBusinessLinkStorage.saveLink({
      cloudBusinessId: validCloudBizId,
      cloudUserId: 'user-1',
      localBusinessId: 'primary-business',
      linkedAt: '2026-09-01T00:00:00Z',
    });

    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        plan_code: 'PRO',
        status: 'ACTIVE',
        cancel_at_period_end: false,
        current_period_end: '2026-10-17T16:34:12+00:00',
        updated_at: '2026-09-18T02:12:31.566+00:00',
      },
      error: null,
    });

    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    mockSupabase.from.mockReturnValue({ select: selectMock });

    const sub = await repo.getSubscription('primary-business');
    expect(eqMock).toHaveBeenCalledWith('business_id', validCloudBizId);
    expect(sub.plan).toBe('PRO');
  });

  it('resolves cloud UUID from active session membership when local storage is empty', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-owner-123' } },
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'business_memberships') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { business_id: validCloudBizId },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'business_subscriptions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  plan_code: 'PRO',
                  status: 'ACTIVE',
                  cancel_at_period_end: false,
                  current_period_end: '2026-10-17T16:34:12+00:00',
                  updated_at: '2026-09-18T02:12:31.566+00:00',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const sub = await repo.getSubscription('primary-business');
    expect(sub.plan).toBe('PRO');
    expect(sub.status).toBe('ACTIVE');
  });

  it('safely defaults to FREE when no cloud UUID can be found', async () => {
    const sub = await repo.getSubscription('primary-business');
    expect(sub.plan).toBe('FREE');
    expect(sub.status).toBe('ACTIVE');
    expect(sub.source).toBe('LOCAL_FALLBACK');
    expect(sub.resolutionReason).toBe('NO_CLOUD_LINK');
  });

  it('marks resolutionReason as CONFIRMED_PRO for verified active pro', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              plan_code: 'PRO',
              status: 'ACTIVE',
              cancel_at_period_end: false,
              current_period_end: '2026-10-17T16:34:12+00:00',
              updated_at: '2026-09-18T02:12:31.566+00:00',
            },
            error: null,
          }),
        }),
      }),
    });

    const sub = await repo.getSubscription(validCloudBizId);
    expect(sub.plan).toBe('PRO');
    expect(sub.resolutionReason).toBe('CONFIRMED_PRO');
  });

  it('marks resolutionReason as CONFIRMED_FREE when cloud returns no subscription row', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    });

    const sub = await repo.getSubscription(validCloudBizId);
    expect(sub.plan).toBe('FREE');
    expect(sub.resolutionReason).toBe('CONFIRMED_FREE');
  });

  it('marks resolutionReason as RLS_DENIED when permission is denied', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '42501', message: 'permission denied for table business_subscriptions' },
          }),
        }),
      }),
    });

    const sub = await repo.getSubscription(validCloudBizId);
    expect(sub.plan).toBe('FREE');
    expect(sub.resolutionReason).toBe('RLS_DENIED');
    expect(sub.errorMessage).toContain('permission denied');
  });

  it('marks resolutionReason as LOAD_ERROR when cloud database query fails', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '500', message: 'Connection timeout' },
          }),
        }),
      }),
    });

    const sub = await repo.getSubscription(validCloudBizId);
    expect(sub.plan).toBe('FREE');
    expect(sub.resolutionReason).toBe('LOAD_ERROR');
    expect(sub.errorMessage).toContain('Connection timeout');
  });
});
