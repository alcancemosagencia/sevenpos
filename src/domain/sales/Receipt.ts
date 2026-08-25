import { Sale } from './Sale';
import { SaleItem } from './SaleItem';
import { SalePayment } from './SalePayment';
import { formatMoney } from '../common/money/Money';
import { CurrencyCode } from '../../types/country';

export interface ReceiptItemDTO {
  displayName: string;
  presentationName?: string | null;
  baseUnit: string;
  quantityFormatted: string;
  unitPriceFormatted: string;
  discountFormatted?: string | null;
  lineTotalFormatted: string;
}

export interface ReceiptPaymentDTO {
  methodName: string;
  amountFormatted: string;
  receivedFormatted?: string | null;
  changeFormatted?: string | null;
}

export interface ReceiptDTO {
  businessName: string;
  businessFiscalId?: string | null;
  businessAddress?: string | null;
  businessPhone?: string | null;
  saleNumber: string;
  dateFormatted: string;
  cashierName: string;
  customerName: string;
  items: ReceiptItemDTO[];
  subtotalFormatted: string;
  discountFormatted?: string | null;
  taxFormatted?: string | null;
  totalFormatted: string;
  payments: ReceiptPaymentDTO[];
  currencyCode: string;
  note?: string | null;
}

export function buildReceiptDTO(
  sale: Sale,
  items: SaleItem[],
  payments: SalePayment[],
  businessInfo: {
    name: string;
    fiscalId?: string | null;
    address?: string | null;
    phone?: string | null;
  }
): ReceiptDTO {
  const curr = (sale.currencyCode || 'CLP') as CurrencyCode;

  return {
    businessName: businessInfo.name,
    businessFiscalId: businessInfo.fiscalId,
    businessAddress: businessInfo.address,
    businessPhone: businessInfo.phone,
    saleNumber: sale.saleNumber,
    dateFormatted: new Date(sale.completedAt).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    cashierName: sale.createdByNameSnapshot,
    customerName: sale.customerNameSnapshot,
    items: items.map((item) => {
      const isWhole = item.quantity % 1000 === 0;
      const qtyMajor = item.quantity / 1000;
      const qtyDisplay = isWhole ? String(qtyMajor) : qtyMajor.toLocaleString('es-ES', { maximumFractionDigits: 3 });
      return {
        displayName: item.productNameSnapshot,
        presentationName: item.presentationNameSnapshot,
        baseUnit: item.baseUnit,
        quantityFormatted: `${qtyDisplay} ${item.baseUnit.toLowerCase()}`,
        unitPriceFormatted: formatMoney(item.unitPrice, curr),
        discountFormatted: item.discountTotal > 0 ? formatMoney(item.discountTotal, curr) : null,
        lineTotalFormatted: formatMoney(item.lineTotal, curr),
      };
    }),
    subtotalFormatted: formatMoney(sale.subtotal, curr),
    discountFormatted: sale.discountTotal > 0 ? formatMoney(sale.discountTotal, curr) : null,
    taxFormatted: sale.taxTotal > 0 ? formatMoney(sale.taxTotal, curr) : null,
    totalFormatted: formatMoney(sale.total, curr),
    payments: payments.map((p) => ({
      methodName: p.paymentMethodNameSnapshot,
      amountFormatted: formatMoney(p.amount, curr),
      receivedFormatted: p.receivedAmount ? formatMoney(p.receivedAmount, curr) : null,
      changeFormatted: p.changeAmount ? formatMoney(p.changeAmount, curr) : null,
    })),
    currencyCode: sale.currencyCode,
    note: sale.note,
  };
}
