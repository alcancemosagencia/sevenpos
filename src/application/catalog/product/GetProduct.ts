import { ProductDetailWithPresentations, ProductRepository } from '../../../domain/catalog/ProductRepository';

export class GetProduct {
  constructor(private productRepo: ProductRepository) {}

  async execute(id: string, businessId: string): Promise<ProductDetailWithPresentations | null> {
    return this.productRepo.getDetailById(id, businessId);
  }
}
