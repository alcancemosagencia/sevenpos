export type ReceiptLineItem = {
  name: string;
  quantity: number;
  unitPriceUsd: number;
  subtotalUsd: number;
};

export type ReceiptPayment = {
  method: string;
  reference?: string;
  receivedUsd?: number;
  receivedBs?: number;
  changeUsd?: number;
  changeBs?: number;
};

export type ReceiptData = {
  id: string;
  businessName: string;
  businessPhone?: string | null;
  businessEmail?: string | null;
  businessAddress?: string | null;
  businessTaxId?: string | null;
  branchName?: string | null;
  logoUrl?: string | null;
  cashierName: string;
  createdAt: string | Date;
  exchangeRate: number;
  subtotalUsd: number;
  taxUsd?: number;
  discountUsd?: number;
  totalUsd: number;
  totalBs: number;
  payment: ReceiptPayment;
  items: ReceiptLineItem[];
  footer?: string;
  qrValue?: string;
};
