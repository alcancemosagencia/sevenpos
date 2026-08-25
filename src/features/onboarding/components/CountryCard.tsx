import React from 'react';
import { Check } from 'lucide-react';
import { CountryProfile } from '../../../types/country';
import { CountryFlag } from './CountryFlag';
import { Badge } from '../../../components/ui/Badge';

export interface CountryCardProps {
  country: CountryProfile;
  isSelected: boolean;
  onSelect: () => void;
}

export const CountryCard: React.FC<CountryCardProps> = ({
  country,
  isSelected,
  onSelect,
}) => {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={onSelect}
      className={`group w-full p-4 rounded-[var(--radius-card)] text-left transition-all duration-150 cursor-pointer border flex items-center justify-between gap-3 relative select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 active:scale-[0.99] ${
        isSelected
          ? 'bg-brand-primary/5 border-brand-primary shadow-xs ring-1 ring-brand-primary/30'
          : 'bg-surface border-border-default hover:border-border-strong hover:bg-surface-hover shadow-xs'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <CountryFlag countryCode={country.countryCode} size="md" />

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-text-primary truncate">
              {country.countryName}
            </h4>
            <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
              {country.countryCode}
            </Badge>
          </div>

          <p className="text-xs text-text-secondary mt-0.5">
            Moneda: <strong className="text-text-primary font-semibold">{country.primaryCurrency.code} ({country.primaryCurrency.symbol})</strong> • Prefijo: {country.phonePrefix}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {country.secondaryCurrency && (
          <Badge variant="brand" size="sm" className="hidden sm:inline-flex text-[10px]">
            + USD
          </Badge>
        )}

        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
            isSelected
              ? 'bg-brand-primary border-brand-primary text-white'
              : 'border-border-strong bg-transparent text-transparent group-hover:border-text-secondary'
          }`}
        >
          <Check size={12} strokeWidth={3} />
        </div>
      </div>
    </button>
  );
};
