import React from 'react';
import { Tabs } from '@heroui/react';
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  DollarSign,
  Users,
} from 'lucide-react';

export type ReportTabKey = 'resumen' | 'ventas' | 'inventario' | 'finanzas' | 'clientes';

export interface TabItem {
  key: ReportTabKey;
  label: string;
  icon: React.ReactNode;
}

export interface ReportsTabsProps {
  activeTab: ReportTabKey;
  onTabChange: (tab: ReportTabKey) => void;
  className?: string;
}

export const REPORT_TABS: TabItem[] = [
  { key: 'resumen', label: 'Resumen', icon: <LayoutDashboard size={15} className="shrink-0" /> },
  { key: 'ventas', label: 'Ventas', icon: <TrendingUp size={15} className="shrink-0" /> },
  { key: 'inventario', label: 'Inventario', icon: <Package size={15} className="shrink-0" /> },
  { key: 'finanzas', label: 'Finanzas', icon: <DollarSign size={15} className="shrink-0" /> },
  { key: 'clientes', label: 'Clientes', icon: <Users size={15} className="shrink-0" /> },
];

export const ReportsTabs: React.FC<ReportsTabsProps> = ({
  activeTab,
  onTabChange,
  className = '',
}) => {
  return (
    <div className={`w-fit max-w-full ${className}`}>
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => onTabChange(key as ReportTabKey)}
        aria-label="Pestañas de reportes e inteligencia operativa"
        className="w-full max-w-full"
      >
        <Tabs.ListContainer className="relative bg-surface-secondary/90 dark:bg-[#18181b]/95 border border-border-default/80 dark:border-white/10 rounded-2xl p-1 shadow-xs max-w-full overflow-hidden">
          <Tabs.List className="flex items-center gap-1 w-max p-0">
            {REPORT_TABS.map((tab) => {
              const isSelected = activeTab === tab.key;
              return (
                <Tabs.Tab
                  key={tab.key}
                  id={tab.key}
                  data-tab={tab.key}
                  className={`!w-auto flex-none shrink-0 flex items-center justify-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 ${
                    isSelected
                      ? 'bg-surface dark:bg-[#27272a] text-text-primary font-semibold shadow-xs border border-border-default/60 dark:border-white/10'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface/50 dark:hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {tab.icon}
                  <span className="whitespace-nowrap">{tab.label}</span>
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
    </div>
  );
};
