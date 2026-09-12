import React, { useState, useEffect } from 'react';
import { CurrencySettingsForm } from '../types';
import { SettingRow } from './SettingRow';
import { Input } from '../../../components/ui/Input';
import { Switch } from '../../../components/ui/Switch';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { COUNTRY_PROFILES } from '../../../config/countries';
import { Check, Info, Save, DollarSign } from 'lucide-react';

interface CurrencySectionProps {
  initialData: CurrencySettingsForm;
  onSave: (data: CurrencySettingsForm) => Promise<{ success: boolean; error?: string }>;
  onDirtyChange: (isDirty: boolean) => void;
}

export const CurrencySection: React.FC<CurrencySectionProps> = ({
  initialData,
  onSave,
  onDirtyChange,
}) => {
  const [form, setForm] = useState<CurrencySettingsForm>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const country = COUNTRY_PROFILES[form.countryCode] || COUNTRY_PROFILES.CL;
  const isVenezuela = form.countryCode === 'VE';

  const isDirty =
    form.secondaryCurrencyEnabled !== initialData.secondaryCurrencyEnabled ||
    form.manualExchangeRate !== initialData.manualExchangeRate ||
    form.exchangeRateProvider !== initialData.exchangeRateProvider;

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVenezuela && form.secondaryCurrencyEnabled) {
      if (form.manualExchangeRate <= 0 || isNaN(form.manualExchangeRate)) {
        setError('La tasa de cambio debe ser un número mayor a 0.');
        return;
      }
    }

    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      const res = await onSave(form);
      if (res.success) {
        setSuccessMessage('Configuración de moneda guardada.');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(res.error || 'No pudimos guardar los cambios.');
      }
    } catch {
      setError('Ocurrió un error inesperado al guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-text-primary">Moneda y Región</h3>
        <p className="text-xs text-text-secondary mt-0.5">
          Configuración monetaria de tu negocio y gestión de tasas de cambio.
        </p>
      </div>

      <div className="space-y-1">
        <SettingRow
          label="Moneda principal"
          description="Moneda base para precios, inventarios, transacciones de caja y contabilidad."
        >
          <div className="w-full sm:w-80 flex items-center justify-between sm:justify-end gap-2.5">
            <Badge variant="brand" size="md" className="font-mono font-bold">
              {country.primaryCurrency.name} ({country.primaryCurrency.code}) — {country.primaryCurrency.symbol}
            </Badge>
            <span className="text-xs text-text-tertiary flex items-center gap-1">
              <Info size={13} />
              Base fija
            </span>
          </div>
        </SettingRow>

        {!isVenezuela && (
          <div className="p-3.5 rounded-xl bg-surface-secondary/50 border border-border-subtle text-xs text-text-secondary leading-relaxed flex items-start gap-2.5 my-2">
            <Info size={16} className="text-text-tertiary shrink-0 mt-0.5" />
            <p>
              En {country.countryName}, SevenPOS opera con{' '}
              <strong className="text-text-primary font-semibold">{country.primaryCurrency.name} ({country.primaryCurrency.code})</strong>{' '}
              como moneda única para garantizar exactitud y consistencia contable.
            </p>
          </div>
        )}

        {isVenezuela && (
          <>
            <SettingRow
              label="Operaciones en dólares (USD)"
              description="Habilita la referencia y visualización de precios en dólares estadounidenses."
            >
              <div className="w-full md:w-80 flex justify-between md:justify-end">
                <Switch
                  checked={form.secondaryCurrencyEnabled}
                  onChange={(checked) =>
                    setForm({
                      ...form,
                      secondaryCurrencyEnabled: checked,
                      secondaryCurrency: checked ? 'USD' : null,
                    })
                  }
                  label={form.secondaryCurrencyEnabled ? 'Habilitado' : 'Deshabilitado'}
                  className="w-full md:w-auto"
                />
              </div>
            </SettingRow>

            {form.secondaryCurrencyEnabled && (
              <SettingRow
                label="Tasa de cambio manual"
                description="Tasa de conversión utilizada en el punto de venta y cierre de caja (1 USD = X VES)."
              >
                <div className="w-full md:w-80">
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.manualExchangeRate || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        manualExchangeRate: parseFloat(e.target.value) || 0,
                      })
                    }
                    leftIcon={<DollarSign size={14} />}
                    rightIcon={<span className="text-xs font-bold text-text-tertiary">VES</span>}
                    placeholder="Ej. 965.50"
                  />
                </div>
              </SettingRow>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-status-danger/10 border border-status-danger/20 text-xs text-status-danger">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-lg bg-status-success/10 border border-status-success/20 text-xs text-status-success flex items-center gap-2">
          <Check size={14} />
          {successMessage}
        </div>
      )}

      <div className="pt-3 border-t border-border-default flex items-center justify-end gap-3">
        <Button
          type="submit"
          variant="brand"
          size="md"
          leftIcon={<Save size={15} />}
          disabled={!isDirty || isSaving}
          isLoading={isSaving}
          className="w-full sm:w-auto"
        >
          Guardar cambios
        </Button>
      </div>
    </form>
  );
};
