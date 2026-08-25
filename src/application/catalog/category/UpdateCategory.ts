import { Category, validateCategory } from '../../../domain/catalog/Category';
import { CategoryRepository } from '../../../domain/catalog/CategoryRepository';

export interface UpdateCategoryDTO {
  id: string;
  businessId: string;
  name: string;
  description?: string | null;
  color?: string | null;
  active?: boolean;
}

export class UpdateCategory {
  constructor(private categoryRepo: CategoryRepository) {}

  async execute(dto: UpdateCategoryDTO): Promise<{ success: boolean; category?: Category; error?: string }> {
    const existing = await this.categoryRepo.getById(dto.id, dto.businessId);
    if (!existing) {
      return { success: false, error: 'La categoría no existe o no pertenece a este negocio.' };
    }

    const trimmedName = dto.name ? dto.name.trim() : existing.name;

    const validation = validateCategory({ ...existing, ...dto, name: trimmedName });
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // Check name collision with another category
    if (trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await this.categoryRepo.findByName(trimmedName, dto.businessId);
      if (duplicate && duplicate.id !== dto.id && duplicate.active) {
        return { success: false, error: `Ya existe otra categoría activa con el nombre "${trimmedName}".` };
      }
    }

    const updated: Category = {
      ...existing,
      name: trimmedName,
      description: dto.description !== undefined ? dto.description?.trim() || null : existing.description,
      color: dto.color !== undefined ? dto.color : existing.color,
      active: dto.active !== undefined ? dto.active : existing.active,
      updatedAt: new Date().toISOString(),
    };

    await this.categoryRepo.update(updated);

    return {
      success: true,
      category: updated,
    };
  }
}
