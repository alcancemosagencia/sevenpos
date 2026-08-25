import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryPaymentMethodRepository } from '../../../src/infrastructure/repositories/InMemoryPaymentMethodRepository';
import { EnsureDefaultPaymentMethods } from '../../../src/application/sales/EnsureDefaultPaymentMethods';
import * as fs from 'fs';
import * as path from 'path';

describe('Sales Database Migration & Payment Methods (AG-06 Core)', () => {
  let paymentMethodRepo: InMemoryPaymentMethodRepository;
  let ensureDefaultPaymentMethods: EnsureDefaultPaymentMethods;
  const businessId = 'biz_test_migration';

  beforeEach(() => {
    paymentMethodRepo = new InMemoryPaymentMethodRepository();
    ensureDefaultPaymentMethods = new EnsureDefaultPaymentMethods(paymentMethodRepo);
  });

  it('verifies 0004_sales.sql migration file syntax and schema standards', () => {
    const migrationPath = path.resolve(__dirname, '../../../src-tauri/migrations/0004_sales.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);

    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

    // 1. Mandatory fix check: must use updated_at, NOT updatedAt
    expect(sqlContent).not.toContain('updatedAt');
    expect(sqlContent).toContain('updated_at');

    // 2. Table creation checks
    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS payment_methods');
    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS sales');
    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS sale_items');
    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS sale_payments');

    // 3. Index checks
    expect(sqlContent).toContain('CREATE INDEX IF NOT EXISTS idx_sales_biz_created');
    expect(sqlContent).toContain('CREATE INDEX IF NOT EXISTS idx_sale_items_sale');
    expect(sqlContent).toContain('CREATE INDEX IF NOT EXISTS idx_sale_payments_sale');
    expect(sqlContent).toContain('CREATE INDEX IF NOT EXISTS idx_movements_reference');

    // 4. Default payment methods seed check
    expect(sqlContent).toContain('\'CASH\'');
    expect(sqlContent).toContain('\'DEBIT_CARD\'');
    expect(sqlContent).toContain('\'CREDIT_CARD\'');
    expect(sqlContent).toContain('\'TRANSFER\'');
    expect(sqlContent).toContain('\'OTHER\'');
  });

  it('seeds default payment methods and verifies properties', async () => {
    await ensureDefaultPaymentMethods.execute(businessId);

    const activeMethods = await paymentMethodRepo.listActivePaymentMethods(businessId);
    expect(activeMethods).toHaveLength(5);

    const cash = activeMethods.find((m) => m.code === 'CASH');
    expect(cash).toBeDefined();
    expect(cash?.name).toBe('Efectivo');
    expect(cash?.allowsChange).toBe(true);
    expect(cash?.active).toBe(true);

    const debit = activeMethods.find((m) => m.code === 'DEBIT_CARD');
    expect(debit).toBeDefined();
    expect(debit?.allowsChange).toBe(false);

    const credit = activeMethods.find((m) => m.code === 'CREDIT_CARD');
    expect(credit).toBeDefined();
    expect(credit?.allowsChange).toBe(false);

    const transfer = activeMethods.find((m) => m.code === 'TRANSFER');
    expect(transfer).toBeDefined();
    expect(transfer?.allowsChange).toBe(false);

    const other = activeMethods.find((m) => m.code === 'OTHER');
    expect(other).toBeDefined();
    expect(other?.allowsChange).toBe(false);
  });

  it('is idempotent: running ensureDefaultPaymentMethods multiple times does not duplicate methods', async () => {
    await ensureDefaultPaymentMethods.execute(businessId);
    await ensureDefaultPaymentMethods.execute(businessId);
    await ensureDefaultPaymentMethods.execute(businessId);

    const activeMethods = await paymentMethodRepo.listActivePaymentMethods(businessId);
    expect(activeMethods).toHaveLength(5);
  });
});
