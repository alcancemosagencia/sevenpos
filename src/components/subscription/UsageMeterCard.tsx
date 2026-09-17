import React from 'react';
import { Package, Users, UserCheck, History, TrendingUp, Monitor } from 'lucide-react';
import { UsageOverview, MetricUsage } from '../../domain/subscription/Entitlement';
import { Card } from '../ui/Card';

interface UsageMeterCardProps {
  overview: UsageOverview;
  onUpgradeClick?: () => void;
}

export const UsageMeterCard: React.FC<UsageMeterCardProps> = ({ overview, onUpgradeClick }) => {
  const { products, customers, users, salesMilestone, historyWindow, plan } = overview;

  return (
    <Card className="p-5 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-subtle">
        <div>
          <h3 className="text-base font-bold text-text-primary">Uso actual de tu plan</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Monitorea el consumo de recursos incluidos en tu negocio.
          </p>
        </div>
        {plan === 'FREE' && onUpgradeClick && (
          <button
            type="button"
            onClick={onUpgradeClick}
            className="text-xs font-bold text-brand-primary hover:text-brand-primary/80 transition-colors self-start sm:self-auto cursor-pointer"
          >
            Ampliar recursos con Pro →
          </button>
        )}
      </div>

      {/* 3 Primary Resource Meters with Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderProgressMeter(products, <Package size={17} className="text-brand-primary" />)}
        {renderProgressMeter(customers, <Users size={17} className="text-indigo-500" />)}
        {renderProgressMeter(users, <UserCheck size={17} className="text-emerald-500" />)}
      </div>

      {/* Secondary Resource Badges / Compact Cards: Sales, History, Devices */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        {/* Sales Volume (Unlimited Commercial Signal) */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface-secondary/60 border border-border-subtle">
          <div className="w-10 h-10 rounded-xl bg-surface-secondary text-text-primary flex items-center justify-center shrink-0 border border-border-subtle">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
              Ventas este mes
            </div>
            <div className="text-sm font-bold text-text-primary truncate">
              {salesMilestone.currentMonthlySales.toLocaleString()} ventas
            </div>
            <div className="text-[10px] text-text-tertiary">
              {plan === 'FREE' ? 'Ventas ilimitadas' : 'Volumen sin límites'}
            </div>
          </div>
        </div>

        {/* History Window (Status Card, Not Fake Bar) */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface-secondary/60 border border-border-subtle">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
            <History size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
              Historial de reportes
            </div>
            <div className="text-sm font-bold text-text-primary truncate">
              {historyWindow.displayLabel}
            </div>
            <div className="text-[10px] text-text-tertiary">
              {plan === 'FREE' ? 'Auditoría: 3 días' : 'Auditoría completa'}
            </div>
          </div>
        </div>

        {/* Devices (Informational Display Only) */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface-secondary/60 border border-border-subtle">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
            <Monitor size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
              Terminales
            </div>
            <div className="text-sm font-bold text-text-primary truncate">
              {plan === 'FREE' ? '1 terminal recomendado' : 'Multi-terminal'}
            </div>
            <div className="text-[10px] text-text-tertiary">
              Dispositivo actual activo
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

function renderProgressMeter(metric: MetricUsage, icon: React.ReactNode) {
  const isUnlimited = metric.limit === 'UNLIMITED' || metric.limit === Infinity;
  const pct = metric.percentage ?? 0;

  // Colors based on state
  let barColor = 'bg-brand-primary';
  let badgeText = 'Normal';
  let badgeClass = 'text-text-tertiary bg-surface-secondary';

  if (metric.state === 'LIMIT_REACHED') {
    barColor = 'bg-status-danger';
    badgeText = 'Límite alcanzado';
    badgeClass = 'text-status-danger bg-status-danger/10 border border-status-danger/20';
  } else if (metric.state === 'WARNING') {
    barColor = 'bg-text-secondary';
    badgeText = 'Por alcanzar límite';
    badgeClass = 'text-text-primary bg-surface-secondary border border-border-default';
  } else if (metric.state === 'INFORMATIVE') {
    barColor = 'bg-brand-primary';
    badgeText = 'En uso';
    badgeClass = 'text-brand-primary bg-brand-primary/10 border border-brand-primary/20';
  }

  return (
    <div className="p-4 rounded-2xl bg-surface-secondary/50 border border-border-subtle space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-bold text-text-primary">{metric.label}</span>
        </div>
        {!isUnlimited && (
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${badgeClass}`}>
            {badgeText}
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-xl font-extrabold text-text-primary tracking-tight">
          {metric.current.toLocaleString()}
        </span>
        <span className="text-xs text-text-tertiary">
          {isUnlimited ? 'de Ilimitados' : `de ${metric.limit.toLocaleString()}`}
        </span>
      </div>

      {/* Progress Bar */}
      {!isUnlimited ? (
        <div className="space-y-1">
          <div className="w-full h-2 rounded-full bg-border-default overflow-hidden">
            <div
              className={`h-full ${barColor} transition-all duration-300 rounded-full`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <div className="flex justify-end">
            <span className="text-[10px] text-text-tertiary font-medium">{pct}% utilizado</span>
          </div>
        </div>
      ) : (
        <div className="w-full h-2 rounded-full bg-emerald-500/20 overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full w-full" />
        </div>
      )}
    </div>
  );
}
