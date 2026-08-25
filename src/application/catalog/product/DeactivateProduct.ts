import { ProductRepository } from '../../../domain/catalog/ProductRepository';

export class DeactivateProduct {
  constructor(private productRepo: ProductRepository) {}

  async execute(id: string, businessId: string): Promise<{ success: boolean; error?: string }> {
    const existing = await this.productRepo.getById(id, businessId);
    if (!existing) {
      return { success: false, error: 'El producto no existe.' };
    }
    await this.productRepo.deactivate(id, businessId);
    return { success: true };
  }
}
