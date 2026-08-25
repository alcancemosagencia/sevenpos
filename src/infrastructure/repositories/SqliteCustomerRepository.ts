import {
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto,
  DuplicateCustomerMatch,
  normalizeCustomerDocument,
  normalizeCustomerPhone,
  normalizeCustomerEmail,
} from '../../domain/customers/Customer';
import {
  CustomerRepository,
  ListCustomersOptions,
} from '../../domain/customers/repositories/CustomerRepository';
import { DatabaseManager } from '../database/DatabaseManager';
import { generateUUID } from '../../domain/common/IdGenerator';
import { getCurrentTimestamp } from '../../domain/common/Timestamp';
import { logger } from '../logging/Logger';

interface CustomerRow {
  id: string;
  business_id: string;
  name: string;
  last_name: string | null;
  document_type: string | null;
  document_number: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export class SqliteCustomerRepository implements CustomerRepository {
  constructor(
    private dbManager: DatabaseManager,
    private fallbackRepo: CustomerRepository
  ) {}

  private rowToEntity(r: CustomerRow): Customer {
    return {
      id: r.id,
      businessId: r.business_id,
      name: r.name,
      lastName: r.last_name,
      documentType: r.document_type,
      documentNumber: r.document_number,
      phone: r.phone,
      email: r.email,
      address: r.address,
      notes: r.notes,
      active: r.active === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async findById(businessId: string, id: string): Promise<Customer | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.findById(businessId, id);

    const rows = await db.select<CustomerRow[]>(
      'SELECT * FROM customers WHERE business_id = ? AND id = ?',
      [businessId, id]
    );
    if (rows.length === 0) return null;
    return this.rowToEntity(rows[0]);
  }

  async findByDocument(businessId: string, documentNumber: string): Promise<Customer | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.findByDocument(businessId, documentNumber);

    const rows = await db.select<CustomerRow[]>(
      'SELECT * FROM customers WHERE business_id = ? AND document_number = ?',
      [businessId, documentNumber]
    );
    if (rows.length === 0) return null;
    return this.rowToEntity(rows[0]);
  }

  async list(businessId: string, options?: ListCustomersOptions): Promise<Customer[]> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.list(businessId, options);

    let sql = 'SELECT * FROM customers WHERE business_id = ?';
    const params: (string | number)[] = [businessId];

    if (!options?.includeInactive) {
      sql += ' AND active = 1';
    }

    if (options?.search) {
      const q = `%${options.search.trim()}%`;
      sql += ' AND (name LIKE ? OR last_name LIKE ? OR document_number LIKE ? OR phone LIKE ? OR email LIKE ?)';
      params.push(q, q, q, q, q);
    }

    sql += ' ORDER BY name ASC, last_name ASC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
      if (options?.offset) {
        sql += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const rows = await db.select<CustomerRow[]>(sql, params);
    return rows.map((r) => this.rowToEntity(r));
  }

  async search(businessId: string, query: string, limit: number = 20): Promise<Customer[]> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.search(businessId, query, limit);

    const q = `%${query.trim()}%`;
    const sql = `
      SELECT * FROM customers
      WHERE business_id = ? AND active = 1
        AND (name LIKE ? OR last_name LIKE ? OR document_number LIKE ? OR phone LIKE ? OR email LIKE ?)
      ORDER BY name ASC
      LIMIT ?
    `;
    const rows = await db.select<CustomerRow[]>(sql, [businessId, q, q, q, q, q, limit]);
    return rows.map((r) => this.rowToEntity(r));
  }

  async checkDuplicates(
    businessId: string,
    dto: { documentNumber?: string | null; phone?: string | null; email?: string | null },
    excludeCustomerId?: string
  ): Promise<DuplicateCustomerMatch[]> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.checkDuplicates(businessId, dto, excludeCustomerId);

    const matches: DuplicateCustomerMatch[] = [];
    const allCustomers = await this.list(businessId, { includeInactive: true });

