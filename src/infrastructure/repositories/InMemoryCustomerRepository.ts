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
import { generateUUID } from '../../domain/common/IdGenerator';
import { getCurrentTimestamp } from '../../domain/common/Timestamp';

const STORAGE_KEY = 'sevenpos-dev-customers';

export class InMemoryCustomerRepository implements CustomerRepository {
  private customers: Customer[] = [];

  constructor(initialCustomers: Customer[] = []) {
    this.customers = [...initialCustomers];
    this.loadFromDevStorage();
  }

  private hasLocalStorage(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      typeof window.localStorage.getItem === 'function'
    );
  }

  private loadFromDevStorage() {
    if (this.hasLocalStorage()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.customers = JSON.parse(raw);
        }
      } catch {
        // Dev fallback
      }
    }
  }

  private saveToDevStorage() {
    if (this.hasLocalStorage()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customers));
      } catch {
        // Dev fallback
      }
    }
  }

  async findById(businessId: string, id: string): Promise<Customer | null> {
    this.loadFromDevStorage();
    const c = this.customers.find((cust) => cust.businessId === businessId && cust.id === id);
    return c ? { ...c } : null;
  }

  async findByDocument(businessId: string, documentNumber: string): Promise<Customer | null> {
    this.loadFromDevStorage();
    const norm = normalizeCustomerDocument(documentNumber);
    const c = this.customers.find(
      (cust) =>
        cust.businessId === businessId &&
        cust.documentNumber &&
        normalizeCustomerDocument(cust.documentNumber) === norm
    );
    return c ? { ...c } : null;
  }

  async list(businessId: string, options?: ListCustomersOptions): Promise<Customer[]> {
    this.loadFromDevStorage();
    let result = this.customers.filter((c) => c.businessId === businessId);

    if (!options?.includeInactive) {
      result = result.filter((c) => c.active);
    }

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.lastName && c.lastName.toLowerCase().includes(q)) ||
          (c.documentNumber && c.documentNumber.toLowerCase().includes(q)) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => a.name.localeCompare(b.name));

    if (options?.limit) {
      const offset = options.offset || 0;
      result = result.slice(offset, offset + options.limit);
    }

    return result.map((c) => ({ ...c }));
  }

  async search(businessId: string, query: string, limit: number = 20): Promise<Customer[]> {
    this.loadFromDevStorage();
    const q = query.toLowerCase().trim();
    return this.customers
      .filter(
        (c) =>
          c.businessId === businessId &&
          c.active &&
          (c.name.toLowerCase().includes(q) ||
            (c.lastName && c.lastName.toLowerCase().includes(q)) ||
            (c.documentNumber && c.documentNumber.toLowerCase().includes(q)) ||
            (c.phone && c.phone.toLowerCase().includes(q)) ||
            (c.email && c.email.toLowerCase().includes(q)))
      )
      .slice(0, limit)
      .map((c) => ({ ...c }));
  }

  async checkDuplicates(
    businessId: string,
    dto: { documentNumber?: string | null; phone?: string | null; email?: string | null },
    excludeCustomerId?: string
  ): Promise<DuplicateCustomerMatch[]> {
    this.loadFromDevStorage();
    const matches: DuplicateCustomerMatch[] = [];
    const normDoc = normalizeCustomerDocument(dto.documentNumber);
    const normPhone = normalizeCustomerPhone(dto.phone);
    const normEmail = normalizeCustomerEmail(dto.email);

    for (const c of this.customers) {
      if (c.businessId !== businessId) continue;
      if (excludeCustomerId && c.id === excludeCustomerId) continue;

      if (normDoc && normalizeCustomerDocument(c.documentNumber) === normDoc) {
        matches.push({ field: 'document', customer: { ...c }, matchedValue: c.documentNumber || '' });
      }
      if (normPhone && normalizeCustomerPhone(c.phone) === normPhone) {
        matches.push({ field: 'phone', customer: { ...c }, matchedValue: c.phone || '' });
      }
      if (normEmail && normalizeCustomerEmail(c.email) === normEmail) {
        matches.push({ field: 'email', customer: { ...c }, matchedValue: c.email || '' });
      }
    }

    return matches;
  }

  async create(businessId: string, dto: CreateCustomerDto): Promise<Customer> {
    this.loadFromDevStorage();
    const now = getCurrentTimestamp();
    const newCust: Customer = {
      id: generateUUID(),
      businessId,
      name: dto.name.trim(),
      lastName: dto.lastName?.trim() || null,
      documentType: dto.documentType?.trim() || null,
      documentNumber: dto.documentNumber?.trim() || null,
      phone: dto.phone?.trim() || null,
      email: dto.email?.trim() || null,
      address: dto.address?.trim() || null,
      notes: dto.notes?.trim() || null,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    this.customers.push(newCust);
    this.saveToDevStorage();
    return { ...newCust };
  }

  async update(businessId: string, id: string, dto: UpdateCustomerDto): Promise<Customer> {
    this.loadFromDevStorage();
    const index = this.customers.findIndex((c) => c.businessId === businessId && c.id === id);
    if (index === -1) throw new Error(`Cliente ${id} no encontrado.`);

    const now = getCurrentTimestamp();
    const existing = this.customers[index];
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

    this.customers[index] = updated;
    this.saveToDevStorage();
    return { ...updated };
  }

  async deactivate(businessId: string, id: string): Promise<void> {
    await this.update(businessId, id, { active: false });
  }

  async activate(businessId: string, id: string): Promise<void> {
    await this.update(businessId, id, { active: true });
  }
}
