import React from 'react';
import { X, Clock, User, Terminal, Layers } from 'lucide-react';
import { AuditEvent } from '../../../domain/audit/AuditEvent';
import { Button } from '../../../components/ui/Button';
import {
  formatFriendlyMetadata,
  getHumanCategoryLabel,
  getHumanEventLabel,
  getHumanSeverityLabel,
} from '../../../application/audit/auditEventLabels';

export interface AuditEventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: AuditEvent | null;
}

export const AuditEventDetailModal: React.FC<AuditEventDetailModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  if (!isOpen || !event) return null;

  const friendlyDetails = formatFriendlyMetadata(event.metadataJson);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-surface dark:bg-[#18181b] border border-border-default shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-border-default/80">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-text-primary">
              {getHumanEventLabel(event.eventType)}
            </h3>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-surface-secondary text-[11px] font-medium text-text-secondary">
                {getHumanCategoryLabel(event.eventCategory)}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-surface-secondary text-[11px] font-medium text-text-secondary">
                {getHumanSeverityLabel(event.severity)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-secondary dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
          {/* Summary Box */}
          <div className="p-3.5 rounded-xl bg-surface-secondary/70 dark:bg-[#27272a]/60 border border-border-default/80">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
              Resumen
            </span>
            <p className="text-text-primary font-medium text-xs leading-relaxed">{event.summary}</p>
          </div>

          {/* Context Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Timestamp */}
            <div className="p-3 rounded-xl bg-surface-secondary/40 dark:bg-[#27272a]/30 border border-border-default/60 flex flex-col justify-between gap-1">
              <div className="flex items-center gap-1.5 text-[11px] text-text-secondary font-medium">
                <Clock size={13} />
                <span>Fecha y hora</span>
              </div>
              <span className="text-xs text-text-primary font-medium">{formatTimestamp(event.occurredAt)}</span>
            </div>

            {/* Actor Information */}
            <div className="p-3 rounded-xl bg-surface-secondary/40 dark:bg-[#27272a]/30 border border-border-default/60 flex flex-col justify-between gap-1">
              <div className="flex items-center gap-1.5 text-[11px] text-text-secondary font-medium">
                <User size={13} />
                <span>Usuario</span>
              </div>
              <div className="text-xs text-text-primary font-medium">
                {event.actorNameSnapshot || 'Sistema'}
                {event.actorRoleSnapshot && (
                  <span className="text-[11px] text-text-secondary ml-1.5">
                    ({event.actorRoleSnapshot})
                  </span>
                )}
              </div>
            </div>

            {/* Device Information */}
            <div className="p-3 rounded-xl bg-surface-secondary/40 dark:bg-[#27272a]/30 border border-border-default/60 flex flex-col justify-between gap-1">
              <div className="flex items-center gap-1.5 text-[11px] text-text-secondary font-medium">
                <Terminal size={13} />
                <span>Dispositivo</span>
              </div>
              <span className="text-xs text-text-primary font-medium">
                {event.deviceNameSnapshot || 'Terminal principal'}
              </span>
            </div>

            {/* Entity Target */}
            <div className="p-3 rounded-xl bg-surface-secondary/40 dark:bg-[#27272a]/30 border border-border-default/60 flex flex-col justify-between gap-1">
              <div className="flex items-center gap-1.5 text-[11px] text-text-secondary font-medium">
                <Layers size={13} />
                <span>Elemento relacionado</span>
              </div>
              <span className="text-xs text-text-primary font-medium truncate">
                {event.entityLabel || event.entityType}
              </span>
            </div>
          </div>

          {/* Friendly Metadata Changes Details */}
          {friendlyDetails.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">
                Detalles del registro
              </span>
              <div className="p-3 rounded-xl bg-surface-secondary/50 dark:bg-[#27272a]/40 border border-border-default/70 divide-y divide-border-default/40 text-xs">
                {friendlyDetails.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1.5 first:pt-0 last:pb-0">
                    <span className="text-text-secondary font-medium">{item.label}</span>
                    <span className="text-text-primary font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-default/80 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
