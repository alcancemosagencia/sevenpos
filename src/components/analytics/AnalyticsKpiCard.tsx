import React from 'react';
import { Card } from '../ui/Card';
import { ArrowUpRight, ArrowDownRight, Minus, Info } from 'lucide-react';
import { MetricDelta } from '../../application/analytics/types';

interface AnalyticsKpiCardProps {
  title: string;
  value: string;
  delta?: MetricDelta;
  comparisonLabel?: string;
  subtitle?: string;
  tooltip?: string;
  icon?: React.ReactNode;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'neutral' | 'danger';
  };
  highlight?: boolean;
}

export const AnalyticsKpiCard: React.FC<AnalyticsKpiCardProps> = ({
  title,
  value,
  delta,
  comparisonLabel,
  subtitle,
  tooltip,
  icon,
  badge,
  highlight = false,
}) => {
  const getBadgeStyle = (variant: 'success' | 'warning' | 'neutral' | 'danger') => {
    switch (variant) {
      case 'success':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'danger':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'neutral':
      default:
        return 'bg-content4/20 text-content2 border-divider';
    }
  };

  return (
    <Card
      variant={highlight ? 'raised' : 'default'}
      className={`relative p-4 sm:p-5 flex flex-col justify-between transition-all ${
        highlight ? 'border-primary/40 shadow-sm' : ''
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-content3 uppercase tracking-wider flex items-center gap-1.5">
            {title}
            {tooltip && (
              <span title={tooltip} className="inline-flex cursor-help text-content4 hover:text-content2">
                <Info size={13} />
              </span>
            )}
          </span>
          {icon && <div className="text-content3 p-1.5 rounded-lg bg-content4/10">{icon}</div>}
        </div>

        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{value}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap text-xs">
        {delta && delta.percentageDelta !== null ? (
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold ${
                delta.trend === 'UP'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : delta.trend === 'DOWN'
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : 'bg-content4/20 text-content3'
              }`}
            >
              {delta.trend === 'UP' && <ArrowUpRight size={13} />}
              {delta.trend === 'DOWN' && <ArrowDownRight size={13} />}
              {delta.trend === 'FLAT' && <Minus size={13} />}
              {delta.percentageDelta > 0 ? `+${delta.percentageDelta}%` : `${delta.percentageDelta}%`}
            </span>
            {comparisonLabel && <span className="text-content4">{comparisonLabel}</span>}
          </div>
        ) : subtitle ? (
          <span className="text-content4">{subtitle}</span>
        ) : (
          <div />
        )}

        {badge && (
          <span
            className={`px-2 py-0.5 text-[11px] font-medium rounded-full border ${getBadgeStyle(badge.variant)}`}
          >
            {badge.text}
          </span>
        )}
      </div>
    </Card>
  );
};
