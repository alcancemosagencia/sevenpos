import { describe, it, expect, beforeEach } from 'vitest';
import { CloudAuthService, CloudUser, CloudBusinessMembership, BootstrapOwnerResult, CloudDeviceRecord, SignUpParams } from '../domain/auth/CloudAuthService';
import { CloudBusinessLinkStorage } from '../infrastructure/auth/CloudBusinessLinkStorage';
import { DeviceEnrollmentStorage } from '../infrastructure/auth/DeviceEnrollmentStorage';
import { InMemoryBusinessRepository } from '../infrastructure/repositories/InMemoryBusinessRepository';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { InMemoryProductRepository } from '../infrastructure/repositories/InMemoryProductRepository';
import { InMemorySaleRepository } from '../infrastructure/repositories/InMemorySaleRepository';
import { WebCryptoPinVaultFallback } from '../infrastructure/security/WebCryptoPinVaultFallback';
import { Product } from '../domain/catalog/Product';
import { Sale } from '../domain/sales/Sale';
import { User } from '../domain/user/User';

class MockCloudAuthService implements CloudAuthService {
  public mockUser: CloudUser | null = null;
  public mockMemberships: CloudBusinessMembership[] = [];
  public enrolledDevices: CloudDeviceRecord[] = [];
  public bootstrapCalls: unknown[] = [];

  async getUser(): Promise<CloudUser | null> {
    return this.mockUser;
  }

  async signInWithPassword(email: string): Promise<CloudUser> {
    this.mockUser = { id: 'usr-123', email, emailConfirmed: true };
    return this.mockUser;
  }

