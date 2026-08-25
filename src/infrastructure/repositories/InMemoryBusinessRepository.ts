import { BusinessRepository } from '../../domain/business/BusinessRepository';
import { Business } from '../../domain/business/Business';
import { BusinessSettings } from '../../domain/business/BusinessSettings';

const DEV_STORAGE_KEY_BUSINESS = 'sevenpos-dev-business';
const DEV_STORAGE_KEY_SETTINGS = 'sevenpos-dev-settings';

export class InMemoryBusinessRepository implements BusinessRepository {
  private business: Business | null = null;
  private settings: BusinessSettings | null = null;

  constructor() {
    if (typeof localStorage !== 'undefined') {
      try {
        const rawB = localStorage.getItem(DEV_STORAGE_KEY_BUSINESS);
        if (rawB) this.business = JSON.parse(rawB);
        const rawS = localStorage.getItem(DEV_STORAGE_KEY_SETTINGS);
        if (rawS) this.settings = JSON.parse(rawS);
      } catch {
        // Ignore read errors
      }
    }
  }

  async getPrimaryBusiness(): Promise<Business | null> {
    if (!this.business && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(DEV_STORAGE_KEY_BUSINESS);
        if (raw) this.business = JSON.parse(raw);
      } catch {
        // Ignore
      }
    }
    return this.business ? { ...this.business } : null;
  }

  async getBusinessSettings(businessId: string): Promise<BusinessSettings | null> {
    if (!this.settings && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(DEV_STORAGE_KEY_SETTINGS);
        if (raw) this.settings = JSON.parse(raw);
      } catch {
        // Ignore
      }
    }
    if (this.settings && this.settings.businessId === businessId) {
      return { ...this.settings };
    }
    return null;
  }

  async saveBusinessWithSettings(business: Business, settings: BusinessSettings): Promise<void> {
    this.business = { ...business };
    this.settings = { ...settings };
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(DEV_STORAGE_KEY_BUSINESS, JSON.stringify(business));
        localStorage.setItem(DEV_STORAGE_KEY_SETTINGS, JSON.stringify(settings));
      } catch {
        // Ignore
      }
    }
  }

  async updateBusiness(business: Business): Promise<void> {
    if (this.business && this.business.id === business.id) {
      this.business = { ...business };
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(DEV_STORAGE_KEY_BUSINESS, JSON.stringify(business));
        } catch {
          // Ignore
        }
      }
    }
  }

  async updateSettings(settings: BusinessSettings): Promise<void> {
    if (this.settings && this.settings.businessId === settings.businessId) {
      this.settings = { ...settings };
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(DEV_STORAGE_KEY_SETTINGS, JSON.stringify(settings));
        } catch {
          // Ignore
        }
      }
    }
  }

  async resetAll(): Promise<void> {
    this.business = null;
    this.settings = null;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(DEV_STORAGE_KEY_BUSINESS);
        localStorage.removeItem(DEV_STORAGE_KEY_SETTINGS);
      } catch {
        // Ignore
      }
    }
  }
}

