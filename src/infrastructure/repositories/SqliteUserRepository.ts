import { UserRepository } from '../../domain/user/UserRepository';
import { User, UserRole } from '../../domain/user/User';
import { DatabaseManager } from '../database/DatabaseManager';
import { logger } from '../logging/Logger';

interface UserRow {
  id: string;
  business_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  role: string;
  active: number;
  created_at: string;
  updated_at: string;
}

export class SqliteUserRepository implements UserRepository {
  constructor(private dbManager: DatabaseManager) {}

  private async getDb() {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      throw new Error('SQLite Database is not available in current environment.');
    }
    return db;
  }

  private mapRow(row: UserRow): User {
    return {
      id: row.id,
      businessId: row.business_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      role: row.role as UserRole,
      active: row.active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getOwnerUser(): Promise<User | null> {
    try {
      const db = await this.getDb();
      const rows = await db.select<UserRow[]>(
        "SELECT id, business_id, first_name, last_name, email, role, active, created_at, updated_at FROM users WHERE role = 'OWNER' LIMIT 1;"
      );

      if (!rows || rows.length === 0) {
        return null;
      }
      return this.mapRow(rows[0]);
    } catch (err) {
      logger.error('SqliteUserRepository', 'Failed to getOwnerUser', { error: String(err) });
      throw err;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const db = await this.getDb();
      const rows = await db.select<UserRow[]>(
        'SELECT id, business_id, first_name, last_name, email, role, active, created_at, updated_at FROM users WHERE id = $1 LIMIT 1;',
        [id]
      );

      if (!rows || rows.length === 0) {
        return null;
      }
      return this.mapRow(rows[0]);
    } catch (err) {
      logger.error('SqliteUserRepository', 'Failed to getUserById', { error: String(err) });
      throw err;
    }
  }

  async getUsersByBusinessId(businessId: string): Promise<User[]> {
    try {
      const db = await this.getDb();
      const rows = await db.select<UserRow[]>(
        'SELECT id, business_id, first_name, last_name, email, role, active, created_at, updated_at FROM users WHERE business_id = $1 ORDER BY created_at ASC;',
        [businessId]
      );
      return rows.map((r) => this.mapRow(r));
    } catch (err) {
      logger.error('SqliteUserRepository', 'Failed to getUsersByBusinessId', { error: String(err) });
      throw err;
    }
  }

  async saveUser(user: User): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execute(
        `INSERT INTO users (id, business_id, first_name, last_name, email, role, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
        [
          user.id,
          user.businessId,
          user.firstName,
          user.lastName || null,
          user.email || null,
          user.role,
          user.active ? 1 : 0,
          user.createdAt,
          user.updatedAt,
        ]
      );
      logger.info('SqliteUserRepository', `User saved: ${user.firstName} (${user.role})`);
    } catch (err) {
      logger.error('SqliteUserRepository', 'Failed to saveUser', { error: String(err) });
      throw err;
    }
  }

  async updateUser(user: User): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execute(
        `UPDATE users SET first_name = $1, last_name = $2, email = $3, role = $4, active = $5, updated_at = $6
         WHERE id = $7;`,
        [
          user.firstName,
          user.lastName || null,
          user.email || null,
          user.role,
          user.active ? 1 : 0,
          user.updatedAt,
          user.id,
        ]
      );
    } catch (err) {
      logger.error('SqliteUserRepository', 'Failed to updateUser', { error: String(err) });
      throw err;
    }
  }

  async resetAll(): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execute('DELETE FROM users;');
      logger.info('SqliteUserRepository', 'Reset all users data from SQLite.');
    } catch (err) {
      logger.error('SqliteUserRepository', 'Failed to resetAll', { error: String(err) });
      throw err;
    }
  }
}
