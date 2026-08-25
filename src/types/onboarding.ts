import { SupportedCountryCode } from './country';

export type OnboardingStatus = 'incomplete' | 'completed';
export type SessionStatus = 'locked' | 'unlocked';

export interface BusinessData {
  name: string;
  fiscalId: string;
  phone: string;
  phonePrefix: string;
  address?: string;
}

export interface RegionalSettings {
  primaryCurrencyCode: string;
  secondaryCurrencyCode?: string;
  enableSecondaryUSD: boolean;
  exchangeRateProvider?: 'BCV' | 'MANUAL';
}

export interface OwnerData {
  firstName: string;
  lastName?: string;
  email?: string;
  role: 'Dueño';
}

export interface OnboardingState {
  onboardingStatus: OnboardingStatus;
  sessionStatus: SessionStatus;
  currentStep: number;
  countryCode: SupportedCountryCode;
  business: BusinessData;
  regionalSettings: RegionalSettings;
  owner: OwnerData;
  pinHash?: string;
  pinSalt?: string;
}
