import { Supplier } from '../../domain/purchases/Supplier';
import { SupplierRepository } from '../../domain/purchases/repositories/SupplierRepository';

export class ListSuppliers {
  constructor(private supplierRepo: SupplierRepository) {}

  async execute(businessId: string, includeInactive: boolean = false): Promise<Supplier[]> {
    return this.supplierRepo.list(businessId, includeInactive);
  }
}
