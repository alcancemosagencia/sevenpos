export type UserRole = 'OWNER' | 'ADMIN' | 'CASHIER' | 'INVALID';

export interface User {
  id: string;
  businessId: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  role: UserRole;
  active: boolean;
  cloudUserId?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function normalizeUserRole(raw: unknown): UserRole | null {
  if (typeof raw !== 'string') return null;
  const upper = raw.trim().toUpperCase();
  if (upper === 'OWNER' || upper === 'DUEÑO') return 'OWNER';
  if (upper === 'ADMIN' || upper === 'ADMINISTRADOR') return 'ADMIN';
  if (upper === 'CASHIER' || upper === 'CAJERO') return 'CASHIER';
  return null;
}

export function getUserDisplayName(user: Pick<User, 'firstName' | 'lastName'>): string {
  if (user.lastName && user.lastName.trim().length > 0) {
    return `${user.firstName.trim()} ${user.lastName.trim()}`.trim();
  }
  return user.firstName.trim();
}

export function formatUserRole(role: UserRole): string {
  switch (role) {
    case 'OWNER':
      return 'Dueño';
    case 'ADMIN':
      return 'Administrador';
    case 'CASHIER':
      return 'Cajero';
    case 'INVALID':
      return 'Rol no válido';
    default:
      return role;
  }
}
