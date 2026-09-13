import React, { useState } from 'react';
import { FileSpreadsheet, X, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { CustomerWithStats, getCustomerDisplayName } from '../../../domain/customers/Customer';
import { downloadXlsx, downloadCsvLatam, formatExportFilename } from '../../../utils/excelExportUtils';
import { useOperationalSession } from '../../../context/OperationalSessionContext';

export interface ExportCustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: CustomerWithStats[];
  onSuccessToast?: (msg: string) => void;
}

export const ExportCustomersModal: React.FC<ExportCustomersModalProps> = ({
  isOpen,
  onClose,
  customers,
  onSuccessToast,
}) => {
  const { can } = useOperationalSession();
  const [selectedFormat, setSelectedFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!can('customers.export')) {
      setError('No tienes permisos para exportar clientes.');
      return;
    }
    try {
      setIsExporting(true);
      setError(null);

      const headers = [
        'Nombre',
        'Documento/RUT',
        'Teléfono',
        'Correo electrónico',
        'Estado',
        'Fecha de registro',
      ];

      const formatDate = (iso: string) => {
        try {
          const d = new Date(iso);
          return d.toLocaleDateString('es-CL');
        } catch {
          return iso.slice(0, 10);
        }
      };

      const rows = customers.map((c) => [
        getCustomerDisplayName(c),
        c.documentNumber || '',
        c.phone || '',
        c.email || '',
        c.active ? 'Activo' : 'Inactivo',
        formatDate(c.createdAt),
      ]);

      if (selectedFormat === 'xlsx') {
        const filename = formatExportFilename('clientes', 'xlsx');
        downloadXlsx(filename, 'Clientes', headers, rows);
      } else {
        const filename = formatExportFilename('clientes', 'csv');
        downloadCsvLatam(filename, headers, rows, ';');
      }

      if (onSuccessToast) {
        onSuccessToast('Archivo descargado correctamente');
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al exportar archivo.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-none animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md flex flex-col rounded-2xl bg-surface dark:bg-[#18181b] border border-border-default shadow-xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border-default">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Exportar clientes</h3>
              <p className="text-xs text-text-secondary">Descarga tus datos de clientes</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-secondary dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
          <p className="text-xs text-text-secondary">
            Descarga la información de tus clientes para trabajarla fuera de SevenPOS.
          </p>

          <div className="p-3.5 rounded-xl bg-surface-secondary/70 dark:bg-[#27272a]/60 border border-border-default space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Clientes a exportar:</span>
              <span className="font-bold text-text-primary">{customers.length.toLocaleString('es-CL')} registros</span>
            </div>
          </div>

          {/* Format Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary">Formato de archivo:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedFormat('xlsx')}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all cursor-pointer ${
                  selectedFormat === 'xlsx'
                    ? 'border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10 text-brand-primary font-semibold'
                    : 'border-border-default bg-surface hover:border-border-strong text-text-secondary'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-text-primary">Excel (.xlsx)</span>
                  {selectedFormat === 'xlsx' && <CheckCircle2 size={14} className="text-brand-primary" />}
                </div>
                <span className="text-[11px] text-text-tertiary">Recomendado (columnas nativas)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('csv')}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all cursor-pointer ${
                  selectedFormat === 'csv'
                    ? 'border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10 text-brand-primary font-semibold'
                    : 'border-border-default bg-surface hover:border-border-strong text-text-secondary'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-text-primary">CSV (.csv)</span>
                  {selectedFormat === 'csv' && <CheckCircle2 size={14} className="text-brand-primary" />}
                </div>
                <span className="text-[11px] text-text-tertiary">Compatible con Excel LATAM</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-status-danger-bg text-status-danger-text border border-status-danger/20 flex items-start gap-2 text-xs">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-default flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isExporting}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
            disabled={isExporting || customers.length === 0}
            className="flex items-center gap-1.5"
          >
            <Download size={15} />
            <span>{isExporting ? 'Generando...' : 'Descargar archivo'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
