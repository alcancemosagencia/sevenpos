import { PaymentMethod, PaymentMethodCode } from '../PaymentMethod';

export interface PaymentMethodRepository {
  listActivePaymentMethods(businessId: string): Promise<PaymentMethod[]>;
  getPaymentMethodByCode(businessId: string, code: PaymentMethodCode): Promise<PaymentMethod | null>;
  getPaymentMethodById(id: string): Promise<PaymentMethod | null>;
  savePaymentMethod(method: PaymentMethod): Promise<void>;
  ensureDefaultMethods(businessId: string): Promise<void>;
}
