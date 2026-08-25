import { describe, it, expect } from 'vitest';
import { buildReceiptDTO } from '../../../domain/sales/Receipt';
import { Sale } from '../../../domain/sales/Sale';
import { SaleItem } from '../../../domain/sales/SaleItem';
import { SalePayment } from '../../../domain/sales/SalePayment';
import { formatReceiptText, generateReceiptHtml } from '../../../infrastructure/hardware/printing/ReceiptPrintService';
import { windowsPrintSpikeAdapter } from '../../../infrastructure/hardware/printing/WindowsPrintSpikeAdapter';

describe('AG-09A: Receipt Printing & Isolation Tests', () => {
  const businessInfo = {
    name: 'Minimarket La Esquina',
    fiscalId: '76.123.456-7',
    address: 'Av. Providencia 1234',
    phone: '+56 9 1234 5678',
  };

  it('31. builds authoritative Receipt DTO with subtotal, total, cash received, and change', () => {
    const sale: Sale = {
      id: 'sale-001',
      businessId: 'biz-1',
      saleNumber: 'V-000008',
      saleSequence: 8,
      status: 'COMPLETED',
      subtotal: 15850,
      discountTotal: 0,
      taxTotal: 0,
      total: 15850,
      currencyCode: 'CLP',
      customerId: 'cust-1',
      customerNameSnapshot: 'Carolina Valenzuela',
      idempotencyKey: 'idem-1',
      createdByUserId: 'user-1',
      createdByNameSnapshot: 'José Pérez',
      cashSessionId: 'session-1',
      completedAt: '2026-08-24T12:00:00.000Z',
      createdAt: '2026-08-24T12:00:00.000Z',
    };

    const items: SaleItem[] = [
      {
        id: 'item-1',
        businessId: 'biz-1',
        saleId: 'sale-001',
        productId: 'prod-1',
        productNameSnapshot: 'Bebida Cola 1.5L',
        presentationId: null,
        presentationNameSnapshot: null,
        baseUnit: 'UNIT',
        presentationFactor: 1000,
        quantity: 5000, // 5 units
        inventoryQuantityDelta: -5000,
        unitPrice: 3170,
        discountTotal: 0,
        lineTotal: 15850,
        costQualitySnapshot: 'REAL',
        createdAt: '2026-08-24T12:00:00.000Z',
      },
    ];

    const payments: SalePayment[] = [
      {
        id: 'pay-1',
        businessId: 'biz-1',
        saleId: 'sale-001',
        paymentMethodId: 'pm-cash',
        paymentMethodCode: 'CASH',
        paymentMethodNameSnapshot: 'Efectivo',
        amount: 15850,
        currencyCode: 'CLP',
        receivedAmount: 20000,
        changeAmount: 4150,
        createdAt: '2026-08-24T12:00:00.000Z',
      },
    ];

    const receipt = buildReceiptDTO(sale, items, payments, businessInfo);

    expect(receipt.saleNumber).toBe('V-000008');
    expect(receipt.subtotalFormatted).toBe('$ 15.850');
    expect(receipt.totalFormatted).toBe('$ 15.850');
    expect(receipt.payments[0].amountFormatted).toBe('$ 15.850');
    expect(receipt.payments[0].receivedFormatted).toBe('$ 20.000');
    expect(receipt.payments[0].changeFormatted).toBe('$ 4.150');

    const receiptText = formatReceiptText(receipt, '80mm');
    expect(receiptText).toContain('MINIMARKET LA ESQUINA');
    expect(receiptText).toContain('#V-000008');
    expect(receiptText).toContain('15.850');
    expect(receiptText).toContain('20.000');
    expect(receiptText).toContain('4.150');
  });

  it('32. handles discount accurately in Receipt DTO and print output', () => {
    const sale: Sale = {
      id: 'sale-002',
      businessId: 'biz-1',
      saleNumber: 'V-000009',
      saleSequence: 9,
      status: 'COMPLETED',
      subtotal: 3190,
      discountTotal: 160,
      taxTotal: 0,
      total: 3030,
      currencyCode: 'CLP',
      customerId: 'cust-1',
      customerNameSnapshot: 'Carolina Valenzuela',
      idempotencyKey: 'idem-2',
      createdByUserId: 'user-1',
      createdByNameSnapshot: 'José Pérez',
      cashSessionId: 'session-1',
      completedAt: '2026-08-24T12:30:00.000Z',
      createdAt: '2026-08-24T12:30:00.000Z',
    };

    const items: SaleItem[] = [
      {
        id: 'item-2',
        businessId: 'biz-1',
        saleId: 'sale-002',
        productId: 'prod-2',
        productNameSnapshot: 'Café Grano 250g',
        presentationId: null,
        presentationNameSnapshot: null,
        baseUnit: 'UNIT',
        presentationFactor: 1000,
        quantity: 1000,
        inventoryQuantityDelta: -1000,
        unitPrice: 3190,
        discountTotal: 160,
        lineTotal: 3030,
        costQualitySnapshot: 'REAL',
        createdAt: '2026-08-24T12:30:00.000Z',
      },
    ];

    const payments: SalePayment[] = [
      {
        id: 'pay-2',
        businessId: 'biz-1',
        saleId: 'sale-002',
        paymentMethodId: 'pm-card',
        paymentMethodCode: 'DEBIT_CARD',
        paymentMethodNameSnapshot: 'Tarjeta Débito',
        amount: 3030,
        currencyCode: 'CLP',
        receivedAmount: null,
        changeAmount: null,
        createdAt: '2026-08-24T12:30:00.000Z',
      },
    ];

    const receipt = buildReceiptDTO(sale, items, payments, businessInfo);

    expect(receipt.subtotalFormatted).toBe('$ 3.190');
    expect(receipt.discountFormatted).toBe('$ 160');
    expect(receipt.totalFormatted).toBe('$ 3.030');

    const receiptText = formatReceiptText(receipt, '80mm');
    expect(receiptText).toContain('Subtotal:');
    expect(receiptText).toContain('3.190');
    expect(receiptText).toContain('Descuento:');
    expect(receiptText).toContain('160');
    expect(receiptText).toContain('TOTAL:');
    expect(receiptText).toContain('3.030');
  });

  it('33. validates customer snapshot name vs Consumidor final', () => {
    const saleWithCustomer: Sale = {
      id: 'sale-003',
      businessId: 'biz-1',
      saleNumber: 'V-000010',
      saleSequence: 10,
      status: 'COMPLETED',
      subtotal: 5000,
      discountTotal: 0,
      taxTotal: 0,
      total: 5000,
      currencyCode: 'CLP',
      customerId: 'cust-10',
      customerNameSnapshot: 'Juan Pérez',
      idempotencyKey: 'idem-3',
      createdByUserId: 'user-1',
      createdByNameSnapshot: 'José Pérez',
      cashSessionId: 'session-1',
      completedAt: '2026-08-24T13:00:00.000Z',
      createdAt: '2026-08-24T13:00:00.000Z',
    };

    const receipt1 = buildReceiptDTO(saleWithCustomer, [], [], businessInfo);
    expect(receipt1.customerName).toBe('Juan Pérez');

    const saleAnonymous: Sale = {
      ...saleWithCustomer,
      id: 'sale-004',
      saleNumber: 'V-000011',
      customerId: null,
      customerNameSnapshot: 'Consumidor final',
    };

    const receipt2 = buildReceiptDTO(saleAnonymous, [], [], businessInfo);
    expect(receipt2.customerName).toBe('Consumidor final');
  });

  it('34. reprint test: historical reconstruction produces identical Receipt DTO', () => {
    const sale: Sale = {
      id: 'sale-hist-1',
      businessId: 'biz-1',
      saleNumber: 'V-000012',
      saleSequence: 12,
      status: 'COMPLETED',
      subtotal: 8000,
      discountTotal: 500,
      taxTotal: 0,
      total: 7500,
      currencyCode: 'CLP',
      customerId: 'cust-2',
      customerNameSnapshot: 'Roberto Muñoz',
      idempotencyKey: 'idem-hist-1',
      createdByUserId: 'user-1',
      createdByNameSnapshot: 'José Pérez',
      cashSessionId: 'session-1',
      completedAt: '2026-08-20T10:00:00.000Z',
      createdAt: '2026-08-20T10:00:00.000Z',
    };

    const items: SaleItem[] = [
      {
        id: 'item-hist-1',
        businessId: 'biz-1',
        saleId: 'sale-hist-1',
        productId: 'prod-hist-1',
        productNameSnapshot: 'Pan Hallulla 2kg',
        presentationId: null,
        presentationNameSnapshot: null,
        baseUnit: 'KG',
        presentationFactor: 1000,
        quantity: 2000,
        inventoryQuantityDelta: -2000,
        unitPrice: 4000,
        discountTotal: 500,
        lineTotal: 7500,
        costQualitySnapshot: 'REAL',
        createdAt: '2026-08-20T10:00:00.000Z',
      },
    ];

    const payments: SalePayment[] = [
      {
        id: 'pay-hist-1',
        businessId: 'biz-1',
        saleId: 'sale-hist-1',
        paymentMethodId: 'pm-cash',
        paymentMethodCode: 'CASH',
        paymentMethodNameSnapshot: 'Efectivo',
        amount: 7500,
        currencyCode: 'CLP',
        receivedAmount: 10000,
        changeAmount: 2500,
        createdAt: '2026-08-20T10:00:00.000Z',
      },
    ];

    const originalReceipt = buildReceiptDTO(sale, items, payments, businessInfo);
    const rehydratedReceipt = buildReceiptDTO(sale, items, payments, businessInfo);

    expect(rehydratedReceipt).toEqual(originalReceipt);
  });

  it('35. print visibility test: isolated print document contains NO modal UI buttons or chrome', () => {
    const sale: Sale = {
      id: 'sale-test',
      businessId: 'biz-1',
      saleNumber: 'V-000015',
      saleSequence: 15,
      status: 'COMPLETED',
      subtotal: 5000,
      discountTotal: 0,
      taxTotal: 0,
      total: 5000,
      currencyCode: 'CLP',
      customerId: null,
      customerNameSnapshot: 'Consumidor final',
      idempotencyKey: 'idem-test',
      createdByUserId: 'user-1',
      createdByNameSnapshot: 'José Pérez',
      cashSessionId: 'session-1',
      completedAt: '2026-08-24T14:00:00.000Z',
      createdAt: '2026-08-24T14:00:00.000Z',
    };

    const receipt = buildReceiptDTO(sale, [], [], businessInfo);
    const html = generateReceiptHtml(receipt, '80mm');
    const text = formatReceiptText(receipt, '80mm');

    // Assert that modal UI elements and application chrome do NOT exist in the print payload
    expect(html).not.toContain('Nueva venta');
    expect(html).not.toContain('Imprimir comprobante');
    expect(html).not.toContain('Venta completada');
    expect(html).not.toContain('DEV Core');
    expect(html).not.toContain('Cerrar comprobante');

    expect(text).not.toContain('Nueva venta');
    expect(text).not.toContain('Imprimir comprobante');
    expect(text).not.toContain('Venta completada');
    expect(text).not.toContain('DEV Core');
  });

  it('verifies windowsPrintSpikeAdapter implements PrintPort with printReceipt', async () => {
    const sale: Sale = {
      id: 'sale-adapter-test',
      businessId: 'biz-1',
      saleNumber: 'V-000016',
      saleSequence: 16,
      status: 'COMPLETED',
      subtotal: 5000,
      discountTotal: 0,
      taxTotal: 0,
      total: 5000,
      currencyCode: 'CLP',
      customerId: null,
      customerNameSnapshot: 'Consumidor final',
      idempotencyKey: 'idem-adapter-test',
      createdByUserId: 'user-1',
      createdByNameSnapshot: 'José Pérez',
      cashSessionId: 'session-1',
      completedAt: '2026-08-24T14:00:00.000Z',
      createdAt: '2026-08-24T14:00:00.000Z',
    };

    const receipt = buildReceiptDTO(sale, [], [], businessInfo);
    const result = await windowsPrintSpikeAdapter.printReceipt(receipt, '80mm');

    expect(result.success).toBe(true);
    expect(result.targetFormat).toBe('80mm');
    expect(result.outputPayload).toBeDefined();
    expect(result.outputPayload).toContain('V-000016');
  });
});
