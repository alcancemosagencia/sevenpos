import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryBusinessRepository } from '../infrastructure/repositories/InMemoryBusinessRepository';
import { SettingsService } from '../application/settings/SettingsService';
import { PinVault } from '../domain/auth/PinVault';

class MockPinVault implements PinVault {
  private pins: Map<string, string> = new Map();

  constructor() {
    this.pins.set('usr-test-01', '1234');
  }

  async savePinCredential(userId: string, pin: string): Promise<void> {
    this.pins.set(userId, pin);
  }

  async verifyPin(userId: string, pin: string): Promise<boolean> {
    return this.pins.get(userId) === pin;
  }

  async hasPinCredential(userId: string): Promise<boolean> {
    return this.pins.has(userId);
  }

  async resetVault(): Promise<void> {
    this.pins.clear();
  }
}

describe('AG-13: Security PIN Change & Zero Secret Leakage', () => {
  let businessRepo: InMemoryBusinessRepository;
  let pinVault: MockPinVault;
  let settingsService: SettingsService;

  beforeEach(() => {
    businessRepo = new InMemoryBusinessRepository();
    pinVault = new MockPinVault();
    settingsService = new SettingsService(businessRepo, pinVault);
  });

  it('successfully updates PIN when current PIN is valid and new PIN is 4 digits', async () => {
    const res = await settingsService.changePin(
      'usr-test-01',
      {
        currentPin: '1234',
        newPin: '5678',
        confirmPin: '5678',
      },
      {
        userId: 'usr-test-01',
        userName: 'Admin User',
        businessId: 'biz-01',
        deviceId: 'dev-01',
      }
    );

    expect(res.success).toBe(true);
    expect(await pinVault.verifyPin('usr-test-01', '5678')).toBe(true);
    expect(await pinVault.verifyPin('usr-test-01', '1234')).toBe(false);
  });

  it('rejects update if current PIN is incorrect', async () => {
    const res = await settingsService.changePin(
      'usr-test-01',
      {
        currentPin: '0000',
        newPin: '5678',
        confirmPin: '5678',
      },
      {
        userId: 'usr-test-01',
        userName: 'Admin User',
        businessId: 'biz-01',
      }
    );

    expect(res.success).toBe(false);
    expect(res.error).toBe('El PIN actual es incorrecto.');
  });

  it('rejects update if new PIN is not exactly 4 digits', async () => {
    const res = await settingsService.changePin(
      'usr-test-01',
      {
        currentPin: '1234',
        newPin: '12345',
        confirmPin: '12345',
      },
      {
        userId: 'usr-test-01',
        userName: 'Admin User',
        businessId: 'biz-01',
      }
    );

    expect(res.success).toBe(false);
    expect(res.error).toContain('4 dígitos numéricos');
  });

  it('rejects update if confirmation PIN does not match new PIN', async () => {
    const res = await settingsService.changePin(
      'usr-test-01',
      {
        currentPin: '1234',
        newPin: '5678',
        confirmPin: '9999',
      },
      {
        userId: 'usr-test-01',
        userName: 'Admin User',
        businessId: 'biz-01',
      }
    );

    expect(res.success).toBe(false);
    expect(res.error).toContain('no coincide');
  });
});
