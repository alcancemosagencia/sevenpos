import React from 'react';
import { Store, Database, ArrowRight, LogIn } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useAuth } from '../../../context/AuthContext';

export interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  const { goToAccountLogin } = useAuth();

  return (
    <div className="space-y-4">
      {/* Option 1: Configurar desde cero (Primary active) */}
      <div
        onClick={onNext}
        className="p-4 sm:p-5 rounded-[var(--radius-card)] border-2 border-brand-primary bg-brand-primary/5 cursor-pointer transition-all duration-150 flex items-start gap-4 select-none hover:shadow-xs active:scale-[0.99]"
      >
        <div className="w-10 h-10 rounded-[var(--radius-button)] bg-brand-primary text-white flex items-center justify-center shrink-0 shadow-xs">
          <Store size={20} strokeWidth={2} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-text-primary">
              Configurar un negocio nuevo
            </h3>
            <Badge variant="brand" size="sm">
              Recomendado
            </Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            Le guiaremos paso a paso para dejar su catálogo, moneda y usuario listos antes de comenzar a operar.
          </p>
        </div>
      </div>

      {/* Option 2: Restaurar desde respaldo (Disabled / Próximamente) */}
      <div className="p-4 sm:p-5 rounded-[var(--radius-card)] border border-border-default bg-surface-secondary/40 opacity-70 flex items-start gap-4 select-none cursor-not-allowed">
        <div className="w-10 h-10 rounded-[var(--radius-button)] bg-surface-secondary border border-border-default text-text-tertiary flex items-center justify-center shrink-0">
          <Database size={20} strokeWidth={2} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-text-secondary">
              Restaurar desde respaldo
            </h3>
            <Badge variant="neutral" size="sm">
              Próximamente
            </Badge>
          </div>
          <p className="text-xs text-text-tertiary mt-1 leading-relaxed">
            Restaure una copia de seguridad existente para recuperar su información en este dispositivo.
          </p>
        </div>
      </div>

      {/* Action CTA & Login Link */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          data-testid="welcome-login-btn"
          onClick={goToAccountLogin}
          className="text-xs text-text-secondary hover:text-brand-primary transition-colors cursor-pointer select-none inline-flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 rounded-lg p-1"
        >
          <LogIn size={14} />
          ¿Ya tienes cuenta? <span className="font-bold text-brand-primary underline">Inicia sesión</span>
        </button>

        <Button
          variant="brand"
          size="lg"
          rightIcon={<ArrowRight size={18} />}
          onClick={onNext}
          className="w-full sm:w-auto px-6 font-semibold shadow-sm"
        >
          Comenzar configuración
        </Button>
      </div>
    </div>
  );
};
