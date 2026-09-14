import React, { useEffect, useRef } from 'react';
import { Sparkles, X, Check, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

export interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  featureKey?: string;
  benefits?: string[];
  onNavigateToSubscription?: () => void;
}

const DEFAULT_PRO_BENEFITS = [
  'Productos y clientes ilimitados para tu catálogo',
  'Hasta 5 usuarios con PIN independiente y control de permisos',
  'Historial completo de ventas, reportes y auditoría',
  'Analítica de márgenes brutos, utilidades y comparativas',
  'Exportaciones en CSV y XLSX sin límite de fecha',
];

export const UpgradePromptModal: React.FC<UpgradePromptModalProps> = ({
  isOpen,
  onClose,
  title = 'Descubre SevenPOS Pro',
  message = 'Lleva el control de tu negocio al siguiente nivel con funciones avanzadas diseñadas para crecer.',
  benefits = DEFAULT_PRO_BENEFITS,
  onNavigateToSubscription,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCta = () => {
    onClose();
    if (onNavigateToSubscription) {
      onNavigateToSubscription();
    }
  };

  return (
    <div
      data-testid="upgrade-prompt-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0 duration-150"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        data-testid="upgrade-prompt-modal"
        className="w-full max-w-lg bg-surface border border-border-default rounded-3xl shadow-2xl p-6 sm:p-7 space-y-6 animate-in zoom-in-95 duration-150 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-brand-primary/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-secondary rounded-xl transition-colors cursor-pointer"
          aria-label="Cerrar modal de actualización"
        >
          <X size={18} />
        </button>

        {/* Header Icon + Titles */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0 border border-brand-primary/20 shadow-xs">
            <Sparkles size={24} />
          </div>
          <div className="space-y-1 pr-6">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-brand-primary/10 text-brand-primary uppercase tracking-wider border border-brand-primary/20">
                Plan Pro
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Pro Benefits List */}
        <div className="rounded-2xl bg-surface-secondary/70 border border-border-subtle p-4 space-y-2.5">
          <p className="text-xs font-bold text-text-primary uppercase tracking-wider mb-1">
            Lo que incluye SevenPOS Pro:
          </p>
          {benefits.map((b, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-text-secondary">
              <div className="w-4 h-4 rounded-full bg-brand-primary/15 text-brand-primary flex items-center justify-center shrink-0 mt-0.5">
                <Check size={11} strokeWidth={3} />
              </div>
              <span className="leading-snug">{b}</span>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-border-subtle">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full sm:w-auto"
            onClick={onClose}
          >
            Entendido
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            rightIcon={<ArrowRight size={15} />}
            className="w-full sm:w-auto"
            onClick={handleCta}
          >
            Conocer SevenPOS Pro
          </Button>
        </div>
      </div>
    </div>
  );
};
