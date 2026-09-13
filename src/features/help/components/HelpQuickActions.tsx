import React from 'react';
import { Keyboard, Settings, Store, HelpCircle, ArrowRight } from 'lucide-react';

export interface HelpQuickActionsProps {
  onSelectShortcuts: () => void;
  onNavigateSettings?: () => void;
  onNavigatePos?: () => void;
  onScrollToSupport: () => void;
}

export const HelpQuickActions: React.FC<HelpQuickActionsProps> = ({
  onSelectShortcuts,
  onNavigateSettings,
  onNavigatePos,
  onScrollToSupport,
}) => {
  const actions = [
    {
      id: 'shortcuts',
      title: 'Atajos de teclado',
      description: 'Comandos rápidos (F2, Escape) para operar ágilmente en el mostrador.',
      icon: Keyboard,
      onClick: onSelectShortcuts,
      badge: 'F2',
    },
    {
      id: 'pos',
      title: 'Ir a Vender (POS)',
      description: 'Acceso directo a la pantalla de ventas y cobros.',
      icon: Store,
      onClick: onNavigatePos,
    },
    {
      id: 'settings',
      title: 'Configurar negocio',
      description: 'Ajustar datos comerciales, moneda y usuarios de caja.',
      icon: Settings,
      onClick: onNavigateSettings,
    },
    {
      id: 'support',
      title: 'Recursos de ayuda',
      description: 'Consulta guías operativas o busca temas frecuentes.',
      icon: HelpCircle,
      onClick: onScrollToSupport,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {actions.map((act) => {
        const Icon = act.icon;
        return (
          <button
            key={act.id}
            type="button"
            onClick={act.onClick}
            className="group flex flex-col justify-between p-4 bg-surface rounded-2xl border border-border-default hover:border-brand-primary/40 hover:shadow-md transition-all text-left cursor-pointer active:scale-[0.99]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-surface-secondary text-brand-primary flex items-center justify-center border border-border-default group-hover:bg-brand-primary/10 transition-colors">
                  <Icon size={20} />
                </div>
                {act.badge && (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-surface-secondary border border-border-default text-text-secondary">
                    {act.badge}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-text-primary group-hover:text-brand-primary transition-colors">
                {act.title}
              </h3>
              <p className="text-xs text-text-tertiary mt-1 leading-relaxed line-clamp-2">
                {act.description}
              </p>
            </div>

            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-brand-primary">
              <span>Abrir</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        );
      })}
    </div>
  );
};
