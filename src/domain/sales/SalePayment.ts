import { PaymentMethodCode } from './PaymentMethod';

export interface SalePayment {
  id: string;
  businessId: string;
  saleId: string;
  paymentMethodId: string;
  paymentMethodCode: PaymentMethodCode;
  paymentMethodNameSnapshot: string;
  amount: number; // Exact minor currency amount applied towards sale total
  currencyCode: string;
  receivedAmount?: number | null; // Physical cash tendered (only for cash)
  changeAmount?: number | null; // Cash change returned (only for cash)
  createdAt: string;
}
