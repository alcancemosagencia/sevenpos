import React from 'react';
import { Package, Tags, Layers, AlertCircle } from 'lucide-react';
import { ProductKpiSummary } from '../../../domain/catalog/ProductRepository';

interface ProductKpisProps {
  kpis: ProductKpiSummary;
  isLoading?: boolean;
}

export const ProductKpis: React.FC<ProductKpisProps> = ({ kpis, isLoading = false }) => {
  const cards = [
    {
      id: 'active',
      title: 'Productos activos',
      value: kpis.activeProducts,
      icon: Package,
      color: 'text-brand-primary',
      bgColor: 'bg-brand-primary/10',
      borderColor: 'border-brand-primary/20',
    },
    {
      id: 'categories',
      title: 'Categorías',
      value: kpis.totalCategories,
      icon: Tags,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
    },
    {
      id: 'presentations',
      title: 'Con presentaciones',
      value: kpis.productsWithPresentations,
      icon: Layers,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
    {
      id: 'uncategorized',
      title: 'Sin categoría',
      value: kpis.uncategorizedProducts,
      icon: AlertCircle,
      color: kpis.uncategorizedProducts > 0 ? 'text-amber-400' : 'text-text-tertiary',
      bgColor: kpis.uncategorizedProducts > 0 ? 'bg-amber-500/10' : 'bg-surface-secondary',
      borderColor: kpis.uncategorizedProducts > 0 ? 'border-amber-500/20' : 'border-border-default',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            className={`p-4 rounded-xl bg-surface-primary border border-border-default shadow-sm flex items-center justify-between transition-all hover:border-border-hover`}
          >
            <div>
              <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">{c.title}</p>
              {isLoading ? (
                <div className="h-7 w-12 bg-surface-secondary rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold text-text-primary tracking-tight mt-1">{c.value}</p>
              )}
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.bgColor} ${c.color} shrink-0`}>
              <Icon size={20} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
