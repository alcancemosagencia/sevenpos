import { CashRegisterRepository } from '../../domain/cash/repositories/CashRegisterRepository';
import { CashRegister } from '../../domain/cash/CashRegister';

export class EnsureDefaultCashRegister {
  constructor(private registerRepo: CashRegisterRepository) {}

  async execute(businessId: string): Promise<CashRegister> {
    if (!businessId) {
      throw new Error('businessId es requerido para asegurar la caja por defecto.');
    }
    return this.registerRepo.ensureDefaultRegister(businessId);
  }
}
