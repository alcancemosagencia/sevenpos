import { PaymentMethodCode } from '../sales/PaymentMethod';

export type ExpensePaymentMethod = PaymentMethodCode;

export const EXPENSE_PAYMENT_METHODS: { code: ExpensePaymentMethod; label: string }[] = [
  { code: 'CASH', label: 'Efectivo (Caja)' },
  { code: 'TRANSFER', label: 'Transferencia bancaria' },
  { code: 'DEBIT_CARD', label: 'Tarjeta de débito' },
  { code: 'CREDIT_CARD', label: 'Tarjeta de crédito' },
  { code: 'OTHER', label: 'Otro medio' },
];

export function getExpensePaymentMethodLabel(code: ExpensePaymentMethod): string {
  const match = EXPENSE_PAYMENT_METHODS.find((m) => m.code === code);
  return match ? match.label : code;
}
