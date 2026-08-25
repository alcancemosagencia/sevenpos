import { CustomerWithStats } from '../../domain/customers/Customer';
import { CustomerQueryRepository } from '../../domain/customers/repositories/CustomerQueryRepository';

export class ListCustomers {
  constructor(private customerQueryRepo: CustomerQueryRepository) {}

  async execute(
    businessId: string,
    search?: string,
    limit?: number,
    offset?: number
  ): Promise<CustomerWithStats[]> {
    return this.customerQueryRepo.listWithStats(businessId, search, limit, offset);
  }
}
