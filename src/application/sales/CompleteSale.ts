import { Sale, SaleWithDetails } from '../../domain/sales/Sale';
import { SaleItem } from '../../domain/sales/SaleItem';
import { SalePayment } from '../../domain/sales/SalePayment';
import { ReceiptDTO, buildReceiptDTO } from '../../domain/sales/Receipt';
import { SaleRepository } from '../../domain/sales/repositories/SaleRepository';
import { PaymentMethodRepository } from '../../domain/sales/repositories/PaymentMethodRepository';
import { ProductRepository } from '../../domain/catalog/ProductRepository';
import { ProductPresentationRepository } from '../../domain/catalog/ProductPresentationRepository';
import { InventoryMovementRepository } from '../../domain/inventory/repositories/InventoryMovementRepository';
import { InventoryLotRepository } from '../../domain/inventory/repositories/InventoryLotRepository';
import { BusinessRepository } from '../../domain/business/BusinessRepository';
import { InventoryMovement } from '../../domain/inventory/InventoryMovement';
import { calculateSequentialWAC } from '../../domain/inventory/InventoryCost';
import {
  calculateGrossLineTotal,
  distributeDiscountHareNiemeyer,
  calculateGlobalDiscountTotal,
  GlobalDiscountInput,
} from '../../domain/common/money/MoneyMath';
import { calculateWeightedLineTotal, formatWeightDisplay } from '../../domain/sales/WeightedMath';
import { allocateStockForSale } from '../../domain/inventory/services/LotAllocationService';
import { generateUuid } from '../../domain/common/IdGenerator';
import { getCurrentUtcIsoString } from '../../domain/common/Timestamp';
import { formatQuantity } from '../../domain/common/quantity/Quantity';
import { salesEventBus } from '../../domain/sales/events/SalesEventBus';
import { logger } from '../../infrastructure/logging/Logger';

import { CashSessionRepository } from '../../domain/cash/repositories/CashSessionRepository';
import { CashMovement } from '../../domain/cash/CashMovement';

export interface CompleteSaleItemInput {
  productId?: string | null; // Nullable for OPEN_AMOUNT
  presentationId?: string | null;
  lineType?: 'PRODUCT' | 'OPEN_AMOUNT';
  saleMode?: 'UNIT' | 'WEIGHT';
  weightGrams?: number | null; // Integer grams if saleMode === 'WEIGHT'
  customDescription?: string; // Snapshot description for OPEN_AMOUNT
  quantity: number; // Scaled integer (scale: 1000) or weight in grams or 1000 for OPEN_AMOUNT
  expectedUnitPrice: number; // Minor currency integer
  expectedLineTotal?: number;
}

export interface CompleteSalePaymentInput {
  paymentMethodId: string;
  amount: number; // Exact minor currency integer applied
  receivedAmount?: number | null; // Physical cash tendered
  changeAmount?: number | null; // Cash change returned
}

export interface CompleteSaleInput {
  businessId: string;
  userId: string;
  userName: string;
  customerId?: string | null;
  customerName?: string;
  idempotencyKey: string;
  items: CompleteSaleItemInput[];
  globalDiscount?: GlobalDiscountInput;
  payments: CompleteSalePaymentInput[];
  note?: string | null;
}

export type CompleteSaleErrorType =
  | 'IDEMPOTENCY_ERROR'
  | 'EMPTY_CART'
  | 'CASH_SESSION_REQUIRED'
  | 'PRODUCT_INACTIVE'
  | 'PRESENTATION_INACTIVE'
  | 'PRICE_CHANGED'
  | 'PAYMENT_MISMATCH'
  | 'INSUFFICIENT_STOCK'
  | 'TRANSACTION_FAILED';

export interface CompleteSaleResult {
  success: boolean;
  saleWithDetails?: SaleWithDetails;
  receipt?: ReceiptDTO;
  isIdempotentReplay?: boolean;
  error?: string;
  errorType?: CompleteSaleErrorType;
  updatedPrices?: { productId: string; presentationId?: string | null; officialUnitPrice: number }[];
}

export class CompleteSale {
  constructor(
    private saleRepo: SaleRepository,
    private paymentMethodRepo: PaymentMethodRepository,
    private productRepo: ProductRepository,
    private presentationRepo: ProductPresentationRepository,
    private movementRepo: InventoryMovementRepository,
    private lotRepo: InventoryLotRepository,
    private businessRepo: BusinessRepository,
    private cashSessionRepo?: CashSessionRepository,
    private customerRepo?: import('../../domain/customers/repositories/CustomerRepository').CustomerRepository
  ) {}

