import { Business } from './Business';
import { BusinessSettings } from './BusinessSettings';

export interface BusinessRepository {
  getPrimaryBusiness(): Promise<Business | null>;
  getBusinessSettings(businessId: string): Promise<BusinessSettings | null>;
  saveBusinessWithSettings(business: Business, settings: BusinessSettings): Promise<void>;
  updateBusiness(business: Business): Promise<void>;
  updateSettings(settings: BusinessSettings): Promise<void>;
  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string): Promise<void>;
  resetAll(): Promise<void>;
}
