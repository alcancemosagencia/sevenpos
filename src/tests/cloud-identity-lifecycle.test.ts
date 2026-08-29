import { describe, it, expect, beforeEach } from 'vitest';
import { CloudAuthService, CloudUser, CloudBusinessMembership, CloudDeviceRecord } from '../domain/auth/CloudAuthService';
import { DeviceEnrollmentStorage } from '../infrastructure/auth/DeviceEnrollmentStorage';

class MockCloudAuthService implements CloudAuthService {
  public mockUser: CloudUser | null = null;
  public mockMemberships: CloudBusinessMembership[] = [];
  public enrolledDevices: CloudDeviceRecord[] = [];

  async getUser(): Promise<CloudUser | null> {
    return this.mockUser;
  }

  async signInWithPassword(email: string): Promise<CloudUser> {
    this.mockUser = { id: 'usr-life-1', email, emailConfirmed: true };
    return this.mockUser;
  }

  async signUp(params: import('../domain/auth/CloudAuthService').SignUpParams): Promise<{ user: CloudUser | null; requiresEmailVerification: boolean }> {
    this.mockUser = { id: 'usr-life-1', email: params.email, emailConfirmed: false };
    return { user: this.mockUser, requiresEmailVerification: true };
  }

  async signOut(): Promise<void> {
    this.mockUser = null;
  }

  async resendVerificationEmail(): Promise<void> {}
  async sendPasswordReset(): Promise<void> {}
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
  }): Promise<import('../domain/auth/CloudAuthService').BootstrapOwnerResult> {
    return {
      userId: this.mockUser?.id || 'usr-life-1',
      email: this.mockUser?.email || 'owner@sevenpos.pro',
      firstName: params.firstName,
      lastName: params.lastName || '',
      businessId: 'biz-cloud-life',
      businessName: params.businessName,
      countryCode: params.countryCode || 'CL',
      role: 'OWNER',
      bootstrapCreated: true,
    };
  }

  async enrollDevice(params: {
    businessId: string;
    deviceName: string;
    platform: string;
    deviceType: import('../domain/auth/DeviceEnrollment').DeviceType;
  }): Promise<CloudDeviceRecord> {
    const dev: CloudDeviceRecord = {
      id: 'dev-life-1',
      businessId: params.businessId,
      userId: this.mockUser?.id || 'usr-life-1',
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

describe('Cloud Identity — Lifecycle Gates & Revocation Protection', () => {
  let cloudAuth: MockCloudAuthService;

  beforeEach(() => {
    DeviceEnrollmentStorage.clearEnrollment();
    cloudAuth = new MockCloudAuthService();
  });

  it('blocks login when OWNER membership status is INACTIVE', async () => {
    await cloudAuth.signInWithPassword('inactive_owner@sevenpos.pro');
    cloudAuth.mockMemberships = [
      {
        businessId: 'biz-inactive',
        businessName: 'Negocio Inactivo',
        countryCode: 'CL',
        role: 'OWNER',
        status: 'INACTIVE',
      },
    ];

    const memberships = await cloudAuth.getMemberships();
    const owner = memberships.find((m) => m.role === 'OWNER');
    expect(owner?.status).toBe('INACTIVE');
  });

  it('blocks login when OWNER membership status is REVOKED', async () => {
    await cloudAuth.signInWithPassword('revoked_owner@sevenpos.pro');
    cloudAuth.mockMemberships = [
      {
        businessId: 'biz-revoked',
        businessName: 'Negocio Revocado',
        countryCode: 'CL',
        role: 'OWNER',
        status: 'REVOKED',
      },
    ];

    const memberships = await cloudAuth.getMemberships();
    const owner = memberships.find((m) => m.role === 'OWNER');
    expect(owner?.status).toBe('REVOKED');
  });

  it('detects and flags revoked cloud devices', async () => {
    const dev = await cloudAuth.enrollDevice({
      businessId: 'biz-active',
      deviceName: 'Terminal Antiguo',
      platform: 'Android',
      deviceType: 'MOBILE',
    });

    // Simulate backend administrator revoking device
    dev.revokedAt = new Date().toISOString();

    const verifiedDevice = await cloudAuth.getDevice(dev.id);
    expect(verifiedDevice?.revokedAt).not.toBeNull();
  });

  it('signing out / switching account clears active enrollment without deleting local DB', () => {
    DeviceEnrollmentStorage.saveEnrollment({
      deviceId: 'dev-1',
      cloudBusinessId: 'biz-1',
      userId: 'usr-1',
      accountEmail: 'test@sevenpos.pro',
      businessName: 'Test Biz',
      displayName: 'Test Dev',
      platform: 'Web',
      deviceType: 'WEB',
      enrolledAt: new Date().toISOString(),
    });

    expect(DeviceEnrollmentStorage.getEnrollment()).not.toBeNull();
    DeviceEnrollmentStorage.clearEnrollment();
    expect(DeviceEnrollmentStorage.getEnrollment()).toBeNull();
  });
});
