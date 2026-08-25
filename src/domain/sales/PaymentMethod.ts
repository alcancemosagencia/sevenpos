export type PaymentMethodCode =
  | 'CASH'
  | 'DEBIT_CARD'
  | 'CREDIT_CARD'
  | 'TRANSFER'
  | 'OTHER';

export interface PaymentMethod {
  id: string;
  businessId: string;
  code: PaymentMethodCode;
  name: string;
  active: boolean;
  allowsChange: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_PAYMENT_METHOD_DEFINITIONS: {
  code: PaymentMethodCode;
  name: string;
  allowsChange: boolean;
  sortOrder: number;
}[] = [
  { code: 'CASH', name: 'Efectivo', allowsChange: true, sortOrder: 1 },
  { code: 'DEBIT_CARD', name: 'Tarjeta de débito', allowsChange: false, sortOrder: 2 },
  { code: 'CREDIT_CARD', name: 'Tarjeta de crédito', allowsChange: false, sortOrder: 3 },
  { code: 'TRANSFER', name: 'Transferencia bancaria', allowsChange: false, sortOrder: 4 },
  { code: 'OTHER', name: 'Otro', allowsChange: false, sortOrder: 5 },
];
