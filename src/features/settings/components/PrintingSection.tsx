import React, { useState, useEffect } from 'react';
import { PrintingSettingsForm } from '../types';
import { SettingRow } from './SettingRow';
import { Button } from '../../../components/ui/Button';
import { ReceiptPrintService } from '../../../infrastructure/hardware/printing/ReceiptPrintService';
import { ReceiptDTO } from '../../../domain/sales/Receipt';
import { Check, Printer, Save, FileText } from 'lucide-react';

interface PrintingSectionProps {
  initialData: PrintingSettingsForm;
  onSave: (data: PrintingSettingsForm) => Promise<{ success: boolean; error?: string }>;
  onDirtyChange: (isDirty: boolean) => void;
  businessName?: string;
}

export const PrintingSection: React.FC<PrintingSectionProps> = ({
  initialData,
  onSave,
  onDirtyChange,
  businessName = 'SevenPOS Store',
}) => {
  const [form, setForm] = useState<PrintingSettingsForm>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingPrint, setIsTestingPrint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isDirty = form.paperFormat !== initialData.paperFormat;

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
        setSuccessMessage('Configuración de impresión guardada.');
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

  const handleTestPrint = async () => {
    setIsTestingPrint(true);
    setError(null);
    try {
      const testReceipt: ReceiptDTO = {
        saleNumber: 'TEST-001',
        currencyCode: 'CLP',
        dateFormatted: new Date().toLocaleDateString('es-CL'),
        businessName,
        businessFiscalId: '76.123.456-7',
        businessAddress: 'Av. Providencia 1234',
        businessPhone: '+56 9 1234 5678',
        cashierName: 'Administrador',
        customerName: 'Consumidor Final',
        items: [
          {
            displayName: 'Producto de Prueba 1',
            quantityFormatted: '2',
            unitPriceFormatted: '$ 1.500',
            lineTotalFormatted: '$ 3.000',
            baseUnit: 'UNI',
          },
          {
            displayName: 'Producto de Prueba 2',
            quantityFormatted: '1',
            unitPriceFormatted: '$ 4.500',
            lineTotalFormatted: '$ 4.500',
            baseUnit: 'UNI',
          },
        ],
        subtotalFormatted: '$ 7.500',
        totalFormatted: '$ 7.500',
        payments: [
          {
            methodName: 'Efectivo',
            amountFormatted: '$ 7.500',
          },
        ],
        note: 'Ticket de prueba de impresión',
      };

      await ReceiptPrintService.printReceipt(testReceipt, form.paperFormat);
      setSuccessMessage(`Ticket de prueba enviado en formato ${form.paperFormat}.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError('No se pudo invocar el servicio de impresión.');
    } finally {
      setIsTestingPrint(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-text-primary">Tickets e Impresión</h3>
        <p className="text-xs text-text-secondary mt-0.5">
          Formato de salida y dimensiones de tickets térmicos para tu negocio.
        </p>
      </div>

      <div className="space-y-1">
        <SettingRow
          label="Ancho de papel de ticket"
          description="Define el ancho utilizado al imprimir comprobantes y recibos de venta."
        >
          <div className="w-full md:w-80 flex gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, paperFormat: '80mm' })}
              className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                form.paperFormat === '80mm'
                  ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-bold shadow-xs'
                  : 'border-border-default bg-surface hover:bg-surface-secondary text-text-secondary'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs">
                <FileText size={14} />
                <span>80 mm</span>
              </div>
              <p className="text-[11px] font-normal text-text-tertiary mt-1">Estándar (Mesón)</p>
            </button>

            <button
              type="button"
              onClick={() => setForm({ ...form, paperFormat: '58mm' })}
              className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                form.paperFormat === '58mm'
                  ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-bold shadow-xs'
                  : 'border-border-default bg-surface hover:bg-surface-secondary text-text-secondary'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs">
                <FileText size={14} />
                <span>58 mm</span>
              </div>
              <p className="text-[11px] font-normal text-text-tertiary mt-1">Compacto (Móvil)</p>
            </button>
          </div>
        </SettingRow>

        <SettingRow
          label="Prueba de impresión"
          description="Envía un comprobante de prueba con el formato seleccionado al diálogo de impresión del sistema."
        >
          <div className="w-full md:w-80 flex justify-start md:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Printer size={14} />}
              onClick={handleTestPrint}
              isLoading={isTestingPrint}
              className="w-full sm:w-auto"
            >
              Imprimir ticket de prueba
            </Button>
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
