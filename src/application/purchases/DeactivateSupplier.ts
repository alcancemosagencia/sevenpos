import { SupplierRepository } from '../../domain/purchases/repositories/SupplierRepository';

export class DeactivateSupplier {
  constructor(private supplierRepo: SupplierRepository) {}

  async execute(businessId: string, id: string): Promise<void> {
    const existing = await this.supplierRepo.findById(businessId, id);
    if (!existing) {
      throw new Error('Proveedor no encontrado.');
    }
    await this.supplierRepo.deactivate(businessId, id);
  }
}

export class ActivateSupplier {
  constructor(private supplierRepo: SupplierRepository) {}

  async execute(businessId: string, id: string): Promise<void> {
    const existing = await this.supplierRepo.findById(businessId, id);
    if (!existing) {
      throw new Error('Proveedor no encontrado.');
    }
    await this.supplierRepo.activate(businessId, id);
  }
}
