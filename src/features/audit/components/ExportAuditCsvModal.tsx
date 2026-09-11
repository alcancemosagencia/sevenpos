import React, { useState } from 'react';
import { Download, X, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { AuditFilters } from '../../../domain/audit/AuditQueryRepository';
import { repositoryFactory } from '../../../infrastructure/repositories/RepositoryFactory';
import { getHumanCategoryLabel, getHumanSeverityLabel } from '../../../application/audit/auditEventLabels';

export interface ExportAuditCsvModalProps {
  businessId: string;
  filters: AuditFilters;
  totalEventsCount: number;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportAuditCsvModal: React.FC<ExportAuditCsvModalProps> = ({
  businessId,
  filters,
  totalEventsCount,
  isOpen,
  onClose,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportError(null);

      const auditService = repositoryFactory.getAuditService();
      const csvContent = await auditService.exportToCsv(businessId, filters);

            const blob = new Blob([String.fromCharCode(0xfeff) + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);

      const nowStr = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `auditoria_sevenpos_${nowStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Error al exportar archivo CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md flex flex-col rounded-2xl bg-surface dark:bg-[#18181b] border border-border-default shadow-xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border-default/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Exportar Registro de Auditoría</h3>
              <p className="text-xs text-text-secondary">Descarga en formato CSV estándar</p>
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
          <div className="p-3.5 rounded-xl bg-surface-secondary/70 dark:bg-[#27272a]/60 border border-border-default/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Eventos a exportar:</span>
              <span className="font-bold text-text-primary">{totalEventsCount.toLocaleString('es-CL')} registros</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Filtro de categoría:</span>
              <span className="font-medium text-text-primary">
                {filters.category ? getHumanCategoryLabel(filters.category) : 'Todas'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Filtro de severidad:</span>
              <span className="font-medium text-text-primary">
                {filters.severity ? getHumanSeverityLabel(filters.severity) : 'Todas'}
              </span>
            </div>
            {filters.searchTerm && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-secondary">Búsqueda:</span>
                <span className="font-medium text-text-primary truncate max-w-[160px]">"{filters.searchTerm}"</span>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 text-xs text-text-secondary">
            <CheckCircle size={15} className="text-status-success-text shrink-0 mt-0.5" />
            <span>El archivo incluye codificación UTF-8 con BOM compatible nativamente con Microsoft Excel, Google Sheets y LibreOffice.</span>
          </div>

          {exportError && (
            <div className="p-3 rounded-xl bg-status-danger-bg text-status-danger-text border border-status-danger/20 flex items-start gap-2 text-xs">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{exportError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-default/80 flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isExporting}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || totalEventsCount === 0}
            className="flex items-center gap-1.5"
          >
            <Download size={15} />
            <span>{isExporting ? 'Generando...' : 'Descargar CSV'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
