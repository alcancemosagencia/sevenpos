import React from 'react';
import { CashSession } from '../../../domain/cash/CashSession';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { formatMoney } from '../../../domain/common/money/Money';
import { CurrencyCode } from '../../../types/country';
import { Eye, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface CashSessionsTableProps {
  sessions: CashSession[];
  currency: CurrencyCode;
  onViewDetail: (session: CashSession) => void;
}

export const CashSessionsTable: React.FC<CashSessionsTableProps> = ({
  sessions,
  currency,
  onViewDetail,
}) => {
  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString([], { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  const renderDifferenceBadge = (diff?: number | null) => {
    if (diff === null || diff === undefined) return <span className="text-muted-foreground">—</span>;
    if (diff === 0) {
      return (
        <Badge variant="success" size="sm" className="flex items-center gap-1">
          <CheckCircle2 size={12} />
          <span>$0 (Exacto)</span>
        </Badge>
      );
    }
    if (diff > 0) {
      return (
        <Badge variant="brand" size="sm">
          +{formatMoney(diff, currency)} (Sobrante)
        </Badge>
      );
    }
    return (
      <Badge variant="danger" size="sm" className="flex items-center gap-1">
        <AlertTriangle size={12} />
        <span>{formatMoney(diff, currency)} (Faltante)</span>
      </Badge>
    );
  };

  if (sessions.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-8 text-center text-muted-foreground">
        <p>No hay turnos históricos registrados.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 md:p-5 border-b border-border flex items-center justify-between">
        <h3 className="font-bold text-foreground text-base md:text-lg flex items-center gap-2">
          <Clock size={18} className="text-primary" />
          Historial de turnos ({sessions.length})
        </h3>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm text-foreground">
          <thead className="bg-muted/30 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
            <tr>
              <th className="py-3 px-4">Apertura</th>
              <th className="py-3 px-4">Cierre</th>
              <th className="py-3 px-4">Cajero</th>
              <th className="py-3 px-4 text-right">Monto inicial</th>
              <th className="py-3 px-4 text-right">Esperado</th>
              <th className="py-3 px-4 text-right">Contado</th>
              <th className="py-3 px-4 text-center">Diferencia</th>
              <th className="py-3 px-4 text-center">Estado</th>
              <th className="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {sessions.map((s) => (
              <tr key={s.id} className="hover:bg-muted/10 transition-colors">
                <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                  {formatDateTime(s.openedAt)}
                </td>
                <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                  {formatDateTime(s.closedAt)}
                </td>
                <td className="py-3 px-4 text-xs font-medium">
                  {s.openedByNameSnapshot}
                </td>
                <td className="py-3 px-4 text-right font-medium">
                  {formatMoney(s.openingAmount, currency)}
                </td>
                <td className="py-3 px-4 text-right font-medium">
                  {s.expectedCashAmount !== null && s.expectedCashAmount !== undefined
                    ? formatMoney(s.expectedCashAmount, currency)
                    : '—'}
                </td>
                <td className="py-3 px-4 text-right font-medium">
                  {s.countedCashAmount !== null && s.countedCashAmount !== undefined
                    ? formatMoney(s.countedCashAmount, currency)
                    : '—'}
                </td>
                <td className="py-3 px-4 text-center">
                  {renderDifferenceBadge(s.differenceAmount)}
                </td>
                <td className="py-3 px-4 text-center">
                  <Badge variant={s.status === 'OPEN' ? 'success' : 'neutral'} size="sm">
                    {s.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetail(s)}
                    className="p-1.5 h-8 text-muted-foreground hover:text-foreground"
                    title="Ver detalle del turno"
                  >
                    <Eye size={16} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="block md:hidden divide-y divide-border/60">
        {sessions.map((s) => (
          <div key={s.id} className="p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-muted-foreground">
                {formatDateTime(s.openedAt)} → {formatDateTime(s.closedAt)}
              </span>
              <Badge variant={s.status === 'OPEN' ? 'success' : 'neutral'} size="sm">
                {s.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cajero:</span>
              <span className="font-semibold">{s.openedByNameSnapshot}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs bg-muted/20 p-2.5 rounded-xl">
              <div>
                <span className="text-muted-foreground block">Inicial:</span>
                <span className="font-bold">{formatMoney(s.openingAmount, currency)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Esperado:</span>
                <span className="font-bold">
                  {s.expectedCashAmount !== null && s.expectedCashAmount !== undefined
                    ? formatMoney(s.expectedCashAmount, currency)
                    : '—'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Contado:</span>
                <span className="font-bold">
                  {s.countedCashAmount !== null && s.countedCashAmount !== undefined
                    ? formatMoney(s.countedCashAmount, currency)
                    : '—'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Diferencia:</span>
                <div>{renderDifferenceBadge(s.differenceAmount)}</div>
              </div>
            </div>
            <div className="pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onViewDetail(s)}
                className="w-full flex items-center justify-center gap-1.5"
              >
                <Eye size={15} />
                <span>Ver detalle del turno</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
