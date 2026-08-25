import { Product } from './Product';
import { ProductPresentation } from './ProductPresentation';
import { Category } from './Category';

export interface ProductFilterParams {
  businessId: string;
  query?: string;
  categoryId?: string;
  status?: 'all' | 'active' | 'inactive';
  hasPresentations?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ProductListItem {
  product: Product;
  category?: Category | null;
  presentationCount: number;
}

export interface ProductListResult {
  items: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductKpiSummary {
  activeProducts: number;
  totalCategories: number;
  uncategorizedProducts: number;
  productsWithPresentations: number;
}

export interface ProductDetailWithPresentations {
  product: Product;
  category?: Category | null;
  presentations: ProductPresentation[];
}

export interface ProductRepository {
  getById(id: string, businessId: string): Promise<Product | null>;
  getDetailById(id: string, businessId: string): Promise<ProductDetailWithPresentations | null>;
  findBySku(sku: string, businessId: string): Promise<Product | null>;
  findByBarcode(barcode: string, businessId: string): Promise<Product | null>;
  list(params: ProductFilterParams): Promise<ProductListResult>;
  getKpiSummary(businessId: string): Promise<ProductKpiSummary>;
  save(product: Product): Promise<void>;
  update(product: Product): Promise<void>;
  deactivate(id: string, businessId: string): Promise<void>;
  activate(id: string, businessId: string): Promise<void>;
  countByBusiness(businessId: string): Promise<number>;
  countByCategory(categoryId: string, businessId: string): Promise<number>;
}
