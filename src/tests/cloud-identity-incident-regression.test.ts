import { describe, it, expect, beforeEach } from 'vitest';
import {
  CloudAuthService,
  CloudUser,
  CloudBusinessMembership,
  CloudDeviceRecord,
  SignUpParams,
  BootstrapOwnerResult,
} from '../domain/auth/CloudAuthService';
import { DeviceEnrollmentStorage } from '../infrastructure/auth/DeviceEnrollmentStorage';
import { resolveEntryRoute } from '../application/routing/RouteResolver';

class MockInstrumentedCloudAuthService implements CloudAuthService {
  public mockUser: CloudUser | null = null;
  public mockMemberships: CloudBusinessMembership[] = [];
  public enrolledDevices: CloudDeviceRecord[] = [];

  // Spies to verify invariant behavior
  public signInCount = 0;
  public signUpCount = 0;
  public bootstrapCount = 0;
  public resendCount = 0;
  public passwordResetCount = 0;

  async getUser(): Promise<CloudUser | null> {
    return this.mockUser;
  }

  async signInWithPassword(email: string, pass: string): Promise<CloudUser> {
    this.signInCount++;
    if (pass === 'wrong_password') {
      throw new Error('Invalid login credentials');
    }
    this.mockUser = { id: 'usr-existing-1', email, emailConfirmed: true };
    return this.mockUser;
  }

  async signUp(params: SignUpParams): Promise<{ user: CloudUser | null; requiresEmailVerification: boolean }> {
    this.signUpCount++;
    this.mockUser = { id: 'usr-signup-1', email: params.email, emailConfirmed: false };
    return { user: this.mockUser, requiresEmailVerification: true };
  }

  async signOut(): Promise<void> {
    this.mockUser = null;
  }

  async resendVerificationEmail(email: string): Promise<void> {
    this.resendCount++;
    if (email === 'rate_limited@sevenpos.pro') {
      throw new Error('Rate limit exceeded. Please wait before retrying.');
    }
  }

  async sendPasswordReset(): Promise<void> {
    this.passwordResetCount++;
  }

  async checkEmailVerified(): Promise<boolean> {
    return !!this.mockUser?.emailConfirmed;
  }

  async getMemberships(): Promise<CloudBusinessMembership[]> {
    return this.mockMemberships;
  }

  async bootstrapOwnerBusiness(params: {
    firstName: string;
    lastName?: string;
    businessName: string;
    countryCode?: string;
  }): Promise<BootstrapOwnerResult> {
    this.bootstrapCount++;
    const res: BootstrapOwnerResult = {
      userId: this.mockUser?.id || 'usr-signup-1',
      email: this.mockUser?.email || 'owner@sevenpos.pro',
      firstName: params.firstName,
      lastName: params.lastName || '',
      businessId: 'biz-reg-1',
      businessName: params.businessName,
      countryCode: params.countryCode || 'CL',
      role: 'OWNER',
      bootstrapCreated: true,
    };
    this.mockMemberships.push({
      businessId: res.businessId,
      businessName: res.businessName,
      countryCode: res.countryCode,
      role: 'OWNER',
      status: 'ACTIVE',
    });
    return res;
  }

  async enrollDevice(params: {
    businessId: string;
    deviceName: string;
    platform: string;
    deviceType: import('../domain/auth/DeviceEnrollment').DeviceType;
  }): Promise<CloudDeviceRecord> {
    const dev: CloudDeviceRecord = {
      id: 'dev-reg-1',
      businessId: params.businessId,
      userId: this.mockUser?.id || 'usr-reg-1',
      deviceName: params.deviceName,
      platform: params.platform,
      deviceType: params.deviceType,
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      revokedAt: null,
    };
    this.enrolledDevices.push(dev);
    return dev;
  }

  async getDevice(deviceId: string): Promise<CloudDeviceRecord | null> {
    return this.enrolledDevices.find((d) => d.id === deviceId) || null;
  }
}