  async signUp(params: SignUpParams): Promise<{ user: CloudUser | null; requiresEmailVerification: boolean }> {
    this.mockUser = { id: 'usr-123', email: params.email, emailConfirmed: true };
    return { user: this.mockUser, requiresEmailVerification: false };
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
  }): Promise<BootstrapOwnerResult> {
    this.bootstrapCalls.push(params);
    const result: BootstrapOwnerResult = {
      userId: this.mockUser?.id || 'usr-123',
      email: this.mockUser?.email || 'owner@sevenpos.pro',
      firstName: params.firstName,
      lastName: params.lastName || '',
      businessId: 'cloud-biz-456',
      businessName: params.businessName,
      countryCode: params.countryCode || 'CL',
      role: 'OWNER',
      bootstrapCreated: true,
    };
    this.mockMemberships.push({
      businessId: result.businessId,
      businessName: result.businessName,
      countryCode: result.countryCode,
      role: 'OWNER',
      status: 'ACTIVE',
    });
    return result;
  }

  async enrollDevice(params: {
    businessId: string;
    deviceName: string;
    platform: string;
    deviceType: import('../domain/auth/DeviceEnrollment').DeviceType;
  }): Promise<CloudDeviceRecord> {
    const dev: CloudDeviceRecord = {
      id: 'dev-789',
      businessId: params.businessId,
      userId: this.mockUser?.id || 'usr-123',
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

describe('Cloud Identity — Existing PC Business Linking & Data Preservation', () => {
  let businessRepo: InMemoryBusinessRepository;
  let userRepo: InMemoryUserRepository;
  let productRepo: InMemoryProductRepository;
  let saleRepo: InMemorySaleRepository;
  let pinVault: WebCryptoPinVaultFallback;
  let cloudAuth: MockCloudAuthService;

  beforeEach(() => {
    DeviceEnrollmentStorage.clearEnrollment();
    CloudBusinessLinkStorage.clearLink();
    businessRepo = new InMemoryBusinessRepository();
    userRepo = new InMemoryUserRepository();
    productRepo = new InMemoryProductRepository();
    saleRepo = new InMemorySaleRepository();
    pinVault = new WebCryptoPinVaultFallback();
    cloudAuth = new MockCloudAuthService();
  });

  it('preserves existing local products, sales, and operational data when linking cloud account', async () => {
    // 1. Setup existing local business & owner on PC
    const localBizId = 'local-biz-pepe';
    await businessRepo.saveBusinessWithSettings(
      {
        id: localBizId,
        name: 'Minimarket Don Pepe Local',
        countryCode: 'CL',
        fiscalId: '76.123.456-7',
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
      id: 'usr-local-pepe',
      businessId: localBizId,
      role: 'OWNER',
      firstName: 'Don Pepe',
      email: 'pepe@local.cl',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await userRepo.saveUser(localOwner);
    await pinVault.savePinCredential(localOwner.id, '1234');

    // Add local product & sale
    const prod: Product = {
      id: 'prod-coca-1',
      businessId: localBizId,
      name: 'Coca Cola 1.5L',
      baseUnit: 'UNIT',
      salePrice: 2500,
      costPrice: 1800,
      sku: '7801234567890',
      featured: false,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await productRepo.save(prod);

    const sale: Sale = {
      id: 'sale-001',
      businessId: localBizId,
      saleSequence: 1,
      saleNumber: 'V-000001',
      createdByUserId: localOwner.id,
      createdByNameSnapshot: 'Don Pepe',
      customerNameSnapshot: 'Cliente Ocasional',
      subtotal: 2500,
      discountTotal: 0,
      taxTotal: 0,
      total: 2500,
      currencyCode: 'CLP',
      status: 'COMPLETED',
      idempotencyKey: 'idem-sale-1',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    await saleRepo.createSaleTransaction(sale, [], [], []);

    const productList = await productRepo.list({ businessId: localBizId });
    expect(productList.items.length).toBe(1);
    const saleList = await saleRepo.listSales(localBizId);
    expect(saleList.length).toBe(1);

    // 2. Perform Cloud Linking
    const signUpRes = await cloudAuth.signUp({
      email: 'pepe@sevenpos.pro',
      password: 'Password123!',
      firstName: 'Don Pepe',
    });
    expect(signUpRes.user).not.toBeNull();

    const bootstrapRes = await cloudAuth.bootstrapOwnerBusiness({
      firstName: 'Don Pepe',
      businessName: 'Minimarket Don Pepe Local',
      countryCode: 'CL',
    });

    // 3. Save CloudBusinessLink mapping local -> cloud
    CloudBusinessLinkStorage.saveLink({
      localBusinessId: localBizId,
      cloudBusinessId: bootstrapRes.businessId,
      cloudUserId: bootstrapRes.userId,
      linkedAt: new Date().toISOString(),
    });

    // 4. Enroll PC as desktop device
    const enrolledDev = await cloudAuth.enrollDevice({
      businessId: bootstrapRes.businessId,
      deviceName: 'Caja Principal - Windows',
      platform: 'Windows',
      deviceType: 'DESKTOP',
    });

    DeviceEnrollmentStorage.saveEnrollment({
      deviceId: enrolledDev.id,
      cloudBusinessId: enrolledDev.businessId,
      localBusinessId: localBizId,
      userId: enrolledDev.userId,
      accountEmail: 'pepe@sevenpos.pro',
      businessName: 'Minimarket Don Pepe Local',
      displayName: enrolledDev.deviceName,
      platform: enrolledDev.platform,
      deviceType: enrolledDev.deviceType,
      enrolledAt: enrolledDev.createdAt,
    });

    // 5. Verify Invariants:
    // a) localBusinessId remains unchanged in local operational tables
    const storedBiz = await businessRepo.getPrimaryBusiness();
    expect(storedBiz?.id).toBe(localBizId);
    expect(storedBiz?.id).not.toBe(bootstrapRes.businessId);

    // b) Products and sales are 100% intact
    const remainingProducts = await productRepo.list({ businessId: localBizId });
    expect(remainingProducts.items.length).toBe(1);
    expect(remainingProducts.items[0].product.name).toBe('Coca Cola 1.5L');

    const remainingSales = await saleRepo.listSales(localBizId);
    expect(remainingSales.length).toBe(1);
    expect(remainingSales[0].total).toBe(2500);

    // c) Existing PIN remains valid
    const isPinValid = await pinVault.verifyPin(localOwner.id, '1234');
    expect(isPinValid).toBe(true);

    // d) CloudBusinessLink is persistent
    const link = CloudBusinessLinkStorage.getLink();
    expect(link?.localBusinessId).toBe(localBizId);
    expect(link?.cloudBusinessId).toBe('cloud-biz-456');
    expect(link?.cloudUserId).toBe('usr-123');
  });
});
