import React from 'react';
import { Eye, Shield, AlertTriangle, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuditEvent, AuditSeverity } from '../../../domain/audit/AuditEvent';
import { Button } from '../../../components/ui/Button';
import { getHumanCategoryLabel, getHumanEventLabel } from '../../../application/audit/auditEventLabels';

export interface AuditEventTableProps {
  events: AuditEvent[];
  totalCount: number;
  limit: number;
  offset: number;
  onPageChange: (newOffset: number) => void;
  onSelectEvent: (event: AuditEvent) => void;
  isLoading?: boolean;
}

export const AuditEventTable: React.FC<AuditEventTableProps> = ({
  events,
  totalCount,
  limit,
  offset,
  onPageChange,
  onSelectEvent,
  isLoading,
}) => {
  const getSeverityBadge = (sev: AuditSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-status-danger-bg text-status-danger-text border border-status-danger/20">
            <AlertTriangle size={11} />
            Crítico
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Info size={11} />
            Advertencia
          </span>
        );
      case 'INFO':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-surface-secondary text-text-secondary border border-border-default">
            Informativo
          </span>
        );
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  if (events.length === 0 && !isLoading) {
    return (
      <div className="bg-surface dark:bg-[#18181b]/95 rounded-2xl border border-border-default p-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-surface-secondary text-text-secondary flex items-center justify-center mx-auto mb-3">
          <Shield size={24} />
        </div>
        <h3 className="text-base font-semibold text-text-primary">Sin registros encontrados</h3>
        <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
          No se encontraron acciones registradas con los filtros seleccionados.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface dark:bg-[#18181b]/95 rounded-2xl border border-border-default overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-default/60 bg-surface-secondary/40 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              <th className="py-3.5 px-4">Fecha y hora</th>
              <th className="py-3.5 px-4">Severidad</th>
              <th className="py-3.5 px-4">Acción realizada</th>
              <th className="py-3.5 px-4">Categoría</th>
              <th className="py-3.5 px-4">Usuario y dispositivo</th>
              <th className="py-3.5 px-4">Resumen</th>
              <th className="py-3.5 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default/40 text-xs text-text-primary">
            {events.map((evt) => (
              <tr
                key={evt.id}
                onClick={() => onSelectEvent(evt)}
                className="hover:bg-surface-secondary/50 cursor-pointer transition-colors"
              >
                <td className="py-3.5 px-4 whitespace-nowrap text-text-secondary font-mono text-[11px]">
                  {formatTimestamp(evt.occurredAt)}
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap">{getSeverityBadge(evt.severity)}</td>
                <td className="py-3.5 px-4 whitespace-nowrap font-medium text-text-primary">
                  <span className="font-medium text-xs text-text-primary">
                    {getHumanEventLabel(evt.eventType)}
                  </span>
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-secondary text-[11px] font-medium text-text-secondary">
                    {getHumanCategoryLabel(evt.eventCategory)}
                  </span>
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="font-medium text-text-primary">
                      {evt.actorNameSnapshot || evt.actorRoleSnapshot || 'Sistema'}
                    </span>
                    <span className="text-[10px] text-text-secondary">
                      {evt.deviceNameSnapshot || 'Terminal principal'}
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4 max-w-xs truncate text-text-secondary" title={evt.summary}>
                  {evt.summary}
                </td>
                <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectEvent(evt)}
                    leftIcon={<Eye size={13} />}
                    className="text-text-secondary hover:text-text-primary"
                  >
                    Ver detalle
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border-default/60 text-xs text-text-secondary bg-surface-secondary/20">
        <div>
          Mostrando <span className="font-medium text-text-primary">{Math.min(offset + 1, totalCount)}</span> a{' '}
          <span className="font-medium text-text-primary">{Math.min(offset + limit, totalCount)}</span> de{' '}
          <span className="font-medium text-text-primary">{totalCount}</span> registros
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(Math.max(0, offset - limit))}
            disabled={offset === 0 || isLoading}
            className="p-1.5"
          >
            <ChevronLeft size={14} />
          </Button>
          <span className="px-2 text-xs font-medium">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(offset + limit)}
            disabled={offset + limit >= totalCount || isLoading}
            className="p-1.5"
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};
