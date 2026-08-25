import { UserRepository } from '../../domain/user/UserRepository';
import { User } from '../../domain/user/User';

const DEV_STORAGE_KEY_USERS = 'sevenpos-dev-users';

export class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();

  constructor() {
    this.hydrateFromStorage();
  }

  private hydrateFromStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(DEV_STORAGE_KEY_USERS);
        if (raw) {
          const list: User[] = JSON.parse(raw);
          list.forEach((u) => this.users.set(u.id, u));
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

  async saveUser(user: User): Promise<void> {
    this.users.set(user.id, { ...user });
    this.saveToStorage();
  }

  async updateUser(user: User): Promise<void> {
    if (this.users.has(user.id)) {
      this.users.set(user.id, { ...user });
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

