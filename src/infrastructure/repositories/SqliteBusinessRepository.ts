import { BusinessRepository } from '../../domain/business/BusinessRepository';
import { Business } from '../../domain/business/Business';
import { BusinessSettings } from '../../domain/business/BusinessSettings';
import { DatabaseManager } from '../database/DatabaseManager';
import { logger } from '../logging/Logger';
import { SupportedCountryCode, CurrencyCode } from '../../types/country';

interface BusinessRow {
  id: string;
  name: string;
  country_code: string;
  fiscal_id: string | null;
  phone: string | null;
  phone_prefix: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

interface BusinessSettingsRow {
  business_id: string;
  primary_currency: string;
  secondary_currency: string | null;
  secondary_currency_enabled: number;
  exchange_rate_provider: string | null;
  created_at: string;
  updated_at: string;
}

export class SqliteBusinessRepository implements BusinessRepository {
  constructor(private dbManager: DatabaseManager) {}

  private async getDb() {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      throw new Error('SQLite Database is not available in current environment.');
    }
    return db;
  }

  async getPrimaryBusiness(): Promise<Business | null> {
    try {
      const db = await this.getDb();
      const rows = await db.select<BusinessRow[]>(
        'SELECT id, name, country_code, fiscal_id, phone, phone_prefix, address, created_at, updated_at FROM businesses LIMIT 1;'
      );

      if (!rows || rows.length === 0) {
        return null;
      }

      const row = rows[0];
      return {
        id: row.id,
        name: row.name,
        countryCode: row.country_code as SupportedCountryCode,
        fiscalId: row.fiscal_id,
        phone: row.phone,
        phonePrefix: row.phone_prefix,
        address: row.address,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (err) {
      logger.error('SqliteBusinessRepository', 'Failed to getPrimaryBusiness', { error: String(err) });
      throw err;
    }
  }

  async getBusinessSettings(businessId: string): Promise<BusinessSettings | null> {
    try {
      const db = await this.getDb();
      const rows = await db.select<BusinessSettingsRow[]>(
        'SELECT business_id, primary_currency, secondary_currency, secondary_currency_enabled, exchange_rate_provider, created_at, updated_at FROM business_settings WHERE business_id = $1 LIMIT 1;',
        [businessId]
      );

      if (!rows || rows.length === 0) {
        return null;
      }

      const row = rows[0];
      return {
        businessId: row.business_id,
        primaryCurrency: row.primary_currency as CurrencyCode,
        secondaryCurrency: row.secondary_currency as CurrencyCode | null,
        secondaryCurrencyEnabled: row.secondary_currency_enabled === 1,
        exchangeRateProvider: row.exchange_rate_provider,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (err) {
      logger.error('SqliteBusinessRepository', 'Failed to getBusinessSettings', { error: String(err) });
      throw err;
    }
  }

  async saveBusinessWithSettings(business: Business, settings: BusinessSettings): Promise<void> {
    try {
      const db = await this.getDb();

      // Begin transactional block
      await db.execute('BEGIN TRANSACTION;');

      await db.execute(
        `INSERT INTO businesses (id, name, country_code, fiscal_id, phone, phone_prefix, address, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
        [
          business.id,
          business.name,
          business.countryCode,
          business.fiscalId || null,
          business.phone || null,
          business.phonePrefix || null,
          business.address || null,
          business.createdAt,
          business.updatedAt,
        ]
      );

      await db.execute(
        `INSERT INTO business_settings (business_id, primary_currency, secondary_currency, secondary_currency_enabled, exchange_rate_provider, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [
          settings.businessId,
          settings.primaryCurrency,
          settings.secondaryCurrency || null,
          settings.secondaryCurrencyEnabled ? 1 : 0,
          settings.exchangeRateProvider || null,
          settings.createdAt,
          settings.updatedAt,
        ]
      );

      await db.execute('COMMIT;');
      logger.info('SqliteBusinessRepository', `Business and settings saved: ${business.name} (${business.id})`);
    } catch (err) {
      const db = await this.getDb();
      await db.execute('ROLLBACK;').catch(() => {});
      logger.error('SqliteBusinessRepository', 'Failed saveBusinessWithSettings transaction; rolled back.', { error: String(err) });
      throw err;
    }
  }

  async updateBusiness(business: Business): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execute(
        `UPDATE businesses SET name = $1, country_code = $2, fiscal_id = $3, phone = $4, phone_prefix = $5, address = $6, updated_at = $7
         WHERE id = $8;`,
        [
          business.name,
          business.countryCode,
          business.fiscalId || null,
          business.phone || null,
          business.phonePrefix || null,
          business.address || null,
          business.updatedAt,
          business.id,
        ]
      );
    } catch (err) {
      logger.error('SqliteBusinessRepository', 'Failed to updateBusiness', { error: String(err) });
      throw err;
    }
  }

  async updateSettings(settings: BusinessSettings): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execute(
        `UPDATE business_settings SET primary_currency = $1, secondary_currency = $2, secondary_currency_enabled = $3, exchange_rate_provider = $4, updated_at = $5
         WHERE business_id = $6;`,
        [
          settings.primaryCurrency,
          settings.secondaryCurrency || null,
          settings.secondaryCurrencyEnabled ? 1 : 0,
          settings.exchangeRateProvider || null,
          settings.updatedAt,
          settings.businessId,
        ]
      );
    } catch (err) {
      logger.error('SqliteBusinessRepository', 'Failed to updateSettings', { error: String(err) });
      throw err;
    }
  }

  async resetAll(): Promise<void> {
    try {
      const db = await this.getDb();
      await db.execute('DELETE FROM business_settings;');
      await db.execute('DELETE FROM businesses;');
      logger.info('SqliteBusinessRepository', 'Reset all business data from SQLite.');
    } catch (err) {
      logger.error('SqliteBusinessRepository', 'Failed to resetAll', { error: String(err) });
      throw err;
    }
  }
}
