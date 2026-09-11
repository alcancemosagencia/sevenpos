import React from 'react';
import { Tabs } from '@heroui/react';
import { Shield, ShoppingBag, Layers, Activity } from 'lucide-react';

export type AuditTabKey = 'todos' | 'seguridad' | 'operaciones' | 'inventario';

export interface AuditTabsProps {
  activeTab: AuditTabKey;
  onTabChange: (tab: AuditTabKey) => void;
  securityCount?: number;
  criticalCount?: number;
}

interface TabConfig {
  key: AuditTabKey;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export const AuditTabs: React.FC<AuditTabsProps> = ({
  activeTab,
  onTabChange,
  securityCount = 0,
  criticalCount = 0,
}) => {
  const tabsList: TabConfig[] = [
    {
      key: 'todos',
      label: 'Todos',
      icon: <Activity size={15} className="shrink-0" />,
    },
    {
      key: 'seguridad',
      label: 'Seguridad y Acceso',
      icon: <Shield size={15} className="shrink-0" />,
      badge: securityCount > 0 ? securityCount : undefined,
    },
    {
      key: 'operaciones',
      label: 'Ventas y Caja',
      icon: <ShoppingBag size={15} className="shrink-0" />,
    },
    {
      key: 'inventario',
      label: 'Inventario y Catálogo',
      icon: <Layers size={15} className="shrink-0" />,
      badge: criticalCount > 0 ? criticalCount : undefined,
    },
  ];

  return (
    <div className="w-fit max-w-full">
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => onTabChange(key as AuditTabKey)}
        aria-label="Pestañas de auditoría y seguridad"
        className="w-full max-w-full"
      >
        <Tabs.ListContainer className="relative bg-surface-secondary/90 dark:bg-[#18181b]/95 border border-border-default/80 dark:border-white/10 rounded-2xl p-1 shadow-xs max-w-full overflow-hidden">
          <Tabs.List className="flex items-center gap-1 w-max p-0">
            {tabsList.map((tab) => {
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
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-brand-primary/20 text-brand-primary font-bold">
                      {tab.badge}
                    </span>
                  )}
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
    </div>
  );
};
