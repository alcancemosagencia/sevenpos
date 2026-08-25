/**
 * Customer Domain Entity & Canonical Normalizers
 * SEVENPOS.PRO AG-09
 */

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  lastName: string | null;
  documentType: string | null;
  documentNumber: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerDto {
  name: string;
  lastName?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface UpdateCustomerDto {
  name?: string;
  lastName?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  active?: boolean;
}

export interface CustomerWithStats extends Customer {
  salesCount: number;
  totalSpent: number; // Minor currency integer
  lastPurchaseAt: string | null;
  averageTicket: number; // Minor currency integer
}

export interface CustomerMetrics {
  activeCustomersCount: number;
  newCustomersThisMonthCount: number;
  customersWithPurchasesCount: number;
  globalAverageTicketPerCustomer: number; // Minor currency integer
}

export interface DuplicateCustomerMatch {
  field: 'document' | 'phone' | 'email';
  customer: Customer;
  matchedValue: string;
}

/**
 * Canonical display name generator for customers across all SevenPOS screens.
 */
export function getCustomerDisplayName(c: { name: string; lastName?: string | null }): string {
  if (!c) return 'Consumidor final';
  return c.lastName && c.lastName.trim().length > 0
    ? `${c.name.trim()} ${c.lastName.trim()}`
    : c.name.trim();
}

/**
 * Email normalizer: lowercase and trimmed.
 */
export function normalizeCustomerEmail(email?: string | null): string | null {
  if (!email || !email.trim()) return null;
  return email.trim().toLowerCase();
}

/**
 * Phone normalizer: preserves leading +, removes non-digit separators.
 */
export function normalizeCustomerPhone(phone?: string | null): string | null {
  if (!phone || !phone.trim()) return null;
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return null;
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

/**
 * Document normalizer: uppercase and removes dots, hyphens and whitespace for flexible match.
 */
export function normalizeCustomerDocument(documentNumber?: string | null): string | null {
  if (!documentNumber || !documentNumber.trim()) return null;
  return documentNumber.trim().toUpperCase().replace(/[\s.-]/g, '');
}
