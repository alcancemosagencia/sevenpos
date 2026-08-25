import React from 'react';
import { CashSessionDetailResult } from '../../../application/cash/GetCashSessionDetail';
import { CashMovementsTable } from './CashMovementsTable';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { formatMoney } from '../../../domain/common/money/Money';
import { CurrencyCode } from '../../../types/country';
import { Wallet, X, Clock, User, CheckCircle2, AlertTriangle } from 'lucide-react';

interface CashSessionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  detail: CashSessionDetailResult | null;
  currency: CurrencyCode;
}

export const CashSessionDetailModal: React.FC<CashSessionDetailModalProps> = ({
  isOpen,
  onClose,
  detail,
  currency,
}) => {
  if (!isOpen || !detail) return null;

  const { session, summary, movements } = detail;
  const isClosed = session.status === 'CLOSED';

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  const renderDifferenceBadge = (diff?: number | null) => {
    if (diff === null || diff === undefined) return <span className="text-muted-foreground">—</span>;
    if (diff === 0) {
      return (
        <Badge variant="success" size="sm" className="flex items-center gap-1 font-semibold">
          <CheckCircle2 size={12} />
          <span>$0 (Exacto)</span>
        </Badge>
      );
    }
    if (diff > 0) {
      return (
        <Badge variant="brand" size="sm" className="font-semibold">
          +{formatMoney(diff, currency)} (Sobrante)
        </Badge>
      );
    }
    return (
      <Badge variant="danger" size="sm" className="flex items-center gap-1 font-semibold">
        <AlertTriangle size={12} />
        <span>{formatMoney(diff, currency)} (Faltante)</span>
      </Badge>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm dark:bg-black/80 animate-in fade-in duration-150">
      <div className="bg-surface border border-border-strong rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Wallet size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">
                  Detalle del turno #{session.id.slice(0, 8)}
                </h3>
                <Badge variant={isClosed ? 'neutral' : 'success'} size="sm">
                  {isClosed ? 'Turno cerrado' : 'Turno abierto'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Apertura: {formatDateTime(session.openedAt)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-6 overflow-y-auto">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-muted/20 border border-border/50 p-3 rounded-xl">
              <span className="text-xs text-muted-foreground block flex items-center gap-1">
                <User size={12} /> Cajero apertura:
              </span>
              <strong className="text-sm font-semibold text-foreground">
                {session.openedByNameSnapshot}
              </strong>
            </div>

            <div className="bg-muted/20 border border-border/50 p-3 rounded-xl">
              <span className="text-xs text-muted-foreground block flex items-center gap-1">
                <Clock size={12} /> Cierre:
              </span>
              <strong className="text-sm font-semibold text-foreground">
                {session.closedAt ? formatDateTime(session.closedAt) : 'En curso'}
              </strong>
            </div>

            <div className="bg-muted/20 border border-border/50 p-3 rounded-xl">
              <span className="text-xs text-muted-foreground block">
                Cajero cierre:
              </span>
              <strong className="text-sm font-semibold text-foreground">
                {session.closedByNameSnapshot || '—'}
              </strong>
            </div>

            <div className="bg-muted/20 border border-border/50 p-3 rounded-xl">
              <span className="text-xs text-muted-foreground block">
                Diferencia arqueo:
              </span>
              <div className="mt-0.5">{renderDifferenceBadge(session.differenceAmount)}</div>
            </div>
          </div>

          {/* Financial Summary */}
          {summary && (
            <div className="bg-muted/30 border border-border rounded-2xl p-4 md:p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Resumen financiero del turno
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Fondo inicial:</span>
                  <span className="font-bold text-foreground">{formatMoney(summary.openingAmount, currency)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Ventas efectivo (+):</span>
                  <span className="font-bold text-emerald-500">+{formatMoney(summary.totalSaleCash, currency)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Ingresos (+):</span>
                  <span className="font-bold text-foreground">+{formatMoney(summary.totalCashIn, currency)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Retiros (-):</span>
                  <span className="font-bold text-amber-500">-{formatMoney(summary.totalCashOut, currency)}</span>
                </div>
                <div className="pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground block">Saldo esperado:</span>
                  <span className="font-extrabold text-foreground">{formatMoney(summary.expectedCash, currency)}</span>
                </div>
                <div className="pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground block">Efectivo contado:</span>
                  <span className="font-extrabold text-foreground">
                    {session.countedCashAmount !== null && session.countedCashAmount !== undefined
                      ? formatMoney(session.countedCashAmount, currency)
                      : '—'}
                  </span>
                </div>
                <div className="pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground block">Total ventas turno:</span>
                  <span className="font-extrabold text-foreground">{formatMoney(summary.totalSalesAmount, currency)}</span>
                </div>
                <div className="pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground block">Tickets emitidos:</span>
                  <span className="font-extrabold text-foreground">{summary.ticketCount}</span>
                </div>
              </div>
            </div>
          )}

          {session.closingNote && (
            <div className="p-3 bg-muted/20 rounded-xl text-xs text-muted-foreground">
              <strong>Nota de cierre:</strong> &ldquo;{session.closingNote}&rdquo;
            </div>
          )}

          {/* Movements Table */}
          <CashMovementsTable movements={movements} currency={currency} />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end shrink-0">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
