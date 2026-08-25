import { ProductPresentation } from '../../../domain/catalog/ProductPresentation';
import { ProductPresentationRepository } from '../../../domain/catalog/ProductPresentationRepository';

export class ListProductPresentations {
  constructor(private presentationRepo: ProductPresentationRepository) {}

  async execute(productId: string, businessId: string, activeOnly = false): Promise<ProductPresentation[]> {
    return this.presentationRepo.listByProduct(productId, businessId, activeOnly);
  }
}
