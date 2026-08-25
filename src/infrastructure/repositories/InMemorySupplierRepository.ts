import { Supplier, CreateSupplierDto, UpdateSupplierDto } from '../../domain/purchases/Supplier';
import { SupplierRepository } from '../../domain/purchases/repositories/SupplierRepository';
import { generateUUID } from '../../domain/common/IdGenerator';
import { getCurrentTimestamp } from '../../domain/common/Timestamp';

const STORAGE_KEY = 'sevenpos-dev-suppliers';

export class InMemorySupplierRepository implements SupplierRepository {
  private suppliers: Supplier[] = [];

  constructor(initialSuppliers: Supplier[] = []) {
    this.suppliers = [...initialSuppliers];
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
          this.suppliers = JSON.parse(raw);
        }
      } catch {
        // Dev fallback
      }
    }
  }

  private saveToDevStorage() {
    if (this.hasLocalStorage()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.suppliers));
      } catch {
        // Dev fallback
      }
    }
  }

  async findById(businessId: string, id: string): Promise<Supplier | null> {
    this.loadFromDevStorage();
    const s = this.suppliers.find((sup) => sup.businessId === businessId && sup.id === id);
    return s ? { ...s } : null;
  }

  async findByName(businessId: string, name: string): Promise<Supplier | null> {
    this.loadFromDevStorage();
    const s = this.suppliers.find(
      (sup) =>
        sup.businessId === businessId && sup.name.toLowerCase() === name.trim().toLowerCase()
    );
    return s ? { ...s } : null;
  }

  async list(businessId: string, includeInactive: boolean = false): Promise<Supplier[]> {
    this.loadFromDevStorage();
    return this.suppliers
      .filter((s) => s.businessId === businessId && (includeInactive || s.active))
      .map((s) => ({ ...s }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async create(businessId: string, dto: CreateSupplierDto): Promise<Supplier> {
    this.loadFromDevStorage();
    const now = getCurrentTimestamp();
    const newSupplier: Supplier = {
      id: generateUUID(),
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
    this.suppliers.push(newSupplier);
    this.saveToDevStorage();
    return { ...newSupplier };
  }

  async update(businessId: string, id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    this.loadFromDevStorage();
    const index = this.suppliers.findIndex((s) => s.businessId === businessId && s.id === id);
    if (index === -1) {
      throw new Error(`Proveedor ${id} no encontrado.`);
    }

    const now = getCurrentTimestamp();
    const existing = this.suppliers[index];
    const updated: Supplier = {
      ...existing,
      name: dto.name !== undefined ? dto.name : existing.name,
      taxId: dto.taxId !== undefined ? dto.taxId : existing.taxId,
      contactName: dto.contactName !== undefined ? dto.contactName : existing.contactName,
      phone: dto.phone !== undefined ? dto.phone : existing.phone,
      email: dto.email !== undefined ? dto.email : existing.email,
      address: dto.address !== undefined ? dto.address : existing.address,
      notes: dto.notes !== undefined ? dto.notes : existing.notes,
      updatedAt: now,
    };

    this.suppliers[index] = updated;
    this.saveToDevStorage();
    return { ...updated };
  }

  async deactivate(businessId: string, id: string): Promise<void> {
    const index = this.suppliers.findIndex((s) => s.businessId === businessId && s.id === id);
    if (index !== -1) {
      this.suppliers[index].active = false;
      this.suppliers[index].updatedAt = new Date().toISOString();
      this.saveToDevStorage();
    }
  }

  async activate(businessId: string, id: string): Promise<void> {
    const index = this.suppliers.findIndex((s) => s.businessId === businessId && s.id === id);
    if (index !== -1) {
      this.suppliers[index].active = true;
      this.suppliers[index].updatedAt = new Date().toISOString();
      this.saveToDevStorage();
    }
  }
}
