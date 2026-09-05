import React, { useState } from 'react';
import { Download, FileSpreadsheet, X, CheckCircle2, Loader2 } from 'lucide-react';
import { DateRange, ExportReportType } from '../../application/analytics/types';
import { operationalAnalyticsService } from '../../application/analytics/OperationalAnalyticsService';

interface ExportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  currentRange: DateRange;
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
}) => {
  const [selectedType, setSelectedType] = useState<ExportReportType>('SALES_SUMMARY');
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setDownloadSuccess(false);

      const csvContent = await operationalAnalyticsService.exportReportCsv(
        businessId,
        selectedType,
        currentRange
      );

      // Trigger browser download via Blob
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `sevenpos_${selectedType.toLowerCase()}_${currentRange.startDate}_${currentRange.endDate}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => {
        setDownloadSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error generating CSV export', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-content1 border border-border-default rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Exportar Reporte CSV</h3>
              <p className="text-xs text-content4">
                Período: <span className="font-semibold text-foreground">{currentRange.label}</span> ({currentRange.startDate} al {currentRange.endDate})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-content4 hover:text-foreground hover:bg-content4/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Options List */}
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {REPORT_OPTIONS.map((opt) => {
            const isSelected = selectedType === opt.type;
            return (
              <label
                key={opt.type}
                onClick={() => setSelectedType(opt.type)}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 text-foreground shadow-xs'
                    : 'border-border-default hover:border-border-strong text-content2'
                }`}
              >
                <input
                  type="radio"
                  name="reportType"
                  checked={isSelected}
                  onChange={() => setSelectedType(opt.type)}
                  className="mt-1 accent-primary"
                />
                <div className="space-y-0.5 min-w-0">
                  <div className="text-sm font-semibold text-foreground">{opt.title}</div>
                  <div className="text-xs text-content4 leading-relaxed">{opt.description}</div>
                </div>
              </label>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-divider">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-content3 hover:text-foreground hover:bg-content4/10 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl transition-all shadow-sm ${
              downloadSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-primary text-primary-foreground hover:opacity-95 active:scale-98'
            }`}
          >
            {isExporting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generando CSV...
              </>
            ) : downloadSuccess ? (
              <>
                <CheckCircle2 size={16} />
                ¡Descargado con éxito!
              </>
            ) : (
              <>
                <Download size={16} />
                Descargar Archivo CSV
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
