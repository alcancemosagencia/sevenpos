import { CatalogIdentifierRepository } from '../../domain/catalog/CatalogIdentifierRepository';
import { CatalogIdentifier, IdentifierType } from '../../domain/catalog/CatalogIdentifier';
import { DatabaseManager } from '../database/DatabaseManager';
import { logger } from '../logging/Logger';

interface IdentifierRow {
  id: string;
  business_id: string;
  identifier_type: string;
  identifier_value: string;
  owner_type: string;
  owner_id: string;
  created_at: string;
}

export class SqliteCatalogIdentifierRepository implements CatalogIdentifierRepository {
  constructor(private dbManager: DatabaseManager) {}

  private async getDb() {
    const db = await this.dbManager.getDatabase();
    if (!db) throw new Error('SQLite Database no está disponible en este entorno.');
    return db;
  }

  async findIdentifier(businessId: string, type: IdentifierType, value: string): Promise<CatalogIdentifier | null> {
    try {
      const db = await this.getDb();
      const rows = await db.select<IdentifierRow[]>(
        'SELECT id, business_id, identifier_type, identifier_value, owner_type, owner_id, created_at FROM catalog_identifiers WHERE business_id = $1 AND identifier_type = $2 AND identifier_value = $3 LIMIT 1;',
        [businessId, type, value]
      );
      if (!rows || rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        businessId: r.business_id,
        identifierType: r.identifier_type as IdentifierType,
        identifierValue: r.identifier_value,
        ownerType: r.owner_type as 'PRODUCT' | 'PRESENTATION',
        ownerId: r.owner_id,
        createdAt: r.created_at,
      };
    } catch (err) {
      logger.error('SqliteCatalogIdentifierRepository', 'Error en findIdentifier', { error: String(err) });
      throw err;
    }
  }

  async registerIdentifier(identifier: CatalogIdentifier): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execute(
        `INSERT INTO catalog_identifiers (id, business_id, identifier_type, identifier_value, owner_type, owner_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [
          identifier.id,
          identifier.businessId,
          identifier.identifierType,
          identifier.identifierValue,
          identifier.ownerType,
          identifier.ownerId,
          identifier.createdAt,
        ]
      );
    } catch (err) {
      logger.error('SqliteCatalogIdentifierRepository', 'Error en registerIdentifier', { error: String(err) });
      throw err;
    }
  }

  async updateIdentifier(businessId: string, ownerId: string, type: IdentifierType, newValue: string): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execute(
        'DELETE FROM catalog_identifiers WHERE business_id = $1 AND owner_id = $2 AND identifier_type = $3;',
        [businessId, ownerId, type]
      );
      if (newValue && newValue.trim()) {
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        await db.execute(
          `INSERT INTO catalog_identifiers (id, business_id, identifier_type, identifier_value, owner_type, owner_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7);`,
          [id, businessId, type, newValue.trim(), 'PRODUCT', ownerId, createdAt]
        );
      }
    } catch (err) {
      logger.error('SqliteCatalogIdentifierRepository', 'Error en updateIdentifier', { error: String(err) });
      throw err;
    }
  }

  async removeIdentifiersByOwner(businessId: string, ownerId: string): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execute('DELETE FROM catalog_identifiers WHERE business_id = $1 AND owner_id = $2;', [
        businessId,
        ownerId,
      ]);
    } catch (err) {
      logger.error('SqliteCatalogIdentifierRepository', 'Error en removeIdentifiersByOwner', { error: String(err) });
      throw err;
    }
  }
}
