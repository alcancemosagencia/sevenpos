import { Category } from './Category';

export interface CategoryRepository {
  getById(id: string, businessId: string): Promise<Category | null>;
  findByName(name: string, businessId: string): Promise<Category | null>;
  list(businessId: string, activeOnly?: boolean): Promise<Category[]>;
  save(category: Category): Promise<void>;
  update(category: Category): Promise<void>;
  deactivate(id: string, businessId: string): Promise<void>;
  countByBusiness(businessId: string): Promise<number>;
}
