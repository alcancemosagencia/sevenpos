import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('AG-12 SQLite Schema 0009_audit.sql & Immutability Integrity Tests', () => {
  const migrationPath = path.resolve(process.cwd(), 'src-tauri/migrations/0009_audit.sql');
  const sqlContent = fs.readFileSync(migrationPath, 'utf8');

  it('declares business_id TEXT NOT NULL with FOREIGN KEY ... ON DELETE RESTRICT', () => {
    expect(sqlContent).toContain('business_id TEXT NOT NULL');
    expect(sqlContent).toContain('FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT');
    expect(sqlContent).not.toContain('FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE');
  });

  it('defines BEFORE UPDATE and BEFORE DELETE triggers with RAISE(ABORT, ...)', () => {
    expect(sqlContent).toContain('CREATE TRIGGER IF NOT EXISTS trg_audit_events_no_update');
    expect(sqlContent).toContain('BEFORE UPDATE ON audit_events');
    expect(sqlContent).toContain("SELECT RAISE(ABORT, 'audit_events are append-only and cannot be updated');");

    expect(sqlContent).toContain('CREATE TRIGGER IF NOT EXISTS trg_audit_events_no_delete');
    expect(sqlContent).toContain('BEFORE DELETE ON audit_events');
    expect(sqlContent).toContain("SELECT RAISE(ABORT, 'audit_events are append-only and cannot be deleted');");
  });

  it('contains all required query optimization indexes', () => {
    expect(sqlContent).toContain('idx_audit_biz_occurred');
    expect(sqlContent).toContain('idx_audit_biz_cat_occurred');
    expect(sqlContent).toContain('idx_audit_biz_type_occurred');
    expect(sqlContent).toContain('idx_audit_biz_actor_occurred');
    expect(sqlContent).toContain('idx_audit_biz_entity');
    expect(sqlContent).toContain('idx_audit_biz_correlation');
  });

  it('enforces canonical categories in CHECK constraint', () => {
    expect(sqlContent).toContain("CHECK(event_category IN ('AUTH', 'DEVICE', 'SALES', 'CASH', 'INVENTORY', 'CATALOG', 'PURCHASES', 'EXPENSES', 'CUSTOMERS', 'SECURITY', 'SYSTEM'))");
  });
});
