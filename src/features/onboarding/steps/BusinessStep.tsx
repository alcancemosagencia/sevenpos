import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Building2, Hash, MapPin } from 'lucide-react';
import { SupportedCountryCode } from '../../../types/country';
import { BusinessData } from '../../../types/onboarding';
import { COUNTRY_PROFILES } from '../../../config/countries';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

export interface BusinessStepProps {
  countryCode: SupportedCountryCode;
  data: BusinessData;
  onUpdate: (data: Partial<BusinessData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const BusinessStep: React.FC<BusinessStepProps> = ({
  countryCode,
  data,
  onUpdate,
  onNext,
  onBack,
}) => {
  const [nameError, setNameError] = useState('');
  const profile = COUNTRY_PROFILES[countryCode];

  const fiscalLabels: Record<SupportedCountryCode, { label: string; placeholder: string }> = {
    CL: { label: 'RUT del negocio', placeholder: 'Ej. 76.123.456-7' },
    CO: { label: 'NIT del negocio', placeholder: 'Ej. 900.123.456-1' },
    VE: { label: 'RIF del negocio', placeholder: 'Ej. J-12345678-9' },
  };

  const currentFiscal = fiscalLabels[countryCode] || { label: 'Identificación fiscal', placeholder: 'Identificación' };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.name.trim()) {
      setNameError('El nombre del negocio es obligatorio.');
      return;
    }
    setNameError('');
    onNext();
  };

  return (
    <form onSubmit={handleContinue} className="space-y-4">
      {/* 1. Nombre del negocio */}
      <Input
        label="Nombre del negocio *"
        placeholder="Ej. Minimarket La Esquina"
        value={data.name}
        error={nameError}
        onChange={(e) => {
          onUpdate({ name: e.target.value });
          if (nameError) setNameError('');
        }}
        leftIcon={<Building2 size={16} />}
        autoFocus
      />

      {/* 2. Identificación fiscal adaptativa */}
      <Input
        label={`${currentFiscal.label} (Opcional)`}
        placeholder={currentFiscal.placeholder}
        value={data.fiscalId}
        onChange={(e) => onUpdate({ fiscalId: e.target.value })}
        leftIcon={<Hash size={16} />}
      />

      {/* 3. Teléfono con prefijo automático */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-text-secondary">
          Teléfono de contacto (Opcional)
        </label>
        <div className="flex items-center gap-2">
          {/* Locked Prefix Badge */}
          <div className="h-10 px-3 rounded-[var(--radius-control)] bg-surface-secondary border border-border-default flex items-center justify-center font-bold text-xs text-text-primary shrink-0 select-none shadow-xs">
            {profile.phonePrefix}
          </div>
          {/* Phone Input */}
          <div className="flex-1">
            <input
              type="tel"
              placeholder="9 1234 5678"
              value={data.phone}
              onChange={(e) => onUpdate({ phone: e.target.value, phonePrefix: profile.phonePrefix })}
              className="w-full bg-surface-secondary text-text-primary placeholder:text-text-tertiary border border-border-default rounded-[var(--radius-control)] text-sm px-3 py-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary h-10"
            />
          </div>
        </div>
      </div>

      {/* 4. Dirección */}
      <Input
        label="Dirección física (Opcional)"
        placeholder="Ej. Av. Libertador #123, Local 4"
        value={data.address || ''}
        onChange={(e) => onUpdate({ address: e.target.value })}
        leftIcon={<MapPin size={16} />}
      />

      {/* Navigation Buttons */}
      <div className="pt-3 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="md"
          leftIcon={<ArrowLeft size={16} />}
          onClick={onBack}
        >
          Atrás
        </Button>

        <Button
          type="submit"
          variant="brand"
          size="md"
          rightIcon={<ArrowRight size={16} />}
          className="px-6 font-semibold"
        >
          Continuar
        </Button>
      </div>
    </form>
  );
};
