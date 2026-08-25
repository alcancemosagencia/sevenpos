import {
  ExpenseCategory,
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
} from '../ExpenseCategory';

export interface ExpenseCategoryRepository {
  findById(businessId: string, id: string): Promise<ExpenseCategory | null>;
  findByNormalizedName(businessId: string, normalizedName: string): Promise<ExpenseCategory | null>;
  findBySystemKey(businessId: string, systemKey: string): Promise<ExpenseCategory | null>;
  list(businessId: string, includeInactive?: boolean): Promise<ExpenseCategory[]>;
  create(businessId: string, dto: CreateExpenseCategoryDto): Promise<ExpenseCategory>;
  update(businessId: string, id: string, dto: UpdateExpenseCategoryDto): Promise<ExpenseCategory>;
  ensureDefaults(businessId: string): Promise<void>;
}
