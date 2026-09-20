import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'fs';
import * as path from 'path';

describe('AG-16A Migration 0011 SQLite Fresh & Upgrade Lifecycle Tests', () => {
  const migrationsDir = path.resolve(process.cwd(), 'src-tauri/migrations');

  function getMigrationSql(versionNumber: number): string {
    const prefix = String(versionNumber).padStart(4, '0');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.startsWith(prefix));
    if (files.length === 0) {
      throw new Error(`Migration ${prefix} not found in ${migrationsDir}`);
    }
    return fs.readFileSync(path.join(migrationsDir, files[0]), 'utf8');
  }

  it('FRESH DB: applies 0001 through 0011 sequentially without error and produces valid schema', () => {
    const db = new DatabaseSync(':memory:');

    for (let i = 1; i <= 11; i++) {
      const sql = getMigrationSql(i);
      db.exec(sql);
    }

    const prodInfo = db.prepare('PRAGMA table_info(products);').all() as { name: string }[];
    const prodCols = prodInfo.map((c) => c.name);
    expect(prodCols).toContain('sale_mode');

    const saleItemsInfo = db.prepare('PRAGMA table_info(sale_items);').all() as { name: string; notnull: number }[];
    const saleItemsCols = saleItemsInfo.map((c) => c.name);
    expect(saleItemsCols).toContain('line_type');
    expect(saleItemsCols).toContain('sale_mode');
    expect(saleItemsCols).toContain('weight_grams');
    expect(saleItemsCols).toContain('product_id');

    // Verify product_id is nullable (notnull === 0)
    const prodIdCol = saleItemsInfo.find((c) => c.name === 'product_id');
    expect(prodIdCol?.notnull).toBe(0);
  });

  it('UPGRADE DB: preserves all historical rows, defaults, foreign keys, and indexes', () => {
    const db = new DatabaseSync(':memory:');

    // 1. Run migrations 0001 through 0010
    for (let i = 1; i <= 10; i++) {
      const sql = getMigrationSql(i);
      db.exec(sql);
    }

    // Seed business, user, product, sale, and 2 historical sale items
    db.prepare(`
      INSERT INTO businesses (id, name, country_code, created_at, updated_at)
      VALUES ('biz-01', 'Minimarket Don Pepe', 'CL', '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z');
    `).run();

    db.prepare(`
      INSERT INTO users (id, business_id, first_name, last_name, email, role, active, created_at, updated_at)
      VALUES ('usr-01', 'biz-01', 'Don', 'Pepe', 'donpepe@minimarket.cl', 'OWNER', 1, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z');
    `).run();

    db.prepare(`
      INSERT INTO products (id, business_id, name, base_unit, sale_price, active, created_at, updated_at)
      VALUES 
        ('prod-01', 'biz-01', 'Coca Cola 1.5L', 'UNIT', 2000, 1, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z'),
        ('prod-02', 'biz-01', 'Arroz 1kg', 'UNIT', 1200, 1, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z');
    `).run();

    db.prepare(`
      INSERT INTO sales (
        id, business_id, sale_number, sale_sequence, status, customer_name_snapshot,
        subtotal, discount_total, tax_total, total, currency_code, idempotency_key,
        created_by_user_id, created_by_name_snapshot, created_at, completed_at
      ) VALUES (
        'sale-01', 'biz-01', 'V-001', 1, 'COMPLETED', 'Consumidor final',
        5200, 0, 0, 5200, 'CLP', 'idem-01',
        'usr-01', 'Don Pepe', '2026-09-01T10:00:00Z', '2026-09-01T10:00:00Z'
      );
    `).run();

    db.prepare(`
      INSERT INTO sale_items (
        id, business_id, sale_id, product_id, product_name_snapshot, base_unit, presentation_factor,
        quantity, inventory_quantity_delta, unit_price, discount_total, line_total, created_at
      ) VALUES 
        ('item-01', 'biz-01', 'sale-01', 'prod-01', 'Coca Cola 1.5L', 'UNIT', 1, 2000, -2000, 2000, 0, 4000, '2026-09-01T10:00:00Z'),
        ('item-02', 'biz-01', 'sale-01', 'prod-02', 'Arroz 1kg', 'UNIT', 1, 1000, -1000, 1200, 0, 1200, '2026-09-01T10:00:00Z');
    `).run();

    const countBefore = (db.prepare('SELECT COUNT(*) as cnt FROM sale_items;').get() as { cnt: number }).cnt;
    expect(countBefore).toBe(2);

    // 2. Apply Migration 0011
    const sql11 = getMigrationSql(11);
    db.exec(sql11);

    // 3. Verify row count before = row count after
    const countAfter = (db.prepare('SELECT COUNT(*) as cnt FROM sale_items;').get() as { cnt: number }).cnt;
    expect(countAfter).toBe(countBefore);

    // 4. Verify historical row defaults
    const historicalRows = db.prepare('SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id ASC;').all('sale-01') as Record<string, unknown>[];
    expect(historicalRows.length).toBe(2);

    expect(historicalRows[0].id).toBe('item-01');
    expect(historicalRows[0].product_name_snapshot).toBe('Coca Cola 1.5L');
    expect(historicalRows[0].line_type).toBe('PRODUCT');
    expect(historicalRows[0].sale_mode).toBe('UNIT');
    expect(historicalRows[0].weight_grams).toBeNull();
    expect(historicalRows[0].line_total).toBe(4000);

    expect(historicalRows[1].id).toBe('item-02');
    expect(historicalRows[1].line_type).toBe('PRODUCT');
    expect(historicalRows[1].sale_mode).toBe('UNIT');
    expect(historicalRows[1].weight_grams).toBeNull();

    // 5. Verify product default sale_mode = 'UNIT'
    const prodRow = db.prepare('SELECT * FROM products WHERE id = ?').get('prod-01') as Record<string, unknown>;
    expect(prodRow.sale_mode).toBe('UNIT');

    // 6. Test inserting OPEN_AMOUNT item (product_id = NULL)
    db.prepare(`
      INSERT INTO sale_items (
        id, business_id, sale_id, product_id, product_name_snapshot, base_unit, presentation_factor,
        line_type, sale_mode, weight_grams, quantity, inventory_quantity_delta, unit_price, discount_total, line_total, created_at
      ) VALUES (
        'item-open-01', 'biz-01', 'sale-01', NULL, 'Servicio técnico', 'UNIT', 1,
        'OPEN_AMOUNT', 'UNIT', NULL, 1000, 0, 5000, 0, 5000, '2026-09-01T10:05:00Z'
      );
    `).run();

    const openRow = db.prepare('SELECT * FROM sale_items WHERE id = ?;').get('item-open-01') as Record<string, unknown>;
    expect(openRow.product_id).toBeNull();
    expect(openRow.line_type).toBe('OPEN_AMOUNT');
    expect(openRow.product_name_snapshot).toBe('Servicio técnico');
    expect(openRow.line_total).toBe(5000);

    // 7. Test inserting WEIGHT item (weight_grams = 260)
    db.prepare(`
      INSERT INTO sale_items (
        id, business_id, sale_id, product_id, product_name_snapshot, base_unit, presentation_factor,
        line_type, sale_mode, weight_grams, quantity, inventory_quantity_delta, unit_price, discount_total, line_total, created_at
      ) VALUES (
        'item-weight-01', 'biz-01', 'sale-01', 'prod-02', 'Almendras', 'KG', 1,
        'PRODUCT', 'WEIGHT', 260, 260, -260, 8990, 0, 2337, '2026-09-01T10:10:00Z'
      );
    `).run();

    const weightRow = db.prepare('SELECT * FROM sale_items WHERE id = ?;').get('item-weight-01') as Record<string, unknown>;
    expect(weightRow.sale_mode).toBe('WEIGHT');
    expect(weightRow.weight_grams).toBe(260);
    expect(weightRow.line_total).toBe(2337);

    // 8. Verify Indexes exist
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='sale_items';").all() as { name: string }[];
    const idxNames = indexes.map((i) => i.name);
    expect(idxNames).toContain('idx_sale_items_sale');
    expect(idxNames).toContain('idx_sale_items_prod');
    expect(idxNames).toContain('idx_sale_items_biz_line');
  });
});
