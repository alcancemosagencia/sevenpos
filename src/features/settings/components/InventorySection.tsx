import React, { useState, useEffect } from 'react';
import { InventorySettingsForm } from '../types';
import { SettingRow } from './SettingRow';
import { Switch } from '../../../components/ui/Switch';
import { Button } from '../../../components/ui/Button';
import { Check, AlertTriangle, Save } from 'lucide-react';

interface InventorySectionProps {
  initialData: InventorySettingsForm;
  onSave: (data: InventorySettingsForm) => Promise<{ success: boolean; error?: string }>;
  onDirtyChange: (isDirty: boolean) => void;
}

export const InventorySection: React.FC<InventorySectionProps> = ({
  initialData,
  onSave,
  onDirtyChange,
}) => {
  const [form, setForm] = useState<InventorySettingsForm>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isDirty = form.allowNegativeStock !== initialData.allowNegativeStock;

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
        setSuccessMessage('Políticas de inventario guardadas.');
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
        <h3 className="text-base font-bold text-text-primary">Inventario</h3>
        <p className="text-xs text-text-secondary mt-0.5">
          Políticas de control de stock, movimientos y reglas de salida de mercadería.
        </p>
      </div>

      <div className="space-y-1">
        <SettingRow
          label="Permitir venta sin stock"
          description="Permite completar una venta incluso cuando el inventario disponible sea insuficiente."
        >
          <div className="w-full md:w-80 flex justify-between md:justify-end">
            <Switch
              checked={form.allowNegativeStock}
              onChange={(checked) => setForm({ ...form, allowNegativeStock: checked })}
              label={form.allowNegativeStock ? 'Permitido' : 'Bloqueado'}
              className="w-full md:w-auto"
            />
          </div>
        </SettingRow>

        {form.allowNegativeStock && (
          <div className="w-full p-3.5 rounded-xl bg-status-warning/10 border border-status-warning/30 text-xs text-text-primary flex items-start gap-2.5 my-2 animate-in fade-in-0 duration-150">
            <AlertTriangle size={18} className="text-status-warning shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h5 className="font-bold text-status-warning">Atención con el saldo de existencias</h5>
              <p className="text-text-secondary mt-0.5 leading-relaxed">
                Permite registrar ventas aun cuando no haya existencias registradas. El inventario se actualizará automáticamente cuando ingreses nuevas compras o ajustes.
              </p>
            </div>
          </div>
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
