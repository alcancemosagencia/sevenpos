import { describe, it, expect } from 'vitest';
import { User, getUserDisplayName, formatUserRole } from '../domain/user/User';

describe('AG-13B: Fast Operator Switch Contract', () => {
  const users: User[] = [
    {
      id: 'usr-1',
      businessId: 'biz-01',
      role: 'OWNER',
      firstName: 'Ana',
      lastName: 'Dueña',
      active: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'usr-2',
      businessId: 'biz-01',
      role: 'CASHIER',
      firstName: 'Carlos',
      lastName: 'Cajero',
      active: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
  ];

  it('formats operator names and roles for fast switch selection', () => {
    expect(getUserDisplayName(users[0])).toBe('Ana Dueña');
    expect(formatUserRole(users[0].role)).toBe('Dueño');
    expect(getUserDisplayName(users[1])).toBe('Carlos Cajero');
    expect(formatUserRole(users[1].role)).toBe('Cajero');
  });
});
