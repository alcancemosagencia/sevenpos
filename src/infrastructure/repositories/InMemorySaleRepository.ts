import { Sale, SaleWithDetails } from '../../domain/sales/Sale';
import { SaleItem } from '../../domain/sales/SaleItem';
import { SalePayment } from '../../domain/sales/SalePayment';
import { InventoryMovement } from '../../domain/inventory/InventoryMovement';
import { SaleRepository, ListSalesOptions } from '../../domain/sales/repositories/SaleRepository';
import { InventoryMovementRepository } from '../../domain/inventory/repositories/InventoryMovementRepository';

const DEV_STORAGE_KEY_SALES = 'sevenpos-dev-sales';
const DEV_STORAGE_KEY_SALE_ITEMS = 'sevenpos-dev-sale-items';
const DEV_STORAGE_KEY_SALE_PAYMENTS = 'sevenpos-dev-sale-payments';

export class InMemorySaleRepository implements SaleRepository {
  private sales: Sale[] = [];
  private items: SaleItem[] = [];
  private payments: SalePayment[] = [];

  constructor(
    private movementRepo?: InventoryMovementRepository,
    private cashSessionRepo?: import('../../domain/cash/repositories/CashSessionRepository').CashSessionRepository,
    private customerRepo?: import('../../domain/customers/repositories/CustomerRepository').CustomerRepository
  ) {
    this.loadFromStorage();
  }

  setCashSessionRepo(repo: import('../../domain/cash/repositories/CashSessionRepository').CashSessionRepository) {
    this.cashSessionRepo = repo;
  }

  setCustomerRepo(repo: import('../../domain/customers/repositories/CustomerRepository').CustomerRepository) {
    this.customerRepo = repo;
  }

