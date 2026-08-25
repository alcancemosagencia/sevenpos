import React from 'react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { TopProductItem } from '../../types/dashboard';
import { useCountry } from '../../context/CountryContext';

export interface DashboardTopProductsProps {
  data: TopProductItem[];
}

export const DashboardTopProducts: React.FC<DashboardTopProductsProps> = ({ data }) => {
  const { formatMoney } = useCountry();
  const isEmpty = data.length === 0;

  return (
    <Card variant="default" padding="lg" className="p-4 sm:p-5 flex flex-col h-full min-h-[250px]">
      {/* Header with Title & Subtitle */}
      <div className="pb-3 border-b border-border-subtle">
        <h3 className="text-sm sm:text-base font-bold text-text-primary">
          Productos más vendidos
        </h3>
        <p className="text-xs text-text-secondary">
          Participación por cantidad vendida
        </p>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex items-center justify-center pt-2">
        {isEmpty ? (
          <EmptyState
            compact
            title="Sin datos en el período seleccionado."
          />
        ) : (
          <div className="w-full divide-y divide-border-subtle">
            {data.map((product, index) => (
              <div
                key={product.id}
                className="py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-surface-secondary text-text-tertiary flex items-center justify-center text-[10px] font-bold shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-text-primary truncate">
                      {product.name}
                    </p>
                    <p className="text-[11px] text-text-tertiary truncate">
                      {product.category}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-bold text-text-primary">
                    {product.unitsSold} uds
                  </p>
                  <p className="text-[11px] text-text-tertiary">
                    {formatMoney(product.totalRevenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
