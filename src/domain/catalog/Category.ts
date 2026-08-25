export interface Category {
  id: string;
  businessId: string;
  name: string;
  description?: string | null;
  color?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export function normalizeCategoryName(name: string): string {
  return name ? name.trim().toLowerCase() : '';
}

export function validateCategory(category: Partial<Category>): { isValid: boolean; error?: string } {
  if (!category.businessId || !category.businessId.trim()) {
    return { isValid: false, error: 'El identificador de negocio es obligatorio.' };
  }
  if (!category.name || !category.name.trim()) {
    return { isValid: false, error: 'El nombre de la categoría es obligatorio.' };
  }
  if (category.name.trim().length > 100) {
    return { isValid: false, error: 'El nombre de la categoría no puede superar los 100 caracteres.' };
  }
  return { isValid: true };
}
