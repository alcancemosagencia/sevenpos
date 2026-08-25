import { describe, it, expect } from 'vitest';
import { validateBusiness, Business } from '../domain/business/Business';
import { User, getUserDisplayName } from '../domain/user/User';
import { getCurrentUtcIsoString, isValidIsoTimestamp } from '../domain/common/Timestamp';
import { generateUuid } from '../domain/common/IdGenerator';

describe('Domain Models & Mappings (AG-03 Core)', () => {
  it('validates business correctly and allows nullable fiscal_id', () => {
    const validWithFiscal: Partial<Business> = {
      name: 'Supermercado Central',
      countryCode: 'CL',
      fiscalId: '76.123.456-7',
    };
    expect(validateBusiness(validWithFiscal).isValid).toBe(true);

    const validWithoutFiscal: Partial<Business> = {
      name: 'Bodega El Pana',
      countryCode: 'VE',
      fiscalId: null,
    };
    expect(validateBusiness(validWithoutFiscal).isValid).toBe(true);

    const invalidName: Partial<Business> = {
      name: '',
      countryCode: 'CO',
    };
    expect(validateBusiness(invalidName).isValid).toBe(false);
  });

  it('formats User display name and enforces canonical roles', () => {
    const owner: User = {
      id: generateUuid(),
      businessId: generateUuid(),
      firstName: 'Carlos',
      lastName: 'Mendoza',
      role: 'OWNER',
      active: true,
      createdAt: getCurrentUtcIsoString(),
      updatedAt: getCurrentUtcIsoString(),
    };

    expect(getUserDisplayName(owner)).toBe('Carlos Mendoza');
    expect(owner.role).toBe('OWNER');
  });

  it('generates valid RFC4122 UUID v4 and UTC ISO timestamps', () => {
    const id = generateUuid();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    const timestamp = getCurrentUtcIsoString();
    expect(isValidIsoTimestamp(timestamp)).toBe(true);
    expect(timestamp).toContain('T');
    expect(timestamp).toContain('Z');
  });
});
