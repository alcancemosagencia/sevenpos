import { CashRegister } from '../../domain/cash/CashRegister';
import { CashRegisterRepository } from '../../domain/cash/repositories/CashRegisterRepository';
import { generateUuid } from '../../domain/common/IdGenerator';
import { getCurrentUtcIsoString } from '../../domain/common/Timestamp';

const DEV_STORAGE_KEY_REGISTERS = 'sevenpos-dev-cash-registers';

export class InMemoryCashRegisterRepository implements CashRegisterRepository {
  private registers: CashRegister[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private hasLocalStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && typeof window.localStorage.getItem === 'function';
  }

  private loadFromStorage() {
    if (this.hasLocalStorage()) {
      try {
        const raw = window.localStorage.getItem(DEV_STORAGE_KEY_REGISTERS);
        if (raw) this.registers = JSON.parse(raw);
      } catch {
        this.registers = [];
      }
    }
  }

  private saveToStorage() {
    if (this.hasLocalStorage()) {
      window.localStorage.setItem(DEV_STORAGE_KEY_REGISTERS, JSON.stringify(this.registers));
    }
  }

  async getDefaultRegister(businessId: string): Promise<CashRegister> {
    return this.ensureDefaultRegister(businessId);
  }

  async getById(id: string, businessId: string): Promise<CashRegister | null> {
    this.loadFromStorage();
    const reg = this.registers.find((r) => r.id === id && r.businessId === businessId);
    return reg ? { ...reg } : null;
  }

  async list(businessId: string): Promise<CashRegister[]> {
    this.loadFromStorage();
    return this.registers.filter((r) => r.businessId === businessId).map((r) => ({ ...r }));
  }

  async save(register: CashRegister): Promise<void> {
    this.loadFromStorage();
    const idx = this.registers.findIndex((r) => r.id === register.id);
    if (idx >= 0) {
      this.registers[idx] = { ...register };
    } else {
      this.registers.push({ ...register });
    }
    this.saveToStorage();
  }

  async ensureDefaultRegister(businessId: string): Promise<CashRegister> {
    this.loadFromStorage();
    let reg = this.registers.find((r) => r.businessId === businessId && r.name === 'Caja principal');
    if (!reg) {
      const now = getCurrentUtcIsoString();
      reg = {
        id: generateUuid(),
        businessId,
        name: 'Caja principal',
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      this.registers.push(reg);
      this.saveToStorage();
    }
    return { ...reg };
  }
}
