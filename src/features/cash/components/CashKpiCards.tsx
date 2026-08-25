import React from 'react';
import { CashSessionSummary } from '../../../domain/cash/CashSession';
import { formatMoney } from '../../../domain/common/money/Money';
import { CurrencyCode } from '../../../types/country';
import { Banknote, ShoppingBag, ArrowDownToLine, ArrowUpFromLine, ReceiptText } from 'lucide-react';

interface CashKpiCardsProps {
  summary: CashSessionSummary;
  currency: CurrencyCode;
}

export const CashKpiCards: React.FC<CashKpiCardsProps> = ({ summary, currency }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Saldo Esperado en Efectivo */}
      <div className="bg-surface border border-border-strong/70 rounded-2xl p-4 md:p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Saldo esperado (Caja)
          </span>
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Banknote size={18} />
          </div>
        </div>
        <div>
          <div className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            {formatMoney(summary.expectedCash, currency)}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <span>Fondo inicial: <strong>{formatMoney(summary.openingAmount, currency)}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Ventas en Efectivo */}
      <div className="bg-surface border border-border rounded-2xl p-4 md:p-5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ventas en efectivo
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <ShoppingBag size={18} />
          </div>
        </div>
        <div>
          <div className="text-2xl md:text-3xl font-extrabold text-emerald-500 tracking-tight">
            {formatMoney(summary.totalSaleCash, currency)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Total ventas turno: <strong>{formatMoney(summary.totalSalesAmount, currency)}</strong>
          </div>
        </div>
      </div>

      {/* 3. Ingresos Manuales (CASH_IN) */}
      <div className="bg-surface border border-border rounded-2xl p-4 md:p-5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ingresos manuales
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <ArrowDownToLine size={18} />
          </div>
        </div>
        <div>
          <div className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            +{formatMoney(summary.totalCashIn, currency)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Entradas y reposiciones
          </div>
        </div>
      </div>

      {/* 4. Egresos Manuales (CASH_OUT) */}
      <div className="bg-surface border border-border rounded-2xl p-4 md:p-5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Retiros / Salidas
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <ArrowUpFromLine size={18} />
          </div>
        </div>
        <div>
          <div className="text-2xl md:text-3xl font-extrabold text-amber-500 tracking-tight">
            -{formatMoney(summary.totalCashOut, currency)}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <ReceiptText size={13} className="text-muted-foreground" />
            <span>Tickets de venta: <strong>{summary.ticketCount}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
