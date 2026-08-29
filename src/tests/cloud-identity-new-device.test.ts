import { describe, it, expect, beforeEach } from 'vitest';
import { CloudAuthService, CloudUser, CloudBusinessMembership, CloudDeviceRecord, SignUpParams } from '../domain/auth/CloudAuthService';
import { DeviceEnrollmentStorage } from '../infrastructure/auth/DeviceEnrollmentStorage';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { InMemoryBusinessRepository } from '../infrastructure/repositories/InMemoryBusinessRepository';
import { WebCryptoPinVaultFallback } from '../infrastructure/security/WebCryptoPinVaultFallback';
import { User } from '../domain/user/User';

class MockCloudAuthService implements CloudAuthService {
  public mockUser: CloudUser | null = null;
  public mockMemberships: CloudBusinessMembership[] = [];
  public enrolledDevices: CloudDeviceRecord[] = [];

  async getUser(): Promise<CloudUser | null> {
    return this.mockUser;
  }

  async signInWithPassword(email: string, pass: string): Promise<CloudUser> {
    if (pass === 'wrong_password') {
      throw new Error('Invalid login credentials');
    }
    this.mockUser = { id: 'usr-phone-1', email, emailConfirmed: true };
    return this.mockUser;
  }

  async signUp(params: SignUpParams): Promise<{ user: CloudUser | null; requiresEmailVerification: boolean }> {
    this.mockUser = { id: 'usr-phone-1', email: params.email, emailConfirmed: false };
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
      userId: this.mockUser?.id || 'usr-phone-1',
      email: this.mockUser?.email || 'owner@sevenpos.pro',
      firstName: params.firstName,
      lastName: params.lastName || '',
      businessId: 'biz-phone-cloud',
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
      id: 'dev-mobile-1',
      businessId: params.businessId,
      userId: this.mockUser?.id || 'usr-phone-1',
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

describe('Cloud Identity — New Device Enrollment & Second Visit PIN Flow', () => {
  let cloudAuth: MockCloudAuthService;
  let userRepo: InMemoryUserRepository;
  let businessRepo: InMemoryBusinessRepository;
  let pinVault: WebCryptoPinVaultFallback;

  beforeEach(() => {
    DeviceEnrollmentStorage.clearEnrollment();
    cloudAuth = new MockCloudAuthService();
    userRepo = new InMemoryUserRepository();
    businessRepo = new InMemoryBusinessRepository();
    pinVault = new WebCryptoPinVaultFallback();
  });

  it('new device requires email/password, enrolls mobile device, sets local PIN, and second visit uses PIN', async () => {
    // 1. First Visit: No local enrollment exists
    expect(DeviceEnrollmentStorage.getEnrollment()).toBeNull();

    // 2. Reject bad password
    await expect(cloudAuth.signInWithPassword('owner@sevenpos.pro', 'wrong_password')).rejects.toThrow(
      'Invalid login credentials'
    );

    // 3. Successful Sign In on New Phone
    const user = await cloudAuth.signInWithPassword('owner@sevenpos.pro', 'CorrectPassword123!');
    expect(user.email).toBe('owner@sevenpos.pro');
    expect(user.emailConfirmed).toBe(true);

    // 4. Resolve existing cloud membership
    cloudAuth.mockMemberships = [
      {
        businessId: 'biz-cloud-123',
        businessName: 'Minimarket Don Pepe',
        countryCode: 'CL',
        role: 'OWNER',
        status: 'ACTIVE',
      },
    ];
    const memberships = await cloudAuth.getMemberships();
    expect(memberships.length).toBe(1);
    expect(memberships[0].status).toBe('ACTIVE');

    // 5. Enroll Mobile Device
    const cloudDevice = await cloudAuth.enrollDevice({
      businessId: memberships[0].businessId,
      deviceName: 'Mi iPhone 15',
      platform: 'iOS',
      deviceType: 'MOBILE',
    });

    DeviceEnrollmentStorage.saveEnrollment({
      deviceId: cloudDevice.id,
      cloudBusinessId: cloudDevice.businessId,
      userId: cloudDevice.userId,
      accountEmail: user.email,
      businessName: memberships[0].businessName,
      displayName: cloudDevice.deviceName,
      platform: cloudDevice.platform,
      deviceType: cloudDevice.deviceType,
      enrolledAt: cloudDevice.createdAt,
    });

    // 6. Create Local PIN for this Mobile Terminal
    const localBizId = 'biz-phone-local';
    await businessRepo.saveBusinessWithSettings(
      {
        id: localBizId,
        name: memberships[0].businessName,
        countryCode: 'CL',
        phonePrefix: '+56',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        businessId: localBizId,
        primaryCurrency: 'CLP',
        secondaryCurrencyEnabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );

    const localOwner: User = {
      id: 'usr-phone-local-owner',
      businessId: localBizId,
      role: 'OWNER',
      firstName: 'Don Pepe',
      email: user.email,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await userRepo.saveUser(localOwner);
    await pinVault.savePinCredential(localOwner.id, '4321');

    // 7. Second Visit (App restart on the same mobile device):
    const cachedEnrollment = DeviceEnrollmentStorage.getEnrollment();
    expect(cachedEnrollment).not.toBeNull();
    expect(cachedEnrollment?.displayName).toBe('Mi iPhone 15');
    expect(cachedEnrollment?.deviceType).toBe('MOBILE');

    // Verifies directly with PIN (no password prompt required)
    const isPinValid = await pinVault.verifyPin(localOwner.id, '4321');
    expect(isPinValid).toBe(true);

    const isWrongPinValid = await pinVault.verifyPin(localOwner.id, '9999');
    expect(isWrongPinValid).toBe(false);
  });
});
