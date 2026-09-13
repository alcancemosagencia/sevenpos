import { UserRepository } from '../../domain/user/UserRepository';
import { User, UserRole, normalizeUserRole } from '../../domain/user/User';

const DEV_STORAGE_KEY_USERS = 'sevenpos-dev-users';

export class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();

  constructor() {
    this.hydrateFromStorage();
  }

  private sanitizeUser(u: Record<string, unknown>): User {
    const normalized = normalizeUserRole(u.role);
    let role: UserRole;
    if (normalized) {
      role = normalized;
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[InMemoryUserRepository] Invalid/unknown role encountered: "${String(u.role)}". Failing closed.`);
      }
      role = 'INVALID';
    }

    return {
      id: String(u.id || ''),
      businessId: String(u.businessId || 'primary-business'),
      firstName: String(u.firstName || u.name || 'Usuario'),
      lastName: u.lastName ? String(u.lastName) : null,
      email: u.email ? String(u.email) : null,
      role,
      active: u.active !== false,
      cloudUserId: u.cloudUserId ? String(u.cloudUserId) : null,
      lastLoginAt: u.lastLoginAt ? String(u.lastLoginAt) : null,
      createdAt: typeof u.createdAt === 'string' ? u.createdAt : new Date().toISOString(),
      updatedAt: typeof u.updatedAt === 'string' ? u.updatedAt : new Date().toISOString(),
    };
  }

  private hydrateFromStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(DEV_STORAGE_KEY_USERS);
        if (raw) {
          const list: unknown = JSON.parse(raw);
          if (Array.isArray(list)) {
            list.forEach((item) => {
              if (item && typeof item === 'object' && 'id' in item) {
                const sanitized = this.sanitizeUser(item as Record<string, unknown>);
                this.users.set(sanitized.id, sanitized);
              }
            });
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  private saveToStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        const list = Array.from(this.users.values());
        localStorage.setItem(DEV_STORAGE_KEY_USERS, JSON.stringify(list));
      } catch {
        // Ignore
      }
    }
  }

  async getOwnerUser(): Promise<User | null> {
    if (this.users.size === 0) {
      this.hydrateFromStorage();
    }
    for (const user of this.users.values()) {
      if (user.role === 'OWNER') {
        return { ...user };
      }
    }
    return null;
  }

  async getUserById(id: string): Promise<User | null> {
    if (this.users.size === 0) {
      this.hydrateFromStorage();
    }
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async getUsersByBusinessId(businessId: string): Promise<User[]> {
    if (this.users.size === 0) {
      this.hydrateFromStorage();
    }
    return Array.from(this.users.values())
      .filter((u) => u.businessId === businessId)
      .map((u) => ({ ...u }));
  }

  async getActiveUsersByBusinessId(businessId: string): Promise<User[]> {
    if (this.users.size === 0) {
      this.hydrateFromStorage();
    }
    return Array.from(this.users.values())
      .filter((u) => u.businessId === businessId && u.active)
      .map((u) => ({ ...u }));
  }

  async getUsersByRole(businessId: string, role: UserRole): Promise<User[]> {
    if (this.users.size === 0) {
      this.hydrateFromStorage();
    }
    return Array.from(this.users.values())
      .filter((u) => u.businessId === businessId && u.role === role && u.active)
      .map((u) => ({ ...u }));
  }

  async saveUser(user: User): Promise<void> {
    const normalized = normalizeUserRole(user.role);
    if (!normalized || normalized === 'INVALID') {
      throw new Error(`Cannot persist user with invalid role: "${user.role}"`);
    }
    this.users.set(user.id, { ...user, role: normalized });
    this.saveToStorage();
  }

  async updateUser(user: User): Promise<void> {
    const normalized = normalizeUserRole(user.role);
    if (!normalized || normalized === 'INVALID') {
      throw new Error(`Cannot persist user with invalid role: "${user.role}"`);
    }
    if (this.users.has(user.id)) {
      this.users.set(user.id, { ...user, role: normalized });
      this.saveToStorage();
    }
  }

  async updateLastLogin(userId: string, timestamp: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.lastLoginAt = timestamp;
      user.updatedAt = timestamp;
      this.users.set(userId, { ...user });
      this.saveToStorage();
    }
  }

  async resetAll(): Promise<void> {
    this.users.clear();
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(DEV_STORAGE_KEY_USERS);
      } catch {
        // Ignore
      }
    }
  }
}

