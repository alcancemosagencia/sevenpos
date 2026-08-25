import { CustomerWithStats } from '../../domain/customers/Customer';
import { CustomerQueryRepository, CustomerSalesHistoryOptions } from '../../domain/customers/repositories/CustomerQueryRepository';
import { Sale } from '../../domain/sales/Sale';

export interface CustomerDetailResult {
  customer: CustomerWithStats;
  salesHistory: Sale[];
}

export class GetCustomerDetail {
  constructor(private customerQueryRepo: CustomerQueryRepository) {}

  async execute(
    businessId: string,
    customerId: string,
    historyOptions?: CustomerSalesHistoryOptions
  ): Promise<CustomerDetailResult | null> {
    const customer = await this.customerQueryRepo.getCustomerStats(businessId, customerId);
    if (!customer) return null;

    const salesHistory = await this.customerQueryRepo.getCustomerSalesHistory(
      businessId,
      customerId,
      historyOptions
    );

    return {
      customer,
      salesHistory,
    };
  }
}
