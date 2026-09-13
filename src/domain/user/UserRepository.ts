import { User, UserRole } from './User';

export interface UserRepository {
  getOwnerUser(): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  getUsersByBusinessId(businessId: string): Promise<User[]>;
  getActiveUsersByBusinessId(businessId: string): Promise<User[]>;
  getUsersByRole(businessId: string, role: UserRole): Promise<User[]>;
  saveUser(user: User): Promise<void>;
  updateUser(user: User): Promise<void>;
  updateLastLogin(userId: string, timestamp: string): Promise<void>;
  resetAll(): Promise<void>;
}
