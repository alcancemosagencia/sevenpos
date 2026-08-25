export type ExpenseCategorySystemKey =
  | 'RENT'
  | 'UTILITIES'
  | 'INTERNET_PHONE'
  | 'MARKETING'
  | 'TRANSPORT'
  | 'MAINTENANCE'
  | 'CLEANING'
  | 'SUPPLIES'
  | 'PROFESSIONAL_SERVICES'
  | 'OTHER';

export interface ExpenseCategory {
  id: string;
  businessId: string;
  systemKey: ExpenseCategorySystemKey | null;
  name: string;
  normalizedName: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseCategoryDto {
  name: string;
  description?: string | null;
  systemKey?: ExpenseCategorySystemKey | null;
}

export interface UpdateExpenseCategoryDto {
  name?: string;
  description?: string | null;
  active?: boolean;
}

export function normalizeExpenseCategoryName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export const DEFAULT_EXPENSE_CATEGORIES_DEFINITION: {
  systemKey: ExpenseCategorySystemKey;
  name: string;
  description: string;
}[] = [
  {
    systemKey: 'RENT',
    name: 'Arriendo',
    description: 'Arriendo de local u oficinas',
  },
  {
    systemKey: 'UTILITIES',
    name: 'Servicios básicos',
    description: 'Luz, agua, gas y servicios generales',
  },
  {
    systemKey: 'INTERNET_PHONE',
    name: 'Internet y telefonía',
    description: 'Conexión a internet y líneas telefónicas',
  },
  {
    systemKey: 'MARKETING',
    name: 'Publicidad y marketing',
    description: 'Publicidad digital, volantes y promociones',
  },
  {
    systemKey: 'TRANSPORT',
    name: 'Transporte',
    description: 'Fletes, combustible y traslados',
  },
  {
    systemKey: 'MAINTENANCE',
    name: 'Mantenimiento',
    description: 'Reparaciones y mantenimiento de infraestructura y equipos',
  },
  {
    systemKey: 'CLEANING',
    name: 'Limpieza',
    description: 'Artículos y servicios de aseo',
  },
  {
    systemKey: 'SUPPLIES',
    name: 'Papelería e insumos',
    description: 'Útiles de oficina, bolsas y consumibles',
  },
  {
    systemKey: 'PROFESSIONAL_SERVICES',
    name: 'Servicios profesionales',
    description: 'Contabilidad, asesorías y servicios legales',
  },
  {
    systemKey: 'OTHER',
    name: 'Otros',
    description: 'Otros gastos operativos no clasificados',
  },
];
