import React from 'react';
import {
  Wallet,
  Coins,
  PackageOpen,
  CreditCard,
  Ticket,
  TrendingUp,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useCountry } from '../../context/CountryContext';
import { DashboardData } from '../../types/dashboard';

export interface DashboardKPIsProps {
  data: DashboardData['kpis'] & { profitQuality?: 'COMPLETE' | 'INCOMPLETE' };
}

export const DashboardKPIs: React.FC<DashboardKPIsProps> = ({ data }) => {
  const { formatMoney } = useCountry();
  const isProfitComplete = data.profitQuality === 'COMPLETE';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
      {/* 1. Ventas de hoy */}
      <Card variant="default" padding="sm" className="p-3.5 sm:p-4 flex flex-col justify-between gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-[var(--radius-button)] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <Wallet size={16} strokeWidth={2} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text-secondary">
              Ventas de hoy
            </span>
          </div>

          <Badge
            variant={data.todayTicketsCount > 0 ? 'success' : 'neutral'}
            size="sm"
            icon={<Ticket size={10} />}
          >
            {data.todayTicketsCount} tickets
          </Badge>
        </div>

        <div>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            {formatMoney(data.todaySales)}
          </p>
        </div>
      </Card>

      {/* 2. Ganancia de hoy */}
      <Card variant="default" padding="sm" className="p-3.5 sm:p-4 flex flex-col justify-between gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-[var(--radius-button)] bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Coins size={16} strokeWidth={2} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text-secondary">
              Ganancia de hoy
            </span>
          </div>

          <Badge
            variant={isProfitComplete && data.todayMarginPercent > 0 ? 'warning' : 'neutral'}
            size="sm"
            icon={<TrendingUp size={10} />}
          >
            {isProfitComplete ? (data.todayMarginPercent > 0 ? `+${data.todayMarginPercent}%` : '0.0%') : '—'}
          </Badge>
        </div>

        <div>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            {isProfitComplete ? formatMoney(data.todayProfit) : '—'}
          </p>
        </div>
      </Card>

      {/* 3. Stock bajo */}
      <Card variant="default" padding="sm" className="p-3.5 sm:p-4 flex flex-col justify-between gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-[var(--radius-button)] bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
              <PackageOpen size={16} strokeWidth={2} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text-secondary">
              Stock bajo
            </span>
          </div>
        </div>

        <div>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            {data.lowStockCount}
          </p>
        </div>
      </Card>

      {/* 4. Créditos */}
      <Card variant="default" padding="sm" className="p-3.5 sm:p-4 flex flex-col justify-between gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-[var(--radius-button)] bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center shrink-0">
              <CreditCard size={16} strokeWidth={2} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text-secondary">
              Créditos
            </span>
          </div>

          <Badge
            variant={data.activeCreditsCount > 0 ? 'warning' : 'neutral'}
            size="sm"
          >
            {data.activeCreditsCount} activos
          </Badge>
        </div>

        <div>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            {formatMoney(data.pendingCredits)}
          </p>
        </div>
      </Card>
    </div>
  );
};
