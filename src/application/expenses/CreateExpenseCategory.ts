import { ExpenseCategory, CreateExpenseCategoryDto, normalizeExpenseCategoryName } from '../../domain/expenses/ExpenseCategory';
import { ExpenseCategoryRepository } from '../../domain/expenses/repositories/ExpenseCategoryRepository';

export class CreateExpenseCategory {
  constructor(private categoryRepo: ExpenseCategoryRepository) {}

  async execute(businessId: string, dto: CreateExpenseCategoryDto): Promise<ExpenseCategory> {
    if (!businessId || businessId.trim().length === 0) {
      throw new Error('BUSINESS_ID_REQUIRED: El identificador de negocio es requerido.');
    }

    const trimmedName = dto.name ? dto.name.trim() : '';
    if (trimmedName.length === 0) {
      throw new Error('EXPENSE_CATEGORY_NAME_REQUIRED: El nombre de la categoría es obligatorio.');
    }

    const normalized = normalizeExpenseCategoryName(trimmedName);
    const existing = await this.categoryRepo.findByNormalizedName(businessId, normalized);
    if (existing) {
      throw new Error(`EXPENSE_CATEGORY_DUPLICATE: Ya existe una categoría con el nombre "${existing.name}".`);
    }

    return this.categoryRepo.create(businessId, {
      name: trimmedName,
      description: dto.description?.trim() || null,
      systemKey: dto.systemKey || null,
    });
  }
}
