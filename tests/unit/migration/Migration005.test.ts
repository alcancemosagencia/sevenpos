import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('Migration 0005_cash.sql Integrity Tests', () => {
  const migrationPath = resolve(process.cwd(), 'src-tauri/migrations/0005_cash.sql');

  it('verifies that 0005_cash.sql exists and contains valid DDL statements', () => {
    expect(existsSync(migrationPath)).toBe(true);
    const content = readFileSync(migrationPath, 'utf-8');

    // 1. Checks cash_registers table
    expect(content).toContain('CREATE TABLE IF NOT EXISTS cash_registers');
    expect(content).toContain('uq_cash_register_name UNIQUE (business_id, name)');

    // 2. Checks cash_sessions table and partial unique index
    expect(content).toContain('CREATE TABLE IF NOT EXISTS cash_sessions');
    expect(content).toContain('CREATE UNIQUE INDEX IF NOT EXISTS uq_active_cash_session_per_register');
    expect(content).toContain("WHERE status = 'OPEN'");

    // 3. Checks cash_movements table and sale cash partial index
    expect(content).toContain('CREATE TABLE IF NOT EXISTS cash_movements');
    expect(content).toContain('CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_movements_sale_cash');
    expect(content).toContain("WHERE reference_type = 'SALE' AND movement_type = 'SALE_CASH'");

    // 4. Checks ALTER TABLE sales
    expect(content).toContain('ALTER TABLE sales ADD COLUMN cash_session_id TEXT');
    expect(content).toContain('CREATE INDEX IF NOT EXISTS idx_sales_cash_session');

    // 5. Checks default cash register seed
    expect(content).toContain("INSERT OR IGNORE INTO cash_registers (id, business_id, name, active, created_at, updated_at)");
    expect(content).toContain("'Caja principal'");
  });
});
