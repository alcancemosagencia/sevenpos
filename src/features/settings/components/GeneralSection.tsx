import React, { useState, useEffect } from 'react';
import { GeneralSettingsForm } from '../types';
import { SettingRow } from './SettingRow';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { formatCountryName } from '../../../config/countries';
import { CountryFlag } from '../../onboarding/components/CountryFlag';
import { Check, Info, Save } from 'lucide-react';

interface GeneralSectionProps {
  initialData: GeneralSettingsForm;
  ownerEmail?: string | null;
  onSave: (data: GeneralSettingsForm) => Promise<{ success: boolean; error?: string }>;
  onDirtyChange: (isDirty: boolean) => void;
}

export const GeneralSection: React.FC<GeneralSectionProps> = ({
  initialData,
  ownerEmail,
  onSave,
  onDirtyChange,
}) => {
  const [form, setForm] = useState<GeneralSettingsForm>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isDirty =
    form.name !== initialData.name ||
    form.fiscalId !== initialData.fiscalId ||
    form.phone !== initialData.phone ||
    form.phonePrefix !== initialData.phonePrefix ||
    form.address !== initialData.address;

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('El nombre del negocio es obligatorio.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      const res = await onSave(form);
      if (res.success) {
        setSuccessMessage('Cambios guardados correctamente.');
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
        <h3 className="text-base font-bold text-text-primary">Datos del negocio</h3>
        <p className="text-xs text-text-secondary mt-0.5">
          Información general y comercial que aparece en comprobantes y reportes.
        </p>
      </div>

      <div className="space-y-1">
        <SettingRow
          label="Nombre comercial"
          description="Nombre público de tu establecimiento comercial o sucursal."
        >
          <div className="w-full md:w-80">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej. Minimarket Don Pepe"
              error={!form.name.trim() && isDirty ? 'Obligatorio' : undefined}
            />
          </div>
        </SettingRow>

        <SettingRow
          label="Razón social / Identificador fiscal"
          description={
            form.countryCode === 'CL'
              ? 'RUT de la empresa o persona natural emisora.'
              : form.countryCode === 'CO'
              ? 'NIT o cédula del negocio.'
              : 'RIF o identificación fiscal del comercio.'
          }
        >
          <div className="w-full md:w-80">
            <Input
              value={form.fiscalId}
              onChange={(e) => setForm({ ...form, fiscalId: e.target.value })}
              placeholder={form.countryCode === 'CL' ? '76.123.456-7' : 'Identificador fiscal'}
            />
          </div>
        </SettingRow>

        <SettingRow
          label="Teléfono de contacto"
          description="Número telefónico principal para atención y tickets."
        >
          <div className="w-full md:w-80 flex gap-2">
            <div className="w-24 shrink-0">
              <Input
                value={form.phonePrefix}
                onChange={(e) => setForm({ ...form, phonePrefix: e.target.value })}
                placeholder="+56"
              />
            </div>
            <div className="flex-1">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="912345678"
              />
            </div>
          </div>
        </SettingRow>

        <SettingRow
          label="Dirección del local"
          description="Dirección física o punto de venta para comprobantes."
        >
          <div className="w-full md:w-80">
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Ej. Av. Providencia 1234, Local 5"
            />
          </div>
        </SettingRow>

        <SettingRow
          label="País de operación"
          description="El país de operación se define durante el registro inicial para mantener consistentes la moneda y las reglas de tu negocio."
        >
          <div className="w-full md:w-80 flex items-center justify-between md:justify-end gap-2.5">
            <Badge variant="neutral" size="md" className="flex items-center gap-2 font-medium">
              <CountryFlag countryCode={form.countryCode} size="sm" />
              <span>{formatCountryName(form.countryCode)}</span>
            </Badge>
            <span className="text-xs text-text-tertiary flex items-center gap-1">
              <Info size={13} />
              Solo lectura
            </span>
          </div>
        </SettingRow>

        <SettingRow
          label="Correo del propietario"
          description="Correo asociado a la cuenta propietaria de SevenPOS."
        >
          <div className="w-full md:w-80 flex items-center justify-between md:justify-end gap-2.5">
            <span className="text-sm font-medium text-text-primary truncate">
              {ownerEmail ? ownerEmail : 'Cuenta no vinculada'}
            </span>
            <span className="text-xs text-text-tertiary flex items-center gap-1 shrink-0">
              <Info size={13} />
              Solo lectura
            </span>
          </div>
        </SettingRow>
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
