import { SupportedCountryCode, CurrencyCode } from '../../types/country';
import { DeviceType } from '../../domain/auth/DeviceEnrollment';

export type SettingsSectionId =
  | 'general'
  | 'currency'
  | 'pos'
  | 'printing'
  | 'inventory'
  | 'security'
  | 'users'
  | 'device'
  | 'appearance';

export interface GeneralSettingsForm {
  name: string;
  fiscalId: string;
  phone: string;
  phonePrefix: string;
  address: string;
  countryCode: SupportedCountryCode;
}

export interface CurrencySettingsForm {
  countryCode: SupportedCountryCode;
  primaryCurrency: CurrencyCode;
  secondaryCurrencyEnabled: boolean;
  secondaryCurrency: CurrencyCode | null;
  exchangeRateProvider: string;
  manualExchangeRate: number;
}

export interface PosSettingsForm {
  confirmBeforeFinalizingSale: boolean;
  showStockInGrid: boolean;
  autoPrintReceipt: boolean;
}

export interface PrintingSettingsForm {
  paperFormat: '80mm' | '58mm';
}

export interface InventorySettingsForm {
  allowNegativeStock: boolean;
}

export interface DeviceSettingsData {
  deviceId: string;
  displayName: string;
  platform: string;
  deviceType: DeviceType;
  enrolledAt: string;
  status: 'active' | 'local_only';
}

export interface ChangePinInput {
  currentPin: string;
  newPin: string;
  confirmPin: string;
}
