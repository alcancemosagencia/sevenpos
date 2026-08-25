import { User } from './User';

export interface UserRepository {
  getOwnerUser(): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  getUsersByBusinessId(businessId: string): Promise<User[]>;
  saveUser(user: User): Promise<void>;
  updateUser(user: User): Promise<void>;
  resetAll(): Promise<void>;
}
