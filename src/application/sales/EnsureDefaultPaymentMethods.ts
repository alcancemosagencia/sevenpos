import { PaymentMethodRepository } from '../../domain/sales/repositories/PaymentMethodRepository';
import { logger } from '../../infrastructure/logging/Logger';

export class EnsureDefaultPaymentMethods {
  constructor(private paymentMethodRepo: PaymentMethodRepository) {}

  async execute(businessId: string): Promise<void> {
    if (!businessId) return;
    try {
      await this.paymentMethodRepo.ensureDefaultMethods(businessId);
    } catch (err) {
      logger.warn('EnsureDefaultPaymentMethods', 'Non-fatal error ensuring default payment methods', { error: String(err) });
    }
  }
}
