import { CategoryRepository } from '../../../domain/catalog/CategoryRepository';

export class DeactivateCategory {
  constructor(private categoryRepo: CategoryRepository) {}

  async execute(id: string, businessId: string): Promise<{ success: boolean; error?: string }> {
    const existing = await this.categoryRepo.getById(id, businessId);
    if (!existing) {
      return { success: false, error: 'La categoría no existe.' };
    }
    await this.categoryRepo.deactivate(id, businessId);
    return { success: true };
  }
}
