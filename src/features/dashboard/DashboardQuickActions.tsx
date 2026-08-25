import React from 'react';
import { ShoppingCart, Boxes, FileText } from 'lucide-react';

export interface DashboardQuickActionsProps {
  onNewSale?: () => void;
  onAddInventory?: () => void;
  onViewReports?: () => void;
}

export const DashboardQuickActions: React.FC<DashboardQuickActionsProps> = ({
  onNewSale,
  onAddInventory,
  onViewReports,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
      {/* 1. Nueva Venta */}
      <button
        type="button"
        onClick={onNewSale}
        className="flex items-center justify-center gap-2.5 py-3 px-4 bg-surface-secondary/70 hover:bg-surface-secondary text-text-primary rounded-[var(--radius-card)] border border-border-default hover:border-border-strong transition-all duration-150 cursor-pointer shadow-xs active:scale-[0.99]"
      >
        <ShoppingCart size={17} className="text-text-secondary" strokeWidth={2} />
        <span className="text-xs sm:text-sm font-medium">Nueva venta</span>
      </button>

      {/* 2. Agregar inventario */}
      <button
        type="button"
        onClick={onAddInventory}
        className="flex items-center justify-center gap-2.5 py-3 px-4 bg-surface-secondary/70 hover:bg-surface-secondary text-text-primary rounded-[var(--radius-card)] border border-border-default hover:border-border-strong transition-all duration-150 cursor-pointer shadow-xs active:scale-[0.99]"
      >
        <Boxes size={17} className="text-text-secondary" strokeWidth={2} />
        <span className="text-xs sm:text-sm font-medium">Agregar inventario</span>
      </button>

      {/* 3. Ver reportes */}
      <button
        type="button"
        onClick={onViewReports}
        className="flex items-center justify-center gap-2.5 py-3 px-4 bg-surface-secondary/70 hover:bg-surface-secondary text-text-primary rounded-[var(--radius-card)] border border-border-default hover:border-border-strong transition-all duration-150 cursor-pointer shadow-xs active:scale-[0.99]"
      >
        <FileText size={17} className="text-text-secondary" strokeWidth={2} />
        <span className="text-xs sm:text-sm font-medium">Ver reportes</span>
      </button>
    </div>
  );
};
