import { ExpenseCategory, UpdateExpenseCategoryDto, normalizeExpenseCategoryName } from '../../domain/expenses/ExpenseCategory';
import { ExpenseCategoryRepository } from '../../domain/expenses/repositories/ExpenseCategoryRepository';

export class UpdateExpenseCategory {
  constructor(private categoryRepo: ExpenseCategoryRepository) {}

  async execute(businessId: string, id: string, dto: UpdateExpenseCategoryDto): Promise<ExpenseCategory> {
    if (!businessId || !id) {
      throw new Error('INVALID_ARGUMENTS: Identificadores requeridos.');
    }

    const current = await this.categoryRepo.findById(businessId, id);
    if (!current) {
      throw new Error('EXPENSE_CATEGORY_NOT_FOUND: La categoría especificada no existe.');
    }

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (trimmedName.length === 0) {
        throw new Error('EXPENSE_CATEGORY_NAME_REQUIRED: El nombre de la categoría no puede estar vacío.');
      }
      const normalized = normalizeExpenseCategoryName(trimmedName);
      if (normalized !== current.normalizedName) {
        const existing = await this.categoryRepo.findByNormalizedName(businessId, normalized);
        if (existing && existing.id !== id) {
          throw new Error(`EXPENSE_CATEGORY_DUPLICATE: Ya existe otra categoría con el nombre "${existing.name}".`);
        }
      }
    }

    return this.categoryRepo.update(businessId, id, {
      name: dto.name?.trim(),
      description: dto.description !== undefined ? (dto.description ? dto.description.trim() : null) : undefined,
      active: dto.active,
    });
  }
}
