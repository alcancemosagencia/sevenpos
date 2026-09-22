import React, { useState } from 'react';
import { Globe, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { platformAdminService } from '../services/PlatformAdminService';

interface EditBusinessRegionModalProps {
  businessId: string;
  businessName: string;
  currentCountryCode: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditBusinessRegionModal: React.FC<EditBusinessRegionModalProps> = ({
  businessId,
  businessName,
  currentCountryCode,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [countryCode, setCountryCode] = useState<'CL' | 'CO' | 'VE'>(() => {
    if (currentCountryCode === 'VE' || currentCountryCode === 'CO' || currentCountryCode === 'CL') {
      return currentCountryCode;
    }
    return 'CL';
  });

  const getDefaultCurrency = (country: 'CL' | 'CO' | 'VE'): 'CLP' | 'COP' | 'VES' | 'USD' => {
    switch (country) {
      case 'CL':
        return 'CLP';
      case 'CO':
        return 'COP';
      case 'VE':
        return 'VES';
    }
  };

  const [currencyCode, setCurrencyCode] = useState<'CLP' | 'COP' | 'VES' | 'USD'>(() =>
    getDefaultCurrency(countryCode)
  );

  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // When country changes, ensure selected currency is valid for that country
  const handleCountryChange = (newCountry: string) => {
    const validCountry = newCountry as 'CL' | 'CO' | 'VE';
    setCountryCode(validCountry);
    setCurrencyCode(getDefaultCurrency(validCountry));
  };

  if (!isOpen) return null;

  const countryOptions = [
    { value: 'CL', label: '🇨🇱 Chile (CLP)' },
    { value: 'CO', label: '🇨🇴 Colombia (COP)' },
    { value: 'VE', label: '🇻🇪 Venezuela (VES / USD)' },
  ];

  const getCurrencyOptions = (country: 'CL' | 'CO' | 'VE') => {
    switch (country) {
      case 'CL':
        return [{ value: 'CLP', label: 'CLP — Peso Chileno ($)' }];
      case 'CO':
        return [{ value: 'COP', label: 'COP — Peso Colombiano ($)' }];
      case 'VE':
        return [
          { value: 'VES', label: 'VES — Bolívar (Bs.)' },
          { value: 'USD', label: 'USD — Dólar Estadounidense ($)' },
        ];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!reason.trim()) {
      setErrorMessage('Debes ingresar el motivo del cambio regional.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await platformAdminService.updateBusinessRegion({
        businessId,
        countryCode,
        currencyCode,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Error al actualizar configuración regional.');
      } else {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error inesperado al guardar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-surface border border-border-default rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              <Globe size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary">Editar Configuración Regional</h3>
              <p className="text-xs text-text-secondary">{businessName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Warning Notice */}
        <div className="p-4 rounded-2xl bg-warning/10 border border-warning/30 flex items-start gap-3">
          <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />
          <div className="text-xs text-text-secondary space-y-1">
            <p className="font-semibold text-text-primary">Seguridad de Moneda Histórica:</p>
            <p>
              El cambio de país y moneda aplica <strong>prospectivamente</strong>. Las ventas, gastos y cobros históricos 
              mantendrán sus valores y moneda de origen para garantizar la integridad contable.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-error/10 border border-error/20 rounded-xl text-xs text-error font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Country Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">País del Negocio</label>
            <Select
              value={countryCode}
              onChange={handleCountryChange}
              options={countryOptions}
            />
          </div>

          {/* Currency Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">Moneda Principal</label>
            <Select
              value={currencyCode}
              onChange={(val) => setCurrencyCode(val as 'CLP' | 'COP' | 'VES' | 'USD')}
              options={getCurrencyOptions(countryCode)}
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">
              Motivo del Cambio <span className="text-error">*</span>
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Corrección de país registrado en Venezuela"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">Notas Internas (Opcional)</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles administrativos adicionales..."
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="gap-2"
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? 'Guardando...' : 'Aplicar Cambio Regional'}</span>
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
};
