import { ProductPresentation } from './ProductPresentation';

export interface ProductPresentationRepository {
  getById(id: string, businessId: string): Promise<ProductPresentation | null>;
  listByProduct(productId: string, businessId: string, activeOnly?: boolean): Promise<ProductPresentation[]>;
  findBySku(sku: string, businessId: string): Promise<ProductPresentation | null>;
  findByBarcode(barcode: string, businessId: string): Promise<ProductPresentation | null>;
  save(presentation: ProductPresentation): Promise<void>;
  update(presentation: ProductPresentation): Promise<void>;
  deactivate(id: string, businessId: string): Promise<void>;
  activate(id: string, businessId: string): Promise<void>;
  countByProduct(productId: string, businessId: string): Promise<number>;
}
