import React from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { SupportedCountryCode } from '../../../types/country';
import { COUNTRY_PROFILES } from '../../../config/countries';
import { CountryCard } from '../components/CountryCard';
import { Button } from '../../../components/ui/Button';

export interface CountryStepProps {
  selectedCountry: SupportedCountryCode;
  onSelectCountry: (country: SupportedCountryCode) => void;
  onNext: () => void;
  onBack: () => void;
}

export const CountryStep: React.FC<CountryStepProps> = ({
  selectedCountry,
  onSelectCountry,
  onNext,
  onBack,
}) => {
  const countries: SupportedCountryCode[] = ['CL', 'CO', 'VE'];

  return (
    <div className="space-y-4">
      {/* Country Cards List */}
      <div className="space-y-2.5" role="radiogroup" aria-label="Selecciona el país de operación">
        {countries.map((code) => {
          const profile = COUNTRY_PROFILES[code];
          return (
            <CountryCard
              key={code}
              country={profile}
              isSelected={selectedCountry === code}
              onSelect={() => onSelectCountry(code)}
            />
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="pt-4 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="md"
          leftIcon={<ArrowLeft size={16} />}
          onClick={onBack}
        >
          Atrás
        </Button>

        <Button
          variant="brand"
          size="md"
          rightIcon={<ArrowRight size={16} />}
          onClick={onNext}
          className="px-6 font-semibold"
        >
          Continuar
        </Button>
      </div>
    </div>
  );
};
