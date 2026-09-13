import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';

describe('Migration 0010 - Cloud User Identity Invariant', () => {
  it('enforces UNIQUE (business_id, cloud_user_id) for non-null cloud users and allows multiple NULLs', () => {
    const db = new DatabaseSync(':memory:');

    // Setup base users table
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'CASHIER',
        active INTEGER NOT NULL DEFAULT 1,
        cloud_user_id TEXT,
        last_login_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX idx_users_business_cloud_user 
      ON users(business_id, cloud_user_id) 
      WHERE cloud_user_id IS NOT NULL;
    `);

    // 1. Insert multiple local users with cloud_user_id = NULL in same business -> ALLOWED
    db.prepare(`
      INSERT INTO users (id, business_id, first_name, role, active, cloud_user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('local-1', 'biz-alpha', 'Cajero 1', 'CASHIER', 1, null, '2026-09-12T00:00:00Z', '2026-09-12T00:00:00Z');

    db.prepare(`
      INSERT INTO users (id, business_id, first_name, role, active, cloud_user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('local-2', 'biz-alpha', 'Cajero 2', 'CASHIER', 1, null, '2026-09-12T00:00:00Z', '2026-09-12T00:00:00Z');

    const localUsers = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE business_id = ? AND cloud_user_id IS NULL').get('biz-alpha') as { cnt: number };
    expect(localUsers.cnt).toBe(2);

    // 2. Insert cloud user in business alpha -> ALLOWED
    db.prepare(`
      INSERT INTO users (id, business_id, first_name, role, active, cloud_user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('cloud-link-1', 'biz-alpha', 'Owner Alpha', 'OWNER', 1, 'auth0|usr_123', '2026-09-12T00:00:00Z', '2026-09-12T00:00:00Z');

    // 3. Attempt inserting same cloud user in same business -> MUST BE REJECTED
    expect(() => {
      db.prepare(`
        INSERT INTO users (id, business_id, first_name, role, active, cloud_user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('cloud-link-2', 'biz-alpha', 'Duplicate Cloud User', 'ADMIN', 1, 'auth0|usr_123', '2026-09-12T00:00:00Z', '2026-09-12T00:00:00Z');
    }).toThrow(/UNIQUE constraint failed/);

    // 4. Inserting same cloud user in a DIFFERENT business -> ALLOWED (Multi-tenant ownership)
    db.prepare(`
      INSERT INTO users (id, business_id, first_name, role, active, cloud_user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('cloud-link-3', 'biz-beta', 'Owner Beta', 'OWNER', 1, 'auth0|usr_123', '2026-09-12T00:00:00Z', '2026-09-12T00:00:00Z');

    const totalCloudUsers = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE cloud_user_id = ?').get('auth0|usr_123') as { cnt: number };
    expect(totalCloudUsers.cnt).toBe(2);
  });
});
