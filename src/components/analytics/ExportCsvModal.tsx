import React, { useState } from 'react';
import { Download, FileSpreadsheet, X, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { DateRange, ExportReportType } from '../../application/analytics/types';
import { operationalAnalyticsService } from '../../application/analytics/OperationalAnalyticsService';
import { downloadXlsx, downloadCsvLatam, formatExportFilename } from '../../utils/excelExportUtils';

interface ExportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  currentRange: DateRange;
  onSuccessToast?: (msg: string) => void;
}

const REPORT_OPTIONS: { type: ExportReportType; title: string; description: string }[] = [
  {
    type: 'SALES_SUMMARY',
    title: 'Resumen de Ventas',
    description: 'Totales del período, tickets, ticket promedio y ganancia bruta conocida.',
  },
  {
    type: 'SALES_LIST',
    title: 'Listado Detallado de Ventas',
    description: 'Cada venta completada con ID, fecha, cliente, subtotal, descuentos y método de pago.',
  },
  {
    type: 'TOP_PRODUCTS',
    title: 'Productos Más Vendidos',
    description: 'Ranking de productos con cantidad, ingresos y participación de ventas.',
  },
  {
    type: 'INVENTORY_STOCK',
    title: 'Estado del Inventario',
    description: 'Catálogo de productos con stock actual, stock mínimo, estado y costo unitario.',
  },
  {
    type: 'OPERATING_EXPENSES',
    title: 'Gastos Operativos',
    description: 'Desglose de gastos del período con fecha, categoría, monto y método de pago.',
  },
  {
    type: 'CASH_SESSIONS_AUDIT',
    title: 'Auditoría de Cajas (Turnos)',
    description: 'Historial de turnos con saldo esperado, contado físico y discrepancias.',
  },
];

export const ExportCsvModal: React.FC<ExportCsvModalProps> = ({
  isOpen,
  onClose,
  businessId,
  currentRange,
  onSuccessToast,
}) => {
  const [selectedType, setSelectedType] = useState<ExportReportType>('SALES_SUMMARY');
  const [selectedFormat, setSelectedFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);

      const { headers, rows } = await operationalAnalyticsService.getReportExportData(
        businessId,
        selectedType,
        currentRange
      );

      const moduleName = `reporte_${selectedType.toLowerCase()}`;
      if (selectedFormat === 'xlsx') {
        const filename = formatExportFilename(moduleName, 'xlsx');
        downloadXlsx(filename, 'Reporte', headers, rows);
      } else {
        const filename = formatExportFilename(moduleName, 'csv');
        downloadCsvLatam(filename, headers, rows, ';');
      }

      if (onSuccessToast) {
        onSuccessToast('Archivo descargado correctamente');
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar reporte.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-none animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg flex flex-col rounded-2xl bg-surface dark:bg-[#18181b] border border-border-default shadow-xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border-default">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Exportar Reporte</h3>
              <p className="text-xs text-text-secondary">
                Período: <span className="font-semibold text-text-primary">{currentRange.label}</span> ({currentRange.startDate} al {currentRange.endDate})
              </p>
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

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
          {/* Options List */}
          <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
            <label className="text-xs font-semibold text-text-primary block mb-1">Selecciona el tipo de reporte:</label>
            {REPORT_OPTIONS.map((opt) => {
              const isSelected = selectedType === opt.type;
              return (
                <label
                  key={opt.type}
                  onClick={() => setSelectedType(opt.type)}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10 text-text-primary shadow-xs'
                      : 'border-border-default hover:border-border-strong text-text-secondary bg-surface'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportType"
                    checked={isSelected}
                    onChange={() => setSelectedType(opt.type)}
                    className="mt-0.5 accent-brand-primary cursor-pointer"
                  />
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs font-bold text-text-primary">{opt.title}</div>
                    <div className="text-[11px] text-text-secondary leading-relaxed">{opt.description}</div>
                  </div>
                </label>
              );
            })}
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
            <div className="p-3 rounded-xl bg-status-danger-bg text-status-danger-text border border-status-danger/20 text-xs">
              {error}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border-default flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isExporting}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
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
