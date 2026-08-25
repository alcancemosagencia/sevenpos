import React, { createContext, useContext, useState } from 'react';
import { CountryProfile, SupportedCountryCode } from '../types/country';
import { COUNTRY_PROFILES, DEFAULT_COUNTRY, formatCurrency } from '../config/countries';

interface CountryContextType {
  country: CountryProfile;
  countryCode: SupportedCountryCode;
  setCountryCode: (code: SupportedCountryCode) => void;
  formatMoney: (amount: number, useSecondary?: boolean) => string;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

export const COUNTRY_STORAGE_KEY = 'sevenpos-country-preference';

export const CountryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [countryCode, setCountryCodeState] = useState<SupportedCountryCode>(() => {
    const saved = localStorage.getItem(COUNTRY_STORAGE_KEY) as SupportedCountryCode | null;
    if (saved && COUNTRY_PROFILES[saved]) {
      return saved;
    }
    return DEFAULT_COUNTRY;
  });

  const country = COUNTRY_PROFILES[countryCode];

  const setCountryCode = (code: SupportedCountryCode) => {
    if (COUNTRY_PROFILES[code]) {
      setCountryCodeState(code);
      localStorage.setItem(COUNTRY_STORAGE_KEY, code);
    }
  };

  const formatMoney = (amount: number, useSecondary = false): string => {
    if (useSecondary && country.secondaryCurrency) {
      return formatCurrency(amount, country.secondaryCurrency);
    }
    return formatCurrency(amount, country.primaryCurrency);
  };

  return (
    <CountryContext.Provider
      value={{
        country,
        countryCode,
        setCountryCode,
        formatMoney,
      }}
    >
      {children}
    </CountryContext.Provider>
  );
};

export const useCountry = (): CountryContextType => {
  const context = useContext(CountryContext);
  if (!context) {
    throw new Error('useCountry must be used within a CountryProvider');
  }
  return context;
};
