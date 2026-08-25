import { PaymentMethod, PaymentMethodCode, DEFAULT_PAYMENT_METHOD_DEFINITIONS } from '../../domain/sales/PaymentMethod';
import { PaymentMethodRepository } from '../../domain/sales/repositories/PaymentMethodRepository';
import { generateUuid } from '../../domain/common/IdGenerator';
import { getCurrentUtcIsoString } from '../../domain/common/Timestamp';

const DEV_STORAGE_KEY_PAYMENTS = 'sevenpos-dev-payment-methods';

export class InMemoryPaymentMethodRepository implements PaymentMethodRepository {
  private methods: PaymentMethod[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private hasLocalStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && typeof window.localStorage.getItem === 'function';
  }

  private loadFromStorage() {
    if (this.hasLocalStorage()) {
      const raw = window.localStorage.getItem(DEV_STORAGE_KEY_PAYMENTS);
      if (raw) {
        try {
          this.methods = JSON.parse(raw);
        } catch {
          this.methods = [];
        }
      }
    }
  }

  private saveToStorage() {
    if (this.hasLocalStorage()) {
      window.localStorage.setItem(DEV_STORAGE_KEY_PAYMENTS, JSON.stringify(this.methods));
    }
  }

  async listActivePaymentMethods(businessId: string): Promise<PaymentMethod[]> {
    await this.ensureDefaultMethods(businessId);
    return this.methods
      .filter((m) => m.businessId === businessId && m.active)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getPaymentMethodByCode(businessId: string, code: PaymentMethodCode): Promise<PaymentMethod | null> {
    await this.ensureDefaultMethods(businessId);
    return this.methods.find((m) => m.businessId === businessId && m.code === code) || null;
  }

  async getPaymentMethodById(id: string): Promise<PaymentMethod | null> {
    return this.methods.find((m) => m.id === id) || null;
  }

  async savePaymentMethod(method: PaymentMethod): Promise<void> {
    const idx = this.methods.findIndex((m) => m.id === method.id);
    if (idx >= 0) {
      this.methods[idx] = { ...method };
    } else {
      this.methods.push({ ...method });
    }
    this.saveToStorage();
  }

  async ensureDefaultMethods(businessId: string): Promise<void> {
    if (!businessId) return;
    const existing = this.methods.filter((m) => m.businessId === businessId);
    if (existing.length === 0) {
      const now = getCurrentUtcIsoString();
      for (const def of DEFAULT_PAYMENT_METHOD_DEFINITIONS) {
        this.methods.push({
          id: generateUuid(),
          businessId,
          code: def.code,
          name: def.name,
          active: true,
          allowsChange: def.allowsChange,
          sortOrder: def.sortOrder,
          createdAt: now,
          updatedAt: now,
        });
      }
      this.saveToStorage();
    }
  }
}
