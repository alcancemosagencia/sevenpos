import { ProductRepository, ProductFilterParams, ProductListResult, ProductKpiSummary } from '../../../domain/catalog/ProductRepository';

export class ListProducts {
  constructor(private productRepo: ProductRepository) {}

  async execute(params: ProductFilterParams): Promise<ProductListResult> {
    return this.productRepo.list(params);
  }

  async getKpis(businessId: string): Promise<ProductKpiSummary> {
    return this.productRepo.getKpiSummary(businessId);
  }
}
