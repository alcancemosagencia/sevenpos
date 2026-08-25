import { Category, validateCategory } from '../../../domain/catalog/Category';
import { CategoryRepository } from '../../../domain/catalog/CategoryRepository';

export interface CreateCategoryDTO {
  businessId: string;
  name: string;
  description?: string | null;
  color?: string | null;
}

export class CreateCategory {
  constructor(private categoryRepo: CategoryRepository) {}

  async execute(dto: CreateCategoryDTO): Promise<{ success: boolean; category?: Category; error?: string }> {
    const trimmedName = dto.name ? dto.name.trim() : '';

    const validation = validateCategory({ ...dto, name: trimmedName });
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // Check for duplicate category name within this business (case-insensitive)
    const existing = await this.categoryRepo.findByName(trimmedName, dto.businessId);
    if (existing && existing.active) {
      return { success: false, error: `Ya existe una categoría activa con el nombre "${trimmedName}".` };
    }

    const now = new Date().toISOString();
    const category: Category = {
      id: crypto.randomUUID(),
      businessId: dto.businessId,
      name: trimmedName,
      description: dto.description?.trim() || null,
      color: dto.color || '#3b82f6',
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    await this.categoryRepo.save(category);

    return {
      success: true,
      category,
    };
  }
}
