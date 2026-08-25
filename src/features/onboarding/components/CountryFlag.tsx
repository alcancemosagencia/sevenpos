import React from 'react';
import { SupportedCountryCode } from '../../../types/country';

export interface CountryFlagProps {
  countryCode: SupportedCountryCode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CountryFlag: React.FC<CountryFlagProps> = ({
  countryCode,
  className = '',
  size = 'md',
}) => {
  const sizeStyles = {
    sm: 'w-6 h-4 text-[10px]',
    md: 'w-8 h-5 text-xs',
    lg: 'w-10 h-6.5 text-sm',
  };

  switch (countryCode) {
    case 'CL':
      // Chile Flag: Top white (with blue square & white star), bottom red
      return (
        <div
          className={`relative rounded-xs overflow-hidden border border-black/10 shadow-xs flex flex-col ${sizeStyles[size]} ${className}`}
          title="Chile"
        >
          <div className="flex-1 flex">
            <div className="w-1/3 bg-[#0039A6] flex items-center justify-center text-white font-bold text-[8px]">
              ★
            </div>
            <div className="flex-1 bg-white" />
          </div>
          <div className="flex-1 bg-[#D52B1E]" />
        </div>
      );

    case 'CO':
      // Colombia Flag: Yellow (top 50%), Blue (middle 25%), Red (bottom 25%)
      return (
        <div
          className={`relative rounded-xs overflow-hidden border border-black/10 shadow-xs flex flex-col ${sizeStyles[size]} ${className}`}
          title="Colombia"
        >
          <div className="h-1/2 bg-[#FCD116]" />
          <div className="h-1/4 bg-[#003893]" />
          <div className="h-1/4 bg-[#CE1126]" />
        </div>
      );

    case 'VE':
      // Venezuela Flag: Yellow, Blue (with 8 white stars arc), Red
      return (
        <div
          className={`relative rounded-xs overflow-hidden border border-black/10 shadow-xs flex flex-col ${sizeStyles[size]} ${className}`}
          title="Venezuela"
        >
          <div className="h-1/3 bg-[#FCE300]" />
          <div className="h-1/3 bg-[#00247D] flex items-center justify-center text-white text-[7px] tracking-tight">
            ••••••••
          </div>
          <div className="h-1/3 bg-[#CF142B]" />
        </div>
      );

    default:
      return null;
  }
};
