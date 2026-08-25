import React from 'react';
import { CashMovement, CashMovementType } from '../../../domain/cash/CashMovement';
import { Badge } from '../../../components/ui/Badge';
import { formatMoney } from '../../../domain/common/money/Money';
import { CurrencyCode } from '../../../types/country';
import { ArrowDownToLine, ArrowUpFromLine, LockOpen, ShoppingBag } from 'lucide-react';

interface CashMovementsTableProps {
  movements: CashMovement[];
  currency: CurrencyCode;
}

export const CashMovementsTable: React.FC<CashMovementsTableProps> = ({ movements, currency }) => {
  const getBadgeForType = (type: CashMovementType) => {
    switch (type) {
      case 'OPENING':
        return (
          <Badge variant="neutral" size="sm" className="flex items-center gap-1">
            <LockOpen size={12} />
            <span>Apertura</span>
          </Badge>
        );
      case 'SALE_CASH':
        return (
          <Badge variant="success" size="sm" className="flex items-center gap-1">
            <ShoppingBag size={12} />
            <span>Venta efectivo</span>
          </Badge>
        );
      case 'CASH_IN':
        return (
          <Badge variant="brand" size="sm" className="flex items-center gap-1">
            <ArrowDownToLine size={12} />
            <span>Ingreso</span>
          </Badge>
        );
      case 'CASH_OUT':
        return (
          <Badge variant="warning" size="sm" className="flex items-center gap-1">
            <ArrowUpFromLine size={12} />
            <span>Salida</span>
          </Badge>
        );
      default:
        return <Badge variant="neutral" size="sm">{type}</Badge>;
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  if (movements.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-8 text-center text-muted-foreground">
        <p>No hay movimientos registrados en este turno.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 md:p-5 border-b border-border flex items-center justify-between">
        <h3 className="font-bold text-foreground text-base md:text-lg">
          Movimientos del turno ({movements.length})
        </h3>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm text-foreground">
          <thead className="bg-muted/30 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
            <tr>
              <th className="py-3 px-4">Hora</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">Motivo</th>
              <th className="py-3 px-4">Usuario</th>
              <th className="py-3 px-4">Referencia</th>
              <th className="py-3 px-4 text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {movements.map((m) => {
              const isPositive = m.movementType !== 'CASH_OUT';
              return (
                <tr key={m.id} className="hover:bg-muted/10 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                    {formatTime(m.createdAt)}
                  </td>
                  <td className="py-3 px-4">{getBadgeForType(m.movementType)}</td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-foreground">{m.reason}</span>
                    {m.note && <p className="text-xs text-muted-foreground mt-0.5">{m.note}</p>}
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    {m.createdByNameSnapshot}
                  </td>
                  <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                    {m.referenceId ? `${m.referenceType || ''} #${m.referenceId.slice(0, 8)}` : '—'}
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-bold text-sm ${
                      isPositive ? 'text-emerald-500' : 'text-amber-500'
                    }`}
                  >
                    {isPositive ? '+' : '-'}
                    {formatMoney(m.amount, currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="block md:hidden divide-y divide-border/60">
        {movements.map((m) => {
          const isPositive = m.movementType !== 'CASH_OUT';
          return (
            <div key={m.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getBadgeForType(m.movementType)}
                  <span className="text-xs font-mono text-muted-foreground">
                    {formatTime(m.createdAt)}
                  </span>
                </div>
                <div
                  className={`font-bold text-sm ${
                    isPositive ? 'text-emerald-500' : 'text-amber-500'
                  }`}
                >
                  {isPositive ? '+' : '-'}
                  {formatMoney(m.amount, currency)}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{m.reason}</p>
                {m.note && <p className="text-xs text-muted-foreground">{m.note}</p>}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>Por: {m.createdByNameSnapshot}</span>
                {m.referenceId && (
                  <span className="font-mono">{m.referenceType} #{m.referenceId.slice(0, 8)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
