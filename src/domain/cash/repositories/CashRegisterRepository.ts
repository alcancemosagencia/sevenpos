import { CashRegister } from '../CashRegister';

export interface CashRegisterRepository {
  getDefaultRegister(businessId: string): Promise<CashRegister>;
  getById(id: string, businessId: string): Promise<CashRegister | null>;
  list(businessId: string): Promise<CashRegister[]>;
  save(register: CashRegister): Promise<void>;
  ensureDefaultRegister(businessId: string): Promise<CashRegister>;
}