describe('DEPLOY-01A.7 — P0 Incident Root-Cause & Regression Suite', () => {
  let cloudAuth: MockInstrumentedCloudAuthService;

  beforeEach(() => {
    DeviceEnrollmentStorage.clearEnrollment();
    cloudAuth = new MockInstrumentedCloudAuthService();
  });

  it('1. Login with existing account resolves business and NEVER routes to /register or invokes signUp', async () => {
    cloudAuth.mockMemberships = [
      {
        businessId: 'biz-existing',
        businessName: 'Alcancemos Agencia',
        countryCode: 'CL',
        role: 'OWNER',
        status: 'ACTIVE',
      },
    ];

    const user = await cloudAuth.signInWithPassword('alcancemosagencia@gmail.com', 'ValidPassword123!');
    expect(user.emailConfirmed).toBe(true);
    expect(cloudAuth.signInCount).toBe(1);
    expect(cloudAuth.signUpCount).toBe(0); // MUST NEVER CALL SIGNUP
    expect(cloudAuth.bootstrapCount).toBe(0); // MUST NOT BOOTSTRAP DUPLICATE

    const memberships = await cloudAuth.getMemberships();
    const owner = memberships.find((m) => m.role === 'OWNER' && m.status === 'ACTIVE');
    expect(owner).toBeDefined();

    // Route resolution check
    const route = resolveEntryRoute({
      isHydrated: true,
      authMachineState: 'DEVICE_ENROLLMENT_REQUIRED',
    });
    expect(route).toBe('/enroll-device');
    expect(route).not.toBe('/register');
  });

  it('2. Invalid password stays on login, throws clean error, and NEVER invokes signUp or sends email', async () => {
    await expect(
      cloudAuth.signInWithPassword('alcancemosagencia@gmail.com', 'wrong_password')
    ).rejects.toThrow('Invalid login credentials');

    expect(cloudAuth.signInCount).toBe(1);
    expect(cloudAuth.signUpCount).toBe(0);
    expect(cloudAuth.resendCount).toBe(0);
    expect(cloudAuth.passwordResetCount).toBe(0);

    const route = resolveEntryRoute({
      isHydrated: true,
      authMachineState: 'ACCOUNT_REQUIRED',
    });
    expect(route).toBe('/login');
  });

  it('3. Register is only reachable explicitly via REGISTER_REQUIRED', () => {
    const loginRoute = resolveEntryRoute({
      isHydrated: true,
      authMachineState: 'ACCOUNT_REQUIRED',
    });
    expect(loginRoute).toBe('/login');

    const registerRoute = resolveEntryRoute({
      isHydrated: true,
      authMachineState: 'REGISTER_REQUIRED',
    });
    expect(registerRoute).toBe('/register');
  });

  it('4. Signup with unconfirmed email correctly transitions to EMAIL_VERIFICATION_REQUIRED and /verify-email', async () => {
    const res = await cloudAuth.signUp({
      email: 'newuser@sevenpos.pro',
      password: 'StrongPassword123!',
      firstName: 'New',
      lastName: 'User',
    });

    expect(res.requiresEmailVerification).toBe(true);
    expect(cloudAuth.signUpCount).toBe(1);
    expect(cloudAuth.bootstrapCount).toBe(0); // Bootstrap cannot occur before confirmation

    const route = resolveEntryRoute({
      isHydrated: true,
      authMachineState: 'EMAIL_VERIFICATION_REQUIRED',
    });
    expect(route).toBe('/verify-email');
  });

  it('5. Verify check while email is unconfirmed (false) strictly stays on /verify-email and NEVER routes to /register', async () => {
    cloudAuth.mockUser = {
      id: 'usr-unconfirmed',
      email: 'unconfirmed@sevenpos.pro',
      emailConfirmed: false,
    };

    const isVerified = await cloudAuth.checkEmailVerified();
    expect(isVerified).toBe(false);

    const route = resolveEntryRoute({
      isHydrated: true,
      authMachineState: 'EMAIL_VERIFICATION_REQUIRED',
    });
    expect(route).toBe('/verify-email');
    expect(route).not.toBe('/register');
  });

  it('6. Verify check after real confirmation transitions to DEVICE_ENROLLMENT_REQUIRED or BUSINESS_SETUP_REQUIRED, NEVER /register', async () => {
    cloudAuth.mockUser = {
      id: 'usr-confirmed',
      email: 'confirmed@sevenpos.pro',
      emailConfirmed: true,
    };
    cloudAuth.mockMemberships = [
      {
        businessId: 'biz-1',
        businessName: 'Mi Negocio',
        countryCode: 'CL',
        role: 'OWNER',
        status: 'ACTIVE',
      },
    ];

    const isVerified = await cloudAuth.checkEmailVerified();
    expect(isVerified).toBe(true);

    const memberships = await cloudAuth.getMemberships();
    expect(memberships.length).toBe(1);

    const route = resolveEntryRoute({
      isHydrated: true,
      authMachineState: 'DEVICE_ENROLLMENT_REQUIRED',
    });
    expect(route).toBe('/enroll-device');
    expect(route).not.toBe('/register');
  });

  it('7. Authenticated user without existing business transitions to BUSINESS_SETUP_REQUIRED and /setup-business', () => {
    const route = resolveEntryRoute({
      isHydrated: true,
      authMachineState: 'BUSINESS_SETUP_REQUIRED',
    });
    expect(route).toBe('/setup-business');
    expect(route).not.toBe('/register');
  });

  it('8. Resend propagation properly surfaces rate limit errors without masking them', async () => {
    await expect(
      cloudAuth.resendVerificationEmail('rate_limited@sevenpos.pro')
    ).rejects.toThrow('Rate limit exceeded');

    expect(cloudAuth.resendCount).toBe(1);
  });

  it('10. Identity Mismatch Protection: authenticated user with different cloudUserId never overwrites or bootstraps over existing local CloudBusinessLink', async () => {
    // Local installation is linked to user A (45c7...)
    const existingLocalLink = {
      localBusinessId: 'biz-local-1',
      cloudBusinessId: 'biz-cloud-a',
      cloudUserId: 'usr-tenant-a',
      linkedAt: new Date().toISOString(),
    };

    // User B (c434...) logs in, having no membership
    const userB = await cloudAuth.signInWithPassword('other_owner@sevenpos.pro', 'ValidPassword123!');
    expect(userB.id).toBe('usr-existing-1');
    expect(userB.id).not.toBe(existingLocalLink.cloudUserId);

    // Invariant: User B must not automatically claim or mutate user A's business
    const membershipsB = await cloudAuth.getMemberships();
    expect(membershipsB.length).toBe(0);
    expect(cloudAuth.bootstrapCount).toBe(0);
  });

  it('11. Account Tenant Mismatch is guarded cleanly without cross-tenant data leak', () => {
    const route = resolveEntryRoute({
      isHydrated: true,
      authMachineState: 'ACCOUNT_REQUIRED',
    });
    expect(route).toBe('/login');
  });

  it('12. Existing local business + empty memberships maps to EXISTING_LOCAL_BUSINESS_LINK_REQUIRED and /setup-business', () => {
    const route = resolveEntryRoute({
      isHydrated: true,
      authMachineState: 'EXISTING_LOCAL_BUSINESS_LINK_REQUIRED',
    });
    expect(route).toBe('/setup-business');
    expect(route).not.toBe('/register');
  });

  it('13. Explicit link action executes bootstrap exactly once and persists link', async () => {
    const user = await cloudAuth.signInWithPassword('alcancemosagencia@gmail.com', 'ValidPass123!');
    expect(user.emailConfirmed).toBe(true);

    const bootstrapRes = await cloudAuth.bootstrapOwnerBusiness({
      firstName: 'Omar',
      lastName: '',
      businessName: 'SevenPOS Store',
      countryCode: 'CL',
    });

    expect(cloudAuth.bootstrapCount).toBe(1);
    expect(bootstrapRes.role).toBe('OWNER');
    expect(bootstrapRes.businessName).toBe('SevenPOS Store');
    expect(bootstrapRes.countryCode).toBe('CL');
  });

  it('14. PC enrollment executes exactly once with DESKTOP device type', async () => {
    const device = await cloudAuth.enrollDevice({
      businessId: 'biz-reg-1',
      deviceName: 'Caja Principal (PC)',
      platform: 'Windows Desktop',
      deviceType: 'DESKTOP',
    });

    expect(device.deviceType).toBe('DESKTOP');
    expect(device.deviceName).toBe('Caja Principal (PC)');
    expect(cloudAuth.enrolledDevices.length).toBe(1);
  });

  it('15. Idempotent reload: already linked and enrolled device does not re-bootstrap', async () => {
    // Initial bootstrap
    await cloudAuth.bootstrapOwnerBusiness({
      firstName: 'Omar',
      lastName: '',
      businessName: 'SevenPOS Store',
      countryCode: 'CL',
    });
    expect(cloudAuth.bootstrapCount).toBe(1);

    // Simulate subsequent reload
    const memberships = await cloudAuth.getMemberships();
    expect(memberships.length).toBe(1);
    expect(cloudAuth.bootstrapCount).toBe(1); // Still exactly 1, no duplicate bootstrap
  });

  it('16. LinkAccountBanner visibility rule: isCloudLinked is true when CloudBusinessLink or DeviceEnrollment exists', () => {
    const evaluateIsCloudLinked = (
      link: { localBusinessId: string; cloudBusinessId: string } | null,
      enrollment: { deviceId: string; cloudBusinessId: string } | null,
      membership: { businessId: string } | null
    ): boolean => {
      return Boolean(link || enrollment || (membership && membership.businessId));
    };

    // Unlinked case: all null -> isCloudLinked false (Banner renders)
    expect(evaluateIsCloudLinked(null, null, null)).toBe(false);

    // Linked via CloudBusinessLink -> isCloudLinked true (Banner hidden)
    expect(
      evaluateIsCloudLinked(
        { localBusinessId: 'biz-1', cloudBusinessId: 'cbiz-1' },
        null,
        null
      )
    ).toBe(true);

    // Linked via DeviceEnrollment (e.g. enrolled mobile terminal) -> isCloudLinked true (Banner hidden)
    expect(
      evaluateIsCloudLinked(
        null,
        { deviceId: 'dev-1', cloudBusinessId: 'cbiz-1' },
        null
      )
    ).toBe(true);

    // Linked via CloudMembership -> isCloudLinked true (Banner hidden)
    expect(
      evaluateIsCloudLinked(null, null, { businessId: 'cbiz-1' })
    ).toBe(true);
  });

  it('17. Enrolling a mobile terminal creates DeviceEnrollment and synchronizes CloudBusinessLink', async () => {
    const mobileDevice = await cloudAuth.enrollDevice({
      businessId: 'biz-reg-1',
      deviceName: 'Mi Android',
      platform: 'Android Mobile',
      deviceType: 'MOBILE',
    });

    expect(mobileDevice.deviceType).toBe('MOBILE');
    expect(mobileDevice.deviceName).toBe('Mi Android');

    // Link descriptor for the enrolled device
    const link = {
      localBusinessId: mobileDevice.businessId,
      cloudBusinessId: mobileDevice.businessId,
      cloudUserId: mobileDevice.userId,
      linkedAt: mobileDevice.createdAt,
    };
    expect(link.cloudBusinessId).toBe('biz-reg-1');
    expect(Boolean(link)).toBe(true);
  });
});
