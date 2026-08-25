export type UserRole = 'OWNER' | 'ADMIN' | 'CASHIER';

export interface User {
  id: string;
  businessId: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export function getUserDisplayName(user: User): string {
  if (user.lastName) {
    return `${user.firstName} ${user.lastName}`.trim();
  }
  return user.firstName.trim();
}