  async execute(input: CompleteSaleInput): Promise<CompleteSaleResult> {
    if (!input.items || input.items.length === 0) {
      return { success: false, error: 'El carrito está vacío.', errorType: 'EMPTY_CART' };
    }
    if (!input.idempotencyKey || !input.idempotencyKey.trim()) {
      return { success: false, error: 'La clave de idempotencia es requerida.', errorType: 'IDEMPOTENCY_ERROR' };
    }

    // 0. Active Cash Session Check (Preventive UX verification)
    let activeCashSessionId: string | null = null;
    let activeCashRegisterId: string | null = null;
    if (this.cashSessionRepo) {
      const activeSession = await this.cashSessionRepo.getActiveSession(input.businessId);
      if (!activeSession) {
        return {
          success: false,
          error: 'Se requiere una caja abierta para registrar ventas.',
          errorType: 'CASH_SESSION_REQUIRED',
        };
      }
      activeCashSessionId = activeSession.id;
      activeCashRegisterId = activeSession.cashRegisterId;
    }

    // 0b. Pre-flight Customer Verification (authoritative check will run in native transaction as well)
    if (input.customerId && this.customerRepo) {
      const customer = await this.customerRepo.findById(input.businessId, input.customerId);
      if (!customer) {
        return {
          success: false,
          error: 'CUSTOMER_NOT_FOUND: El cliente seleccionado no existe en este negocio.',
          errorType: 'TRANSACTION_FAILED',
        };
      }
      if (!customer.active) {
        return {
          success: false,
          error: 'CUSTOMER_INACTIVE: El cliente seleccionado se encuentra inactivo.',
          errorType: 'TRANSACTION_FAILED',
        };
      }
    }

    // 1. Idempotency Check: Check if this sale intent was already completed
    const existingSale = await this.saleRepo.getSaleByIdempotencyKey(input.businessId, input.idempotencyKey);
    if (existingSale) {
      logger.info('CompleteSale', `Idempotent replay detected for key: ${input.idempotencyKey}`);
      const business = await this.businessRepo.getPrimaryBusiness();
      const receipt = buildReceiptDTO(
        existingSale.sale,
        existingSale.items,
        existingSale.payments,
        {
          name: business?.name || 'SevenPOS',
          fiscalId: business?.fiscalId,
          address: business?.address,
          phone: business?.phone,
        }
      );
      return {
        success: true,
        saleWithDetails: existingSale,
        receipt,
        isIdempotentReplay: true,
      };
    }

    // 2. Authoritative Catalog Revalidation & Price Conflict Detection
    interface ValidatedItemData {
      inputItem: CompleteSaleItemInput;
      isOpenAmount: boolean;
      isWeight: boolean;
      product: import('../../domain/catalog/Product').Product | null;
      presentation: import('../../domain/catalog/ProductPresentation').ProductPresentation | null;
      unitFactor: number;
      officialUnitPrice: number;
      grossLineTotal: number;
      unitCostSnapshot?: number | null;
      costQuality: import('../../domain/sales/SaleItem').CostQualitySnapshot;
    }

    const validatedItems: ValidatedItemData[] = [];
    const priceConflicts: { productId: string; presentationId?: string | null; officialUnitPrice: number }[] = [];
    let hasPriceConflict = false;

    for (const item of input.items) {
      if (item.lineType === 'OPEN_AMOUNT') {
        if (!item.expectedUnitPrice || item.expectedUnitPrice <= 0 || !Number.isSafeInteger(item.expectedUnitPrice)) {
          return {
            success: false,
            error: 'El importe del monto libre debe ser un entero positivo.',
            errorType: 'PAYMENT_MISMATCH',
          };
        }

        validatedItems.push({
          inputItem: item,
          isOpenAmount: true,
          isWeight: false,
          product: null,
          presentation: null,
          unitFactor: 1,
          officialUnitPrice: item.expectedUnitPrice,
          grossLineTotal: item.expectedUnitPrice,
          unitCostSnapshot: null,
          costQuality: 'UNKNOWN',
        });
        continue;
      }

      if (!item.productId) {
        return {
          success: false,
          error: 'El identificador del producto es requerido.',
          errorType: 'PRODUCT_INACTIVE',
        };
      }

      const product = await this.productRepo.getById(item.productId, input.businessId);
      if (!product || !product.active || product.businessId !== input.businessId) {
        return {
          success: false,
          error: `El producto "${product?.name || item.productId}" no está disponible o fue desactivado.`,
          errorType: 'PRODUCT_INACTIVE',
        };
      }

      let presentation: import('../../domain/catalog/ProductPresentation').ProductPresentation | null = null;
      if (item.presentationId) {
        presentation = await this.presentationRepo.getById(item.presentationId, input.businessId);
        if (!presentation || !presentation.active || presentation.businessId !== input.businessId) {
          return {
            success: false,
            error: `La presentación seleccionada para "${product.name}" ya no está disponible.`,
            errorType: 'PRESENTATION_INACTIVE',
          };
        }
      }

      const unitFactor = presentation ? presentation.unitFactor : 1;
      const officialUnitPrice = presentation ? presentation.salePrice : product.salePrice;

      if (officialUnitPrice !== item.expectedUnitPrice) {
        hasPriceConflict = true;
        priceConflicts.push({
          productId: product.id,
          presentationId: presentation?.id || null,
          officialUnitPrice,
        });
      }

      const isWeight = product.saleMode === 'WEIGHT' || item.saleMode === 'WEIGHT';
      let grossLineTotal: number;

      if (isWeight) {
        const grams = item.weightGrams ?? item.quantity;
        if (!Number.isSafeInteger(grams) || grams <= 0) {
          return {
            success: false,
            error: `El peso para "${product.name}" debe ser un entero positivo en gramos.`,
            errorType: 'PAYMENT_MISMATCH',
          };
        }
        grossLineTotal = calculateWeightedLineTotal(officialUnitPrice, grams);
      } else {
        grossLineTotal = calculateGrossLineTotal(item.quantity, officialUnitPrice);
      }

      // Query latest unit cost from WAC foundation
      const movements = await this.movementRepo.listByProduct(product.id, input.businessId);
      const costState = calculateSequentialWAC(movements, product.costPrice);
      const unitCostSnapshot = costState.averageUnitCost;
      const costQuality = costState.costQuality;

      validatedItems.push({
        inputItem: item,
        isOpenAmount: false,
        isWeight,
        product,
        presentation,
        unitFactor,
        officialUnitPrice,
        grossLineTotal,
        unitCostSnapshot,
        costQuality,
      });
    }

    // If any catalog price changed while in cart, abort and notify with updated prices
    if (hasPriceConflict) {
      return {
        success: false,
        error: 'El precio de algunos productos cambió. Actualizamos el carrito con los precios vigentes. Revísalo antes de continuar.',
        errorType: 'PRICE_CHANGED',
        updatedPrices: priceConflicts,
      };
    }

    // 3. Subtotal, Global Discount & Total Calculation
    const subtotal = validatedItems.reduce((acc, v) => acc + v.grossLineTotal, 0);
    const effectiveDiscountTotal = calculateGlobalDiscountTotal(subtotal, input.globalDiscount);
    const total = Math.max(0, subtotal - effectiveDiscountTotal);

    // Distribute global discount exactly across line items via Largest Remainder Method
    const discountableList = validatedItems.map((v, idx) => ({
      id: `item_${idx}`,
      grossTotal: v.grossLineTotal,
    }));
    const distributedDiscounts = distributeDiscountHareNiemeyer(discountableList, effectiveDiscountTotal);

    // 4. Payment Verification (Exact match: sum(amount) === total)
    const activePaymentMethods = await this.paymentMethodRepo.listActivePaymentMethods(input.businessId);
    const methodMap = new Map(activePaymentMethods.map((m) => [m.id, m]));

    let paymentSum = 0;
    const validatedPayments: SalePayment[] = [];
    const now = getCurrentUtcIsoString();

    for (const p of input.payments) {
      const method = methodMap.get(p.paymentMethodId);
      if (!method || !method.active) {
        return {
          success: false,
          error: 'Uno de los métodos de pago seleccionados no está disponible.',
          errorType: 'PAYMENT_MISMATCH',
        };
      }

      if (p.amount <= 0 || !Number.isSafeInteger(p.amount)) {
        return {
          success: false,
          error: 'El importe de cada pago debe ser un entero positivo.',
          errorType: 'PAYMENT_MISMATCH',
        };
      }

      paymentSum += p.amount;

      let receivedAmount: number | null;
      let changeAmount: number | null;

      if (method.code === 'CASH') {
        receivedAmount = p.receivedAmount && p.receivedAmount >= p.amount ? p.receivedAmount : p.amount;
        changeAmount = receivedAmount - p.amount;
      } else {
        receivedAmount = null;
        changeAmount = null;
      }

      validatedPayments.push({
        id: generateUuid(),
        businessId: input.businessId,
        saleId: '', // set after sale creation
        paymentMethodId: method.id,
        paymentMethodCode: method.code,
        paymentMethodNameSnapshot: method.name,
        amount: p.amount,
        currencyCode: 'CLP', // will inherit business primary currency
        receivedAmount,
        changeAmount,
        createdAt: now,
      });
    }

    if (paymentSum !== total) {
      return {
        success: false,
        error: `El total de pagos ($${paymentSum.toLocaleString('es-ES')}) no coincide con el total de la venta ($${total.toLocaleString('es-ES')}).`,
        errorType: 'PAYMENT_MISMATCH',
      };
    }

    // 5. Stock & FEFO Lot Allocation (Guaranteed non-negative, multi-movement)
    // Group required base units by productId (ignoring OPEN_AMOUNT)
    const requiredByProduct = new Map<string, { totalBaseQuantity: number; productName: string; isWeight: boolean }>();
    for (const v of validatedItems) {
      if (v.isOpenAmount || !v.product) continue;
      const baseQty = v.isWeight ? (v.inputItem.weightGrams ?? v.inputItem.quantity) : (v.inputItem.quantity * v.unitFactor);
      const current = requiredByProduct.get(v.product.id) || {
        totalBaseQuantity: 0,
        productName: v.product.name,
        isWeight: v.isWeight,
      };
      current.totalBaseQuantity += baseQty;
      requiredByProduct.set(v.product.id, current);
    }

    const inventoryMovements: InventoryMovement[] = [];
    const saleId = generateUuid();

    for (const [productId, req] of requiredByProduct.entries()) {
      const totalAvailable = await this.movementRepo.getCurrentStock(productId, input.businessId);

      if (totalAvailable < req.totalBaseQuantity) {
        const availableText = req.isWeight ? formatWeightDisplay(totalAvailable) : formatQuantity(totalAvailable, 'UNIT');
        const requiredText = req.isWeight ? formatWeightDisplay(req.totalBaseQuantity) : formatQuantity(req.totalBaseQuantity, 'UNIT');
        return {
          success: false,
          error: `Stock insuficiente para "${req.productName}": disponible ${availableText}, requerido ${requiredText}`,
          errorType: 'INSUFFICIENT_STOCK',
        };
      }

      const lots = await this.lotRepo.listByProductWithStock(productId, input.businessId);
      const totalLotStock = lots.reduce((acc, l) => acc + l.currentStock, 0);
      const unallocatedStock = Math.max(0, totalAvailable - totalLotStock);

      // Perform FEFO Allocation
      const allocationResult = allocateStockForSale(
        req.totalBaseQuantity,
        unallocatedStock,
        lots
      );

      if (!allocationResult.success) {
        return {
          success: false,
          error: allocationResult.error || `Error al asignar stock para "${req.productName}"`,
          errorType: 'INSUFFICIENT_STOCK',
        };
      }

      // Query cost for movement record
      const prodMovements = await this.movementRepo.listByProduct(productId, input.businessId);
      const matchedProd = validatedItems.find((v) => v.product?.id === productId)?.product;
      const costState = calculateSequentialWAC(prodMovements, matchedProd?.costPrice);

      // Generate atomic inventory movements for each allocated chunk
      for (const chunk of allocationResult.allocations) {
        inventoryMovements.push({
          id: generateUuid(),
          businessId: input.businessId,
          productId,
          lotId: chunk.lotId,
          movementType: 'SALE',
          quantityDelta: -chunk.quantity, // Negative deduction
          unitCost: costState.averageUnitCost || null,
          totalCost: costState.averageUnitCost ? Math.floor((chunk.quantity * costState.averageUnitCost + 500) / 1000) : null,
          reasonCode: null,
          note: `Venta POS #${saleId.slice(0, 8)}`,
          referenceType: 'SALE',
          referenceId: saleId,
          createdByUserId: input.userId,
          occurredAt: now,
          createdAt: now,
        });
      }
    }

    // 6. Build Sale & SaleItem Entities
    const { sequence, saleNumber } = await this.saleRepo.getNextSaleSequence(input.businessId);

    const business = await this.businessRepo.getPrimaryBusiness();
    const settings = business ? await this.businessRepo.getBusinessSettings(business.id) : null;
    const currencyCode = settings?.primaryCurrency || 'CLP';

    const sale: Sale = {
      id: saleId,
      businessId: input.businessId,
      saleNumber,
      saleSequence: sequence,
      status: 'COMPLETED',
      customerId: input.customerId || null,
      cashSessionId: activeCashSessionId,
      customerNameSnapshot: input.customerName || 'Consumidor final',
      subtotal,
      discountTotal: effectiveDiscountTotal,
      taxTotal: 0,
      total,
      currencyCode,
      note: input.note || null,
      idempotencyKey: input.idempotencyKey,
      createdByUserId: input.userId,
      createdByNameSnapshot: input.userName,
      createdAt: now,
      completedAt: now,
    };

    const saleItems: SaleItem[] = validatedItems.map((v, idx) => {
      const discount = distributedDiscounts.get(`item_${idx}`) || 0;
      const lineTotal = v.grossLineTotal - discount;

      let inventoryQuantityDelta = 0;
      if (!v.isOpenAmount && v.product) {
        if (v.isWeight) {
          inventoryQuantityDelta = -(v.inputItem.weightGrams ?? v.inputItem.quantity);
        } else {
          inventoryQuantityDelta = -(v.inputItem.quantity * v.unitFactor);
        }
      }

      return {
        id: generateUuid(),
        businessId: input.businessId,
        saleId,
        productId: v.isOpenAmount ? null : v.product!.id,
        presentationId: v.presentation?.id || null,
        productNameSnapshot: v.isOpenAmount
          ? (v.inputItem.customDescription?.trim() || 'Monto libre')
          : v.product!.name,
        presentationNameSnapshot: v.presentation?.name || null,
        baseUnit: v.isOpenAmount ? 'UNIT' : v.product!.baseUnit,
        presentationFactor: v.unitFactor,
        lineType: v.isOpenAmount ? 'OPEN_AMOUNT' : 'PRODUCT',
        saleMode: v.isWeight ? 'WEIGHT' : 'UNIT',
        weightGrams: v.isWeight ? (v.inputItem.weightGrams ?? v.inputItem.quantity) : null,
        quantity: v.isOpenAmount ? 1000 : v.inputItem.quantity,
        inventoryQuantityDelta,
        unitPrice: v.officialUnitPrice,
        discountTotal: discount,
        lineTotal,
        unitCostSnapshot: v.unitCostSnapshot ?? null,
        lineCostTotal: v.unitCostSnapshot != null
          ? Number((BigInt(Math.abs(inventoryQuantityDelta)) * BigInt(v.unitCostSnapshot) + 500n) / 1000n)
          : null,
        costQualitySnapshot: v.costQuality,
        skuSnapshot: v.presentation?.sku || v.product?.sku || null,
        barcodeSnapshot: v.presentation?.barcode || v.product?.barcode || null,
        createdAt: now,
      };
    });

    for (const p of validatedPayments) {
      p.saleId = saleId;
      p.currencyCode = currencyCode;
    }

    // Consolidated SALE_CASH movement (Single movement per sale)
    const cashApplied = validatedPayments
      .filter((p) => p.paymentMethodCode === 'CASH')
      .reduce((sum, p) => sum + p.amount, 0);

    let cashMovement: CashMovement | null = null;
    if (cashApplied > 0 && activeCashSessionId && activeCashRegisterId) {
      cashMovement = {
        id: generateUuid(),
        businessId: input.businessId,
        cashSessionId: activeCashSessionId,
        cashRegisterId: activeCashRegisterId,
        movementType: 'SALE_CASH',
        amount: cashApplied,
        currencyCode,
        reason: `Venta POS #${saleNumber || saleId.slice(0, 8)}`,
        note: null,
        referenceType: 'SALE',
        referenceId: saleId,
        createdByUserId: input.userId,
        createdByNameSnapshot: input.userName,
        createdAt: now,
      };
    }

    // 7. Execute Atomic Transaction in SQLite
    try {
      const created = await this.saleRepo.createSaleTransaction(
        sale,
        saleItems,
        validatedPayments,
        inventoryMovements,
        cashMovement
      );

      // 8. Build Receipt DTO
      const receipt = buildReceiptDTO(created.sale, created.items, created.payments, {
        name: business?.name || 'SevenPOS',
        fiscalId: business?.fiscalId,
        address: business?.address,
        phone: business?.phone,
      });

      logger.info('CompleteSale', `Sale #${saleNumber} successfully completed (Total: ${total} ${currencyCode})`);

      salesEventBus.notifySaleCompleted();

      return {
        success: true,
        saleWithDetails: created,
        receipt,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error('CompleteSale', 'Critical error during atomic sale transaction', { error: errorMsg });
      return {
        success: false,
        error: `Error al procesar la venta: ${errorMsg}`,
        errorType: 'TRANSACTION_FAILED',
      };
    }
  }
}
