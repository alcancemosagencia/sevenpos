import { Customer } from '../../domain/customers/Customer';
import { CustomerRepository } from '../../domain/customers/repositories/CustomerRepository';

export class SearchCustomers {
  constructor(private customerRepo: CustomerRepository) {}

  async execute(
    businessId: string,
    query: string,
    limit: number = 20
  ): Promise<Customer[]> {
    if (!query || !query.trim()) {
      return this.customerRepo.list(businessId, { includeInactive: false, limit });
    }
    return this.customerRepo.search(businessId, query.trim(), limit);
  }
}
