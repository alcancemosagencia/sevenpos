import { CustomerMetrics } from '../../domain/customers/Customer';
import { CustomerQueryRepository } from '../../domain/customers/repositories/CustomerQueryRepository';

export class GetCustomerMetrics {
  constructor(private customerQueryRepo: CustomerQueryRepository) {}

  async execute(businessId: string): Promise<CustomerMetrics> {
    return this.customerQueryRepo.getKPIMetrics(businessId);
  }
}
