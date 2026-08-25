import { Supplier, CreateSupplierDto, UpdateSupplierDto } from '../../domain/purchases/Supplier';
import { SupplierRepository } from '../../domain/purchases/repositories/SupplierRepository';
import { DatabaseManager } from '../database/DatabaseManager';
import { generateUUID } from '../../domain/common/IdGenerator';
import { getCurrentTimestamp } from '../../domain/common/Timestamp';

interface SupplierRow {
  id: string;
  business_id: string;
  name: string;
  tax_id: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export class SqliteSupplierRepository implements SupplierRepository {
  constructor(
    private dbManager: DatabaseManager,
    private fallbackRepo: SupplierRepository
  ) {}

  private rowToEntity(r: SupplierRow): Supplier {
    return {
      id: r.id,
      businessId: r.business_id,
      name: r.name,
      taxId: r.tax_id,
      contactName: r.contact_name,
      phone: r.phone,
      email: r.email,
      address: r.address,
      notes: r.notes,
      active: r.active === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async findById(businessId: string, id: string): Promise<Supplier | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.findById(businessId, id);
    }
    const rows = await db.select<SupplierRow[]>(
      'SELECT * FROM suppliers WHERE business_id = ? AND id = ?',
      [businessId, id]
    );
    return rows.length > 0 ? this.rowToEntity(rows[0]) : null;
  }

  async findByName(businessId: string, name: string): Promise<Supplier | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.findByName(businessId, name);
    }
    const rows = await db.select<SupplierRow[]>(
      'SELECT * FROM suppliers WHERE business_id = ? AND LOWER(name) = LOWER(?)',
      [businessId, name.trim()]
    );
    return rows.length > 0 ? this.rowToEntity(rows[0]) : null;
  }

  async list(businessId: string, includeInactive: boolean = false): Promise<Supplier[]> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.list(businessId, includeInactive);
    }
    let sql = 'SELECT * FROM suppliers WHERE business_id = ?';
    const params: (string | number)[] = [businessId];
    if (!includeInactive) {
      sql += ' AND active = 1';
    }
    sql += ' ORDER BY name ASC';
    const rows = await db.select<SupplierRow[]>(sql, params);
    return rows.map((r) => this.rowToEntity(r));
  }

  async create(businessId: string, dto: CreateSupplierDto): Promise<Supplier> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.create(businessId, dto);
    }
    const now = getCurrentTimestamp();
    const id = generateUUID();
    await db.execute(
      `INSERT INTO suppliers (
        id, business_id, name, tax_id, contact_name, phone, email, address, notes, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        id,
        businessId,
        dto.name,
        dto.taxId || null,
        dto.contactName || null,
        dto.phone || null,
        dto.email || null,
        dto.address || null,
        dto.notes || null,
        now,
        now,
      ]
    );
    return {
      id,
      businessId,
      name: dto.name,
      taxId: dto.taxId || null,
      contactName: dto.contactName || null,
      phone: dto.phone || null,
      email: dto.email || null,
      address: dto.address || null,
      notes: dto.notes || null,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  async update(businessId: string, id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.update(businessId, id, dto);
    }
    const current = await this.findById(businessId, id);
    if (!current) {
      throw new Error('Proveedor no encontrado.');
    }
    const now = getCurrentTimestamp();
    const updated: Supplier = {
      ...current,
      name: dto.name !== undefined ? dto.name : current.name,
      taxId: dto.taxId !== undefined ? dto.taxId : current.taxId,
      contactName: dto.contactName !== undefined ? dto.contactName : current.contactName,
      phone: dto.phone !== undefined ? dto.phone : current.phone,
      email: dto.email !== undefined ? dto.email : current.email,
      address: dto.address !== undefined ? dto.address : current.address,
      notes: dto.notes !== undefined ? dto.notes : current.notes,
      updatedAt: now,
    };

    await db.execute(
      `UPDATE suppliers SET
        name = ?, tax_id = ?, contact_name = ?, phone = ?, email = ?, address = ?, notes = ?, updated_at = ?
      WHERE business_id = ? AND id = ?`,
      [
        updated.name,
        updated.taxId,
        updated.contactName,
        updated.phone,
        updated.email,
        updated.address,
        updated.notes,
        now,
        businessId,
        id,
      ]
    );
    return updated;
  }

  async deactivate(businessId: string, id: string): Promise<void> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.deactivate(businessId, id);
    }
    const now = getCurrentTimestamp();
    await db.execute(
      'UPDATE suppliers SET active = 0, updated_at = ? WHERE business_id = ? AND id = ?',
      [now, businessId, id]
    );
  }

  async activate(businessId: string, id: string): Promise<void> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.activate(businessId, id);
    }
    const now = getCurrentTimestamp();
    await db.execute(
      'UPDATE suppliers SET active = 1, updated_at = ? WHERE business_id = ? AND id = ?',
      [now, businessId, id]
    );
  }
}
