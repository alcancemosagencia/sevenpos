import React from 'react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { HourlySalesPoint } from '../../types/dashboard';
import { useCountry } from '../../context/CountryContext';

export interface DashboardSalesHistoryProps {
  data: HourlySalesPoint[];
}

export const DashboardSalesHistory: React.FC<DashboardSalesHistoryProps> = ({ data }) => {
  const { formatMoney } = useCountry();
  const isEmpty = data.length === 0;

  const maxSale = Math.max(...data.map((d) => d.sales), 1);

  return (
    <Card variant="default" padding="lg" className="p-4 sm:p-5 flex flex-col h-full min-h-[250px]">
      {/* Header with Title & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-border-subtle">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-text-primary">
            Historial de ventas
          </h3>
          <p className="text-xs text-text-secondary">
            Compara ventas y ganancia por hora durante hoy.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-text-secondary self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Ventas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-primary" />
            <span>Ganancia</span>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex items-center justify-center pt-4">
        {isEmpty ? (
          <EmptyState
            compact
            title="Sin ventas registradas en el período seleccionado."
          />
        ) : (
          <div className="w-full h-full flex flex-col justify-end pt-2">
            <div className="grid grid-cols-7 gap-2 items-end h-44 pb-2 border-b border-border-subtle">
              {data.map((point, index) => {
                const salesHeight = Math.max((point.sales / maxSale) * 100, 8);
                const profitHeight = Math.max((point.profit / maxSale) * 100, 5);

                return (
                  <div key={index} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 h-full px-1">
                      {/* Ventas Bar */}
                      <div
                        style={{ height: `${salesHeight}%` }}
                        className="w-full max-w-[14px] bg-emerald-500 rounded-t-xs transition-all duration-300 group-hover:bg-emerald-400"
                        title={`Ventas ${point.hour}: ${formatMoney(point.sales)}`}
                      />
                      {/* Ganancia Bar */}
                      <div
                        style={{ height: `${profitHeight}%` }}
                        className="w-full max-w-[14px] bg-brand-primary rounded-t-xs transition-all duration-300 group-hover:bg-brand-primary-hover"
                        title={`Ganancia ${point.hour}: ${formatMoney(point.profit)}`}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-text-tertiary">
                      {point.hour}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="pt-3 flex items-center justify-between text-xs text-text-tertiary">
              <span>08:00 hrs</span>
              <span>14:00 hrs</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