    const normDoc = normalizeCustomerDocument(dto.documentNumber);
    const normPhone = normalizeCustomerPhone(dto.phone);
    const normEmail = normalizeCustomerEmail(dto.email);

    for (const c of allCustomers) {
      if (excludeCustomerId && c.id === excludeCustomerId) continue;

      if (normDoc && normalizeCustomerDocument(c.documentNumber) === normDoc) {
        matches.push({ field: 'document', customer: c, matchedValue: c.documentNumber || '' });
      }
      if (normPhone && normalizeCustomerPhone(c.phone) === normPhone) {
        matches.push({ field: 'phone', customer: c, matchedValue: c.phone || '' });
      }
      if (normEmail && normalizeCustomerEmail(c.email) === normEmail) {
        matches.push({ field: 'email', customer: c, matchedValue: c.email || '' });
      }
    }

    return matches;
  }

  async create(businessId: string, dto: CreateCustomerDto): Promise<Customer> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.create(businessId, dto);

    const now = getCurrentTimestamp();
    const id = generateUUID();

    const sql = `
      INSERT INTO customers (
        id, business_id, name, last_name, document_type, document_number,
        phone, email, address, notes, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `;
    const params = [
      id,
      businessId,
      dto.name.trim(),
      dto.lastName?.trim() || null,
      dto.documentType?.trim() || null,
      dto.documentNumber?.trim() || null,
      dto.phone?.trim() || null,
      dto.email?.trim() || null,
      dto.address?.trim() || null,
      dto.notes?.trim() || null,
      now,
      now,
    ];

    try {
      await db.execute(sql, params);
      const created = await this.findById(businessId, id);
      if (!created) throw new Error('Error al recuperar cliente recién creado.');
      return created;
    } catch (err) {
      logger.error('SqliteCustomerRepository', 'Failed to create customer', { error: String(err) });
      throw err;
    }
  }

  async update(businessId: string, id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.update(businessId, id, dto);

    const existing = await this.findById(businessId, id);
    if (!existing) throw new Error(`Cliente ${id} no encontrado.`);

    const now = getCurrentTimestamp();
    const updated: Customer = {
      ...existing,
      name: dto.name !== undefined ? dto.name.trim() : existing.name,
      lastName: dto.lastName !== undefined ? (dto.lastName?.trim() || null) : existing.lastName,
      documentType: dto.documentType !== undefined ? (dto.documentType?.trim() || null) : existing.documentType,
      documentNumber: dto.documentNumber !== undefined ? (dto.documentNumber?.trim() || null) : existing.documentNumber,
      phone: dto.phone !== undefined ? (dto.phone?.trim() || null) : existing.phone,
      email: dto.email !== undefined ? (dto.email?.trim() || null) : existing.email,
      address: dto.address !== undefined ? (dto.address?.trim() || null) : existing.address,
      notes: dto.notes !== undefined ? (dto.notes?.trim() || null) : existing.notes,
      active: dto.active !== undefined ? dto.active : existing.active,
      updatedAt: now,
    };

    const sql = `
      UPDATE customers SET
        name = ?, last_name = ?, document_type = ?, document_number = ?,
        phone = ?, email = ?, address = ?, notes = ?, active = ?, updated_at = ?
      WHERE business_id = ? AND id = ?
    `;
    const params = [
      updated.name,
      updated.lastName,
      updated.documentType,
      updated.documentNumber,
      updated.phone,
      updated.email,
      updated.address,
      updated.notes,
      updated.active ? 1 : 0,
      updated.updatedAt,
      businessId,
      id,
    ];

    try {
      await db.execute(sql, params);
      return updated;
    } catch (err) {
      logger.error('SqliteCustomerRepository', 'Failed to update customer', { error: String(err) });
      throw err;
    }
  }

  async deactivate(businessId: string, id: string): Promise<void> {
    await this.update(businessId, id, { active: false });
  }

  async activate(businessId: string, id: string): Promise<void> {
    await this.update(businessId, id, { active: true });
  }
}
