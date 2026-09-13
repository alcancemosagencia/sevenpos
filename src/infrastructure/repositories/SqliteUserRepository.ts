import { UserRepository } from '../../domain/user/UserRepository';
import { User, UserRole, normalizeUserRole } from '../../domain/user/User';
import { DatabaseManager } from '../database/DatabaseManager';
import { logger } from '../logging/Logger';

interface UserRow {
  id: string;
  business_id: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  role: string;
  active: number;
  cloud_user_id?: string | null;
  last_login_at?: string | null;
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
    const normalized = normalizeUserRole(row.role);
    let role: UserRole;
    if (normalized) {
      role = normalized;
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[SqliteUserRepository] Invalid/unknown role encountered: "${row.role}". Failing closed.`);
      }
      role = 'INVALID';
    }

    return {
      id: row.id,
      businessId: row.business_id,
      firstName: row.first_name,
      lastName: row.last_name || null,
      email: row.email || null,
      role,
      active: row.active === 1,
      cloudUserId: row.cloud_user_id || null,
      lastLoginAt: row.last_login_at || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getOwnerUser(): Promise<User | null> {
    try {
      const db = await this.getDb();
      const rows = await db.select<UserRow[]>(
        "SELECT id, business_id, first_name, last_name, email, role, active, cloud_user_id, last_login_at, created_at, updated_at FROM users WHERE UPPER(role) IN ('OWNER', 'DUEÑO') LIMIT 1;"
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
        'SELECT id, business_id, first_name, last_name, email, role, active, cloud_user_id, last_login_at, created_at, updated_at FROM users WHERE id = $1 LIMIT 1;',
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
        'SELECT id, business_id, first_name, last_name, email, role, active, cloud_user_id, last_login_at, created_at, updated_at FROM users WHERE business_id = $1 ORDER BY created_at ASC;',
        [businessId]
      );
      return rows.map((r) => this.mapRow(r));
    } catch (err) {
      logger.error('SqliteUserRepository', 'Failed to getUsersByBusinessId', { error: String(err) });
      throw err;
    }
  }

  async getActiveUsersByBusinessId(businessId: string): Promise<User[]> {
    try {
      const db = await this.getDb();
      const rows = await db.select<UserRow[]>(
        'SELECT id, business_id, first_name, last_name, email, role, active, cloud_user_id, last_login_at, created_at, updated_at FROM users WHERE business_id = $1 AND active = 1 ORDER BY created_at ASC;',
        [businessId]
      );
      return rows.map((r) => this.mapRow(r));
    } catch (err) {
      logger.error('SqliteUserRepository', 'Failed to getActiveUsersByBusinessId', { error: String(err) });
      throw err;
    }
  }

  async getUsersByRole(businessId: string, role: UserRole): Promise<User[]> {
    try {
      const db = await this.getDb();
      const rows = await db.select<UserRow[]>(
        'SELECT id, business_id, first_name, last_name, email, role, active, cloud_user_id, last_login_at, created_at, updated_at FROM users WHERE business_id = $1 AND role = $2 AND active = 1 ORDER BY created_at ASC;',
        [businessId, role]
      );
      return rows.map((r) => this.mapRow(r));
    } catch (err) {
      logger.error('SqliteUserRepository', 'Failed to getUsersByRole', { error: String(err) });
      throw err;
    }
  }

  async saveUser(user: User): Promise<void> {
    const normalized = normalizeUserRole(user.role);
    if (!normalized || normalized === 'INVALID') {
      throw new Error(`Cannot persist user with invalid role: "${user.role}"`);
    }

    try {
      const db = await this.getDb();
      await db.execute(
        `INSERT INTO users (id, business_id, first_name, last_name, email, role, active, cloud_user_id, last_login_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
        [
          user.id,
          user.businessId,
          user.firstName,
          user.lastName || null,
          user.email || null,
          normalized,
          user.active ? 1 : 0,
          user.cloudUserId || null,
          user.lastLoginAt || null,
          user.createdAt,
          user.updatedAt,
        ]
      );
      logger.info('SqliteUserRepository', `User saved: ${user.firstName} (${normalized})`);
    } catch (err) {
      logger.error('SqliteUserRepository', 'Failed to saveUser', { error: String(err) });
      throw err;
    }
  }

  async updateUser(user: User): Promise<void> {
    const normalized = normalizeUserRole(user.role);
    if (!normalized || normalized === 'INVALID') {
      throw new Error(`Cannot persist user with invalid role: "${user.role}"`);
    }

    try {
      const db = await this.getDb();
      await db.execute(
        `UPDATE users SET first_name = $1, last_name = $2, email = $3, role = $4, active = $5, cloud_user_id = $6, last_login_at = $7, updated_at = $8
         WHERE id = $9;`,
        [
          user.firstName,
          user.lastName || null,
          user.email || null,
          normalized,
          user.active ? 1 : 0,
          user.cloudUserId || null,
          user.lastLoginAt || null,
          user.updatedAt,
          user.id,
        ]
      );
    } catch (err) {
      logger.error('SqliteUserRepository', 'Failed to updateUser', { error: String(err) });
      throw err;
    }
  }

  async updateLastLogin(userId: string, timestamp: string): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execute(
        'UPDATE users SET last_login_at = $1, updated_at = $2 WHERE id = $3;',
        [timestamp, timestamp, userId]
      );
    } catch (err) {
      logger.error('SqliteUserRepository', 'Failed to updateLastLogin', { error: String(err) });
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

