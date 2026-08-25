import Database from '@tauri-apps/plugin-sql';
import { isTauriEnvironment } from '../runtime/environment';
import { logger } from '../logging/Logger';

export interface DatabaseHealth {
  isOpen: boolean;
  isTauriNative: boolean;
  databasePath: string;
  foreignKeysEnabled: boolean;
  tables: string[];
  error?: string;
}

export class DatabaseManager {
  private dbInstance: Database | null = null;
  private isInitializing = false;
  private readonly dbUrl = 'sqlite:sevenpos.db';

  async getDatabase(): Promise<Database | null> {
    if (this.dbInstance) {
      return this.dbInstance;
    }

    if (!isTauriEnvironment()) {
      logger.info('DatabaseManager', 'Running outside Tauri native environment; SQLite direct instance unavailable.');
      return null;
    }

    if (this.isInitializing) {
      // Wait for existing initialization promise
      while (this.isInitializing) {
        await new Promise((r) => setTimeout(r, 50));
      }
      return this.dbInstance;
    }

    this.isInitializing = true;
    try {
      logger.info('DatabaseManager', `Opening Tauri SQLite database: ${this.dbUrl}`);
      const db = await Database.load(this.dbUrl);

      // Verify and enable Foreign Keys
      await db.execute('PRAGMA foreign_keys = ON;');

      this.dbInstance = db;
      logger.info('DatabaseManager', 'SQLite database successfully opened with foreign keys enabled.');
      return db;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error('DatabaseManager', 'Failed to load SQLite database via Tauri SQL plugin', { error: errorMsg });
      throw new Error(`Error al abrir base de datos SQLite (${this.dbUrl}): ${errorMsg}`, { cause: err });
    } finally {
      this.isInitializing = false;
    }
  }

  async healthCheck(): Promise<DatabaseHealth> {
    const isNative = isTauriEnvironment();
    if (!isNative) {
      return {
        isOpen: false,
        isTauriNative: false,
        databasePath: this.dbUrl,
        foreignKeysEnabled: false,
        tables: [],
        error: 'Entorno Browser Dev (SQLite nativo inactivo)',
      };
    }

    try {
      const db = await this.getDatabase();
      if (!db) {
        throw new Error('No se pudo obtener la instancia de base de datos.');
      }

      // Check foreign keys status
      const fkResult = await db.select<{ foreign_keys: number }[]>('PRAGMA foreign_keys;');
      const fkEnabled = fkResult?.[0]?.foreign_keys === 1;

      // Query table names
      const tablesResult = await db.select<{ name: string }[]>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_sqlx_%';"
      );
      const tables = tablesResult.map((r) => r.name);

      return {
        isOpen: true,
        isTauriNative: true,
        databasePath: this.dbUrl,
        foreignKeysEnabled: fkEnabled,
        tables,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        isOpen: false,
        isTauriNative: true,
        databasePath: this.dbUrl,
        foreignKeysEnabled: false,
        tables: [],
        error: errorMsg,
      };
    }
  }

  async close(): Promise<void> {
    if (this.dbInstance) {
      await this.dbInstance.close();
      this.dbInstance = null;
      logger.info('DatabaseManager', 'SQLite database closed.');
    }
  }
}

export const databaseManager = new DatabaseManager();
