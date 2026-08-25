import { CustomerWithStats, CustomerMetrics } from '../Customer';
import { Sale } from '../../sales/Sale';

export interface CustomerSalesHistoryOptions {
  limit?: number;
  offset?: number;
}

export interface CustomerQueryRepository {
  getKPIMetrics(businessId: string): Promise<CustomerMetrics>;
  listWithStats(businessId: string, search?: string, limit?: number, offset?: number): Promise<CustomerWithStats[]>;
  getCustomerStats(businessId: string, customerId: string): Promise<CustomerWithStats | null>;
  getCustomerSalesHistory(
    businessId: string,
    customerId: string,
    options?: CustomerSalesHistoryOptions
  ): Promise<Sale[]>;
  getRecentCustomers(businessId: string, limit?: number): Promise<CustomerWithStats[]>;
}
