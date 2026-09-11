import React from 'react';
import { Shield, AlertTriangle, Info, Terminal, User, ChevronRight } from 'lucide-react';
import { AuditEvent, AuditSeverity } from '../../../domain/audit/AuditEvent';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { getHumanCategoryLabel, getHumanEventLabel } from '../../../application/audit/auditEventLabels';

export interface AuditEventCardsMobileProps {
  events: AuditEvent[];
  loading?: boolean;
  onSelectEvent: (event: AuditEvent) => void;
}

const getSeverityBadge = (severity: AuditSeverity) => {
  switch (severity) {
    case 'CRITICAL':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-danger-bg text-status-danger-text border border-status-danger/20">
          <AlertTriangle size={10} />
          Crítico
        </span>
      );
    case 'WARNING':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Info size={10} />
          Advertencia
        </span>
      );
    case 'INFO':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-secondary text-text-secondary border border-border-default">
          Informativo
        </span>
      );
  }
};

const formatTimestamp = (isoString: string) => {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

export const AuditEventCardsMobile: React.FC<AuditEventCardsMobileProps> = ({
  events,
  loading,
  onSelectEvent,
}) => {
  if (!loading && events.length === 0) {
    return (
      <EmptyState
        icon={<Shield className="w-10 h-10 text-text-secondary" />}
        title="Sin registros encontrados"
        description="No se encontraron acciones registradas con los filtros seleccionados."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {events.map((ev) => (
        <Card
          key={ev.id}
          onClick={() => onSelectEvent(ev)}
          className="p-3.5 border-border-default/80 bg-surface dark:bg-[#18181b]/95 hover:border-brand-primary/40 transition-all cursor-pointer flex flex-col gap-2 active:scale-[0.99]"
        >
          {/* Header Row: Category, Severity, Timestamp */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-surface-secondary text-[10px] font-medium text-text-secondary">
                {getHumanCategoryLabel(ev.eventCategory)}
              </span>
              {getSeverityBadge(ev.severity)}
            </div>
            <span className="text-[11px] font-medium text-text-secondary whitespace-nowrap">
              {formatTimestamp(ev.occurredAt)}
            </span>
          </div>

          {/* Human Event Title & Summary */}
          <div>
            <div className="text-xs font-semibold text-text-primary">
              {getHumanEventLabel(ev.eventType)}
            </div>
            <p className="text-xs text-text-secondary font-normal mt-0.5 leading-snug">
              {ev.summary}
            </p>
          </div>

          {/* Actor, Device & Chevron */}
          <div className="flex items-center justify-between pt-2 border-t border-border-default/60 text-xs text-text-secondary">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex items-center gap-1 truncate">
                <User size={12} className="shrink-0" />
                <span className="truncate text-[11px]">
                  {ev.actorNameSnapshot || ev.actorRoleSnapshot || 'Sistema'}
                </span>
              </div>
              <div className="flex items-center gap-1 truncate">
                <Terminal size={11} className="shrink-0" />
                <span className="truncate text-[11px]">
                  {ev.deviceNameSnapshot || 'Terminal principal'}
                </span>
              </div>
            </div>
            <ChevronRight size={15} className="text-text-secondary shrink-0" />
          </div>
        </Card>
      ))}
    </div>
  );
};
