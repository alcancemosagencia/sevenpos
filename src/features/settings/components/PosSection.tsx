import React, { useState, useEffect } from 'react';
import { PosSettingsForm } from '../types';
import { SettingRow } from './SettingRow';
import { Switch } from '../../../components/ui/Switch';
import { Button } from '../../../components/ui/Button';
import { Check, Save } from 'lucide-react';

interface PosSectionProps {
  initialData: PosSettingsForm;
  onSave: (data: PosSettingsForm) => Promise<{ success: boolean; error?: string }>;
  onDirtyChange: (isDirty: boolean) => void;
}

export const PosSection: React.FC<PosSectionProps> = ({
  initialData,
  onSave,
  onDirtyChange,
}) => {
  const [form, setForm] = useState<PosSettingsForm>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isDirty =
    form.confirmBeforeFinalizingSale !== initialData.confirmBeforeFinalizingSale ||
    form.showStockInGrid !== initialData.showStockInGrid ||
    form.autoPrintReceipt !== initialData.autoPrintReceipt;

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      const res = await onSave(form);
      if (res.success) {
        setSuccessMessage('Preferencias del Punto de Venta guardadas.');
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
        <h3 className="text-base font-bold text-text-primary">Punto de Venta</h3>
        <p className="text-xs text-text-secondary mt-0.5">
          Comportamiento del flujo de ventas y visualización en el terminal POS.
        </p>
      </div>

      <div className="space-y-1">
        <SettingRow
          label="Confirmar antes de finalizar venta"
          description="Muestra un paso de confirmación y resumen antes de asentar el pago en el sistema."
        >
          <div className="w-full md:w-80 flex justify-between md:justify-end">
            <Switch
              checked={form.confirmBeforeFinalizingSale}
              onChange={(checked) => setForm({ ...form, confirmBeforeFinalizingSale: checked })}
              label={form.confirmBeforeFinalizingSale ? 'Activo' : 'Inactivo'}
              className="w-full md:w-auto"
            />
          </div>
        </SettingRow>

        <SettingRow
          label="Mostrar existencias en la grilla POS"
          description="Exhibe el stock actual en cada tarjeta de producto para control visual del cajero."
        >
          <div className="w-full md:w-80 flex justify-between md:justify-end">
            <Switch
              checked={form.showStockInGrid}
              onChange={(checked) => setForm({ ...form, showStockInGrid: checked })}
              label={form.showStockInGrid ? 'Visible' : 'Oculto'}
              className="w-full md:w-auto"
            />
          </div>
        </SettingRow>

        <SettingRow
          label="Impresión automática de recibo"
          description="Envía el comprobante directamente a la impresora al completar cada venta."
        >
          <div className="w-full md:w-80 flex justify-between md:justify-end">
            <Switch
              checked={form.autoPrintReceipt}
              onChange={(checked) => setForm({ ...form, autoPrintReceipt: checked })}
              label={form.autoPrintReceipt ? 'Automática' : 'Manual'}
              className="w-full md:w-auto"
            />
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
