import { CurrencyCode } from '../../types/country';

export interface BusinessSettings {
  businessId: string;
  primaryCurrency: CurrencyCode;
  secondaryCurrency?: CurrencyCode | null;
  secondaryCurrencyEnabled: boolean;
  exchangeRateProvider?: string | null;
  createdAt: string;
  updatedAt: string;
}