  private hasLocalStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && typeof window.localStorage.getItem === 'function';
  }

  private loadFromStorage() {
    if (this.hasLocalStorage()) {
      try {
        const rawSales = window.localStorage.getItem(DEV_STORAGE_KEY_SALES);
        const rawItems = window.localStorage.getItem(DEV_STORAGE_KEY_SALE_ITEMS);
        const rawPayments = window.localStorage.getItem(DEV_STORAGE_KEY_SALE_PAYMENTS);
        if (rawSales) this.sales = JSON.parse(rawSales);
        if (rawItems) this.items = JSON.parse(rawItems);
        if (rawPayments) this.payments = JSON.parse(rawPayments);
      } catch {
        this.sales = [];
        this.items = [];
        this.payments = [];
      }
    }
  }

  private saveToStorage() {
    if (this.hasLocalStorage()) {
      window.localStorage.setItem(DEV_STORAGE_KEY_SALES, JSON.stringify(this.sales));
      window.localStorage.setItem(DEV_STORAGE_KEY_SALE_ITEMS, JSON.stringify(this.items));
      window.localStorage.setItem(DEV_STORAGE_KEY_SALE_PAYMENTS, JSON.stringify(this.payments));
    }
  }

  async createSaleTransaction(
    sale: Sale,
    items: SaleItem[],
    payments: SalePayment[],
    movements: InventoryMovement[],
    cashMovement?: import('../../domain/cash/CashMovement').CashMovement | null
  ): Promise<SaleWithDetails> {
    if (sale.cashSessionId && this.cashSessionRepo) {
      const active = await this.cashSessionRepo.getActiveSession(sale.businessId);
      if (!active || active.id !== sale.cashSessionId) {
        throw new Error('CASH_SESSION_REQUIRED: La caja no se encuentra abierta.');
      }
    }

    // Authoritative in-transaction check & snapshot derivation for Customer
    let finalCustomerId: string | null = null;
    let finalCustomerNameSnapshot: string = 'Consumidor final';

    if (sale.customerId && this.customerRepo) {
      const customer = await this.customerRepo.findById(sale.businessId, sale.customerId);
      if (!customer) {
        throw new Error('CUSTOMER_NOT_FOUND: El cliente seleccionado no existe en este negocio.');
      }
      if (!customer.active) {
        throw new Error('CUSTOMER_INACTIVE: El cliente seleccionado se encuentra inactivo.');
      }
      finalCustomerId = customer.id;
      finalCustomerNameSnapshot =
        customer.lastName && customer.lastName.trim().length > 0
          ? `${customer.name.trim()} ${customer.lastName.trim()}`
          : customer.name.trim();
    }

    const finalizedSale: Sale = {
      ...sale,
      customerId: finalCustomerId,
      customerNameSnapshot: finalCustomerNameSnapshot,
    };

    // Atomic in-memory push
    this.sales.push({ ...finalizedSale });
    for (const item of items) {
      this.items.push({ ...item });
    }
    for (const payment of payments) {
      this.payments.push({ ...payment });
    }

    if (this.movementRepo) {
      for (const mov of movements) {
        await this.movementRepo.recordMovement(mov);
      }
    }

    if (cashMovement && this.cashSessionRepo) {
      await this.cashSessionRepo.addMovement(cashMovement);
    }

    this.saveToStorage();

    return {
      sale: { ...finalizedSale },
      items: items.map((i) => ({ ...i })),
      payments: payments.map((p) => ({ ...p })),
    };
  }

  async getSaleById(id: string): Promise<SaleWithDetails | null> {
    const sale = this.sales.find((s) => s.id === id);
    if (!sale) return null;
    const items = this.items.filter((i) => i.saleId === id);
    const payments = this.payments.filter((p) => p.saleId === id);
    return {
      sale: { ...sale },
      items: items.map((i) => ({ ...i })),
      payments: payments.map((p) => ({ ...p })),
    };
  }

  async getSaleByIdempotencyKey(businessId: string, idempotencyKey: string): Promise<SaleWithDetails | null> {
    const sale = this.sales.find((s) => s.businessId === businessId && s.idempotencyKey === idempotencyKey);
    if (!sale) return null;
    return this.getSaleById(sale.id);
  }

  async getNextSaleSequence(businessId: string): Promise<{ sequence: number; saleNumber: string }> {
    const bizSales = this.sales.filter((s) => s.businessId === businessId);
    let maxSeq = 0;
    for (const s of bizSales) {
      if (s.saleSequence > maxSeq) maxSeq = s.saleSequence;
    }
    const nextSeq = maxSeq + 1;
    const saleNumber = `V-${String(nextSeq).padStart(6, '0')}`;
    return { sequence: nextSeq, saleNumber };
  }

  async listSales(businessId: string, options?: ListSalesOptions): Promise<Sale[]> {
    let list = this.sales.filter((s) => s.businessId === businessId);
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (options?.offset) {
      list = list.slice(options.offset);
    }
    if (options?.limit) {
      list = list.slice(0, options.limit);
    }

    return list.map((s) => ({ ...s }));
  }

  async countSales(businessId: string): Promise<number> {
    return this.sales.filter((s) => s.businessId === businessId).length;
  }

  async getSalesSummary(
    businessId: string,
    fromUtc: string,
    toUtc: string
  ): Promise<import('../../domain/sales/repositories/SaleRepository').SalesPeriodSummary> {
    const periodSales = this.sales.filter(
      (s) =>
        s.businessId === businessId &&
        s.status === 'COMPLETED' &&
        s.completedAt >= fromUtc &&
        s.completedAt < toUtc
    );

    const totalSales = periodSales.reduce((acc, s) => acc + s.total, 0);
    const totalDiscount = periodSales.reduce((acc, s) => acc + s.discountTotal, 0);
    const ticketCount = periodSales.length;

    const saleIds = new Set(periodSales.map((s) => s.id));
    const periodItems = this.items.filter((i) => saleIds.has(i.saleId));

    let hasUncosted = false;
    let realProfit = 0;

    for (const item of periodItems) {
      if (item.costQualitySnapshot === 'REAL') {
        const cost = item.lineCostTotal != null ? item.lineCostTotal : 0;
        realProfit += item.lineTotal - cost;
      } else {
        hasUncosted = true;
      }
    }

    const profitQuality = hasUncosted || periodItems.length === 0 ? 'INCOMPLETE' : 'COMPLETE';
    const profitMinor = profitQuality === 'COMPLETE' ? realProfit : null;

    return {
      totalSales,
      ticketCount,
      totalDiscount,
      profitMinor,
      profitQuality,
    };
  }

  async getHourlySales(
    businessId: string,
    fromUtc: string,
    toUtc: string
  ): Promise<import('../../domain/sales/repositories/SaleRepository').HourlySalesPoint[]> {
    const periodSales = this.sales.filter(
      (s) =>
        s.businessId === businessId &&
        s.status === 'COMPLETED' &&
        s.completedAt >= fromUtc &&
        s.completedAt < toUtc
    );

    const hourMap = new Map<number, { total: number; count: number }>();
    for (let h = 0; h < 24; h++) {
      hourMap.set(h, { total: 0, count: 0 });
    }

    for (const s of periodSales) {
      const d = new Date(s.completedAt);
      const h = d.getHours();
      const curr = hourMap.get(h) || { total: 0, count: 0 };
      curr.total += s.total;
      curr.count += 1;
      hourMap.set(h, curr);
    }

    const result: import('../../domain/sales/repositories/SaleRepository').HourlySalesPoint[] = [];
    for (let h = 0; h < 24; h++) {
      const entry = hourMap.get(h) || { total: 0, count: 0 };
      result.push({
        hour: h,
        label: `${String(h).padStart(2, '0')}:00`,
        totalSales: entry.total,
        ticketCount: entry.count,
      });
    }
    return result;
  }

  async getTopSellingProducts(
    businessId: string,
    fromUtc: string,
    toUtc: string,
    limit = 5
  ): Promise<import('../../domain/sales/repositories/SaleRepository').TopSellingProductRow[]> {
    const periodSales = this.sales.filter(
      (s) =>
        s.businessId === businessId &&
        s.status === 'COMPLETED' &&
        s.completedAt >= fromUtc &&
        s.completedAt < toUtc
    );

    const saleIds = new Set(periodSales.map((s) => s.id));
    const periodItems = this.items.filter((i) => saleIds.has(i.saleId));

    const prodMap = new Map<
      string,
      {
        name: string;
        baseUnit: string;
        quantityScaled: number;
        revenue: number;
        saleIds: Set<string>;
      }
    >();

    for (const item of periodItems) {
      const existing = prodMap.get(item.productId) || {
        name: item.productNameSnapshot,
        baseUnit: item.baseUnit,
        quantityScaled: 0,
        revenue: 0,
        saleIds: new Set<string>(),
      };
      existing.quantityScaled += item.quantity;
      existing.revenue += item.lineTotal;
      existing.saleIds.add(item.saleId);
      prodMap.set(item.productId, existing);
    }

    const list = Array.from(prodMap.entries()).map(([productId, data]) => ({
      productId,
      productName: data.name,
      baseUnit: data.baseUnit,
      totalQuantityMajor: data.quantityScaled / 1000,
      totalRevenue: data.revenue,
      transactionCount: data.saleIds.size,
    }));

    list.sort((a, b) => b.totalRevenue - a.totalRevenue);
    return list.slice(0, limit);
  }
}
