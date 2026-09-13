import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'fs';
import * as path from 'path';

describe('AG-13B Migration 0010 SQLite Fresh & Upgrade Lifecycle Tests', () => {
  const migrationsDir = path.resolve(process.cwd(), 'src-tauri/migrations');

  function getMigrationSql(versionNumber: number): string {
    const prefix = String(versionNumber).padStart(4, '0');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.startsWith(prefix));
    if (files.length === 0) {
      throw new Error(`Migration ${prefix} not found in ${migrationsDir}`);
    }
    return fs.readFileSync(path.join(migrationsDir, files[0]), 'utf8');
  }

  it('FRESH DB: applies 0001 through 0010 sequentially without error and produces exact 11 columns', () => {
    const db = new DatabaseSync(':memory:');

    for (let i = 1; i <= 10; i++) {
      const sql = getMigrationSql(i);
      db.exec(sql);
    }

    const tableInfo = db.prepare('PRAGMA table_info(users);').all() as { name: string; type: string }[];
    const columnNames = tableInfo.map((c) => c.name);

    expect(columnNames).toContain('id');
    expect(columnNames).toContain('business_id');
    expect(columnNames).toContain('first_name');
    expect(columnNames).toContain('last_name');
    expect(columnNames).toContain('email');
    expect(columnNames).toContain('role');
    expect(columnNames).toContain('active');
    expect(columnNames).toContain('created_at');
    expect(columnNames).toContain('updated_at');
    expect(columnNames).toContain('cloud_user_id');
    expect(columnNames).toContain('last_login_at');
    expect(columnNames.length).toBe(11);
  });

  it('UPGRADE DB: applies 0001..0009, seeds legacy user, applies 0010, preserves legacy data and adds columns', () => {
    const db = new DatabaseSync(':memory:');

    // 1. Run migrations 1 to 9
    for (let i = 1; i <= 9; i++) {
      const sql = getMigrationSql(i);
      db.exec(sql);
    }

    // Verify initial columns before 0010
    const beforeInfo = db.prepare('PRAGMA table_info(users);').all() as { name: string }[];
    const beforeCols = beforeInfo.map((c) => c.name);
    expect(beforeCols).not.toContain('cloud_user_id');
    expect(beforeCols).not.toContain('last_login_at');

    // Seed a business and user under 0009 schema
    db.prepare(`
      INSERT INTO businesses (id, name, country_code, created_at, updated_at)
      VALUES ('biz-legacy-01', 'Tienda Antigua', 'CL', '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z');
    `).run();

    db.prepare(`
      INSERT INTO users (id, business_id, first_name, last_name, email, role, active, created_at, updated_at)
      VALUES ('usr-legacy-01', 'biz-legacy-01', 'Don', 'Pepe', 'pepe@antigua.cl', 'OWNER', 1, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z');
    `).run();

    // 2. Apply Migration 0010
    const sql10 = getMigrationSql(10);
    db.exec(sql10);

    // 3. Verify upgraded columns
    const afterInfo = db.prepare('PRAGMA table_info(users);').all() as { name: string }[];
    const afterCols = afterInfo.map((c) => c.name);
    expect(afterCols).toContain('cloud_user_id');
    expect(afterCols).toContain('last_login_at');

    // 4. Verify existing record is intact with null new columns
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get('usr-legacy-01') as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(row.first_name).toBe('Don');
    expect(row.last_name).toBe('Pepe');
    expect(row.email).toBe('pepe@antigua.cl');
    expect(row.role).toBe('OWNER');
    expect(row.active).toBe(1);
    expect(row.cloud_user_id).toBeNull();
    expect(row.last_login_at).toBeNull();

    // 5. Verify update on new columns works
    db.prepare('UPDATE users SET cloud_user_id = ?, last_login_at = ? WHERE id = ?')
      .run('cloud-user-123', '2026-09-12T12:00:00Z', 'usr-legacy-01');

    const updatedRow = db.prepare('SELECT * FROM users WHERE id = ?').get('usr-legacy-01') as Record<string, unknown>;
    expect(updatedRow.cloud_user_id).toBe('cloud-user-123');
    expect(updatedRow.last_login_at).toBe('2026-09-12T12:00:00Z');
  });
});
