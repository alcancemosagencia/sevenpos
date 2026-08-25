import { Category } from '../../../domain/catalog/Category';
import { CategoryRepository } from '../../../domain/catalog/CategoryRepository';

export class ListCategories {
  constructor(private categoryRepo: CategoryRepository) {}

  async execute(businessId: string, activeOnly = false): Promise<Category[]> {
    return this.categoryRepo.list(businessId, activeOnly);
  }
}
