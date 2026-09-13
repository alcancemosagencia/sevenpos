import { describe, it, expect } from 'vitest';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { SqliteUserRepository } from '../infrastructure/repositories/SqliteUserRepository';
import { DatabaseManager } from '../infrastructure/database/DatabaseManager';
import { User, normalizeUserRole } from '../domain/user/User';

describe('RBAC - Invalid Role Not Persistable Invariant', () => {
  it('prevents saving or updating a user with INVALID role in InMemoryUserRepository', async () => {
    const repo = new InMemoryUserRepository();
    const invalidUser: User = {
      id: 'user-invalid-1',
      businessId: 'biz-1',
      firstName: 'Invalid User',
      role: 'INVALID',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await expect(repo.saveUser(invalidUser)).rejects.toThrow(/Cannot persist user with invalid role/);
    await expect(repo.updateUser(invalidUser)).rejects.toThrow(/Cannot persist user with invalid role/);
  });

  it('prevents saving or updating a user with INVALID role in SqliteUserRepository', async () => {
    const dbManager = new DatabaseManager();
    const repo = new SqliteUserRepository(dbManager);
    const invalidUser: User = {
      id: 'user-invalid-2',
      businessId: 'biz-1',
      firstName: 'Invalid Sqlite User',
      role: 'INVALID',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await expect(repo.saveUser(invalidUser)).rejects.toThrow(/Cannot persist user with invalid role/);
    await expect(repo.updateUser(invalidUser)).rejects.toThrow(/Cannot persist user with invalid role/);
  });

  it('ensures normalizeUserRole only returns valid canonical roles (OWNER, ADMIN, CASHIER)', () => {
    expect(normalizeUserRole('OWNER')).toBe('OWNER');
    expect(normalizeUserRole('ADMIN')).toBe('ADMIN');
    expect(normalizeUserRole('CASHIER')).toBe('CASHIER');
    expect(normalizeUserRole('INVALID')).toBeNull();
    expect(normalizeUserRole('UNKNOWN')).toBeNull();
    expect(normalizeUserRole('')).toBeNull();
  });
});
