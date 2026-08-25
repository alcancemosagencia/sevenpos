import { CustomerWithStats, CustomerMetrics } from '../../domain/customers/Customer';
import {
  CustomerQueryRepository,
  CustomerSalesHistoryOptions,
} from '../../domain/customers/repositories/CustomerQueryRepository';
import { CustomerRepository } from '../../domain/customers/repositories/CustomerRepository';
import { SaleRepository } from '../../domain/sales/repositories/SaleRepository';
import { Sale } from '../../domain/sales/Sale';

export class InMemoryCustomerQueryRepository implements CustomerQueryRepository {
  constructor(
    private customerRepo: CustomerRepository,
    private saleRepo: SaleRepository
  ) {}

  async getKPIMetrics(businessId: string): Promise<CustomerMetrics> {
    const customers = await this.customerRepo.list(businessId, { includeInactive: true });
    const allSales = await this.saleRepo.listSales(businessId, { limit: 10000 });
    const completedSales = allSales.filter((s) => s.status === 'COMPLETED');

    const activeCustomersCount = customers.filter((c) => c.active).length;

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const newCustomersThisMonthCount = customers.filter((c) =>
      c.createdAt.startsWith(currentYearMonth)
    ).length;

    const customersWithPurchases = new Set(
      completedSales.filter((s) => s.customerId).map((s) => s.customerId!)
    );
    const customersWithPurchasesCount = customersWithPurchases.size;

    const customerSales = completedSales.filter((s) => s.customerId);
    const totalSpent = customerSales.reduce((acc, s) => acc + s.total, 0);
    const globalAverageTicketPerCustomer =
      customerSales.length > 0 ? Math.round(totalSpent / customerSales.length) : 0;

    return {
      activeCustomersCount,
      newCustomersThisMonthCount,
      customersWithPurchasesCount,
      globalAverageTicketPerCustomer,
    };
  }

  async listWithStats(
    businessId: string,
    search?: string,
    limit?: number,
    offset?: number
  ): Promise<CustomerWithStats[]> {
    const customers = await this.customerRepo.list(businessId, {
      includeInactive: true,
      search,
    });
    const allSales = await this.saleRepo.listSales(businessId, { limit: 10000 });
    const completedSales = allSales.filter((s) => s.status === 'COMPLETED');

    const results: CustomerWithStats[] = customers.map((c) => {
      const cSales = completedSales.filter((s) => s.customerId === c.id);
      const salesCount = cSales.length;
      const totalSpent = cSales.reduce((acc, s) => acc + s.total, 0);
      const averageTicket = salesCount > 0 ? Math.round(totalSpent / salesCount) : 0;
      const lastSale = cSales.sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];

      return {
        ...c,
        salesCount,
        totalSpent,
        lastPurchaseAt: lastSale ? lastSale.completedAt : null,
        averageTicket,
      };
    });

    results.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    if (limit) {
      const off = offset || 0;
      return results.slice(off, off + limit);
    }
    return results;
  }

  async getCustomerStats(businessId: string, customerId: string): Promise<CustomerWithStats | null> {
    const customer = await this.customerRepo.findById(businessId, customerId);
    if (!customer) return null;

    const allSales = await this.saleRepo.listSales(businessId, { limit: 10000 });
    const cSales = allSales.filter((s) => s.status === 'COMPLETED' && s.customerId === customerId);
    const salesCount = cSales.length;
    const totalSpent = cSales.reduce((acc, s) => acc + s.total, 0);
    const averageTicket = salesCount > 0 ? Math.round(totalSpent / salesCount) : 0;
    const lastSale = cSales.sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];

    return {
      ...customer,
      salesCount,
      totalSpent,
      lastPurchaseAt: lastSale ? lastSale.completedAt : null,
      averageTicket,
    };
  }

  async getCustomerSalesHistory(
    businessId: string,
    customerId: string,
    options?: CustomerSalesHistoryOptions
  ): Promise<Sale[]> {
    const allSales = await this.saleRepo.listSales(businessId, { limit: 10000 });
    let cSales = allSales
      .filter((s) => s.customerId === customerId)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));

    if (options?.limit) {
      const off = options.offset || 0;
      cSales = cSales.slice(off, off + options.limit);
    }
    return cSales;
  }

  async getRecentCustomers(businessId: string, limit: number = 5): Promise<CustomerWithStats[]> {
    const withStats = await this.listWithStats(businessId);
    return withStats
      .filter((c) => c.active && c.lastPurchaseAt !== null)
      .sort((a, b) => (b.lastPurchaseAt || '').localeCompare(a.lastPurchaseAt || ''))
      .slice(0, limit);
  }
}
