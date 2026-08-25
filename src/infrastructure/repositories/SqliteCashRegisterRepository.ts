import { DatabaseManager } from '../database/DatabaseManager';
import { CashRegister } from '../../domain/cash/CashRegister';
import { CashRegisterRepository } from '../../domain/cash/repositories/CashRegisterRepository';
import { InMemoryCashRegisterRepository } from './InMemoryCashRegisterRepository';
import { generateUuid } from '../../domain/common/IdGenerator';
import { getCurrentUtcIsoString } from '../../domain/common/Timestamp';

interface CashRegisterRow {
  id: string;
  business_id: string;
  name: string;
  active: number;
  created_at: string;
  updated_at: string;
}

export class SqliteCashRegisterRepository implements CashRegisterRepository {
  constructor(
    private dbManager: DatabaseManager,
    private fallbackRepo: InMemoryCashRegisterRepository
  ) {}

  private rowToEntity(r: CashRegisterRow): CashRegister {
    return {
      id: r.id,
      businessId: r.business_id,
      name: r.name,
      active: r.active === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async getDefaultRegister(businessId: string): Promise<CashRegister> {
    return this.ensureDefaultRegister(businessId);
  }

  async getById(id: string, businessId: string): Promise<CashRegister | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.getById(id, businessId);
    }
    const rows: CashRegisterRow[] = await db.select(
      'SELECT * FROM cash_registers WHERE id = ? AND business_id = ?',
      [id, businessId]
    );
    return rows.length > 0 ? this.rowToEntity(rows[0]) : null;
  }

  async list(businessId: string): Promise<CashRegister[]> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.list(businessId);
    }
    const rows: CashRegisterRow[] = await db.select(
      'SELECT * FROM cash_registers WHERE business_id = ? ORDER BY name ASC',
      [businessId]
    );
    return rows.map(this.rowToEntity);
  }

  async save(register: CashRegister): Promise<void> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.save(register);
    }
    await db.execute(
      `INSERT INTO cash_registers (id, business_id, name, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         active = excluded.active,
         updated_at = excluded.updated_at`,
      [
        register.id,
        register.businessId,
        register.name,
        register.active ? 1 : 0,
        register.createdAt,
        register.updatedAt,
      ]
    );
  }

  async ensureDefaultRegister(businessId: string): Promise<CashRegister> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.ensureDefaultRegister(businessId);
    }

    const rows: CashRegisterRow[] = await db.select(
      "SELECT * FROM cash_registers WHERE business_id = ? AND name = 'Caja principal' LIMIT 1",
      [businessId]
    );

    if (rows.length > 0) {
      return this.rowToEntity(rows[0]);
    }

    const now = getCurrentUtcIsoString();
    const newReg: CashRegister = {
      id: generateUuid(),
      businessId,
      name: 'Caja principal',
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    await this.save(newReg);
    return newReg;
  }
}
