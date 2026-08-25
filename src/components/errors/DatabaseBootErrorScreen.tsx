import React, { useState } from 'react';
import { Database, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/Button';
import horizontalLogo from '../../assets/branding/sevenpos-logo-horizontal.png';

export interface DatabaseBootErrorScreenProps {
  error?: string;
  onRetry: () => void;
}

export const DatabaseBootErrorScreen: React.FC<DatabaseBootErrorScreenProps> = ({
  error = 'Error desconocido al abrir la base de datos local SQLite.',
  onRetry,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetryClick = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-text-primary flex items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-lg bg-surface border border-border-default rounded-[var(--radius-modal)] p-6 sm:p-8 shadow-[var(--shadow-elevated)] flex flex-col items-center text-center space-y-5 animate-in fade-in-0 duration-200">
        {/* Brand Header */}
        <div className="bg-[#08090d] px-3 py-1.5 rounded-xl border border-white/10 shadow-xs inline-flex items-center">
          <img src={horizontalLogo} alt="SevenPOS" className="h-6 object-contain" />
        </div>

        {/* Icon & Title */}
        <div className="w-14 h-14 rounded-full bg-status-danger-bg text-status-danger flex items-center justify-center ring-4 ring-status-danger/10">
          <Database size={28} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            No pudimos abrir los datos locales
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-md">
            SevenPOS no pudo conectar con el archivo de base de datos local (<code className="text-brand-primary font-mono text-xs">sevenpos.db</code>). Su información está protegida y no se ha eliminado.
          </p>
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3 w-full justify-center">
          <Button
            variant="brand"
            size="md"
            leftIcon={<RefreshCw size={16} className={isRetrying ? 'animate-spin' : ''} />}
            onClick={handleRetryClick}
            disabled={isRetrying}
            className="w-full sm:w-auto font-semibold px-6"
          >
            {isRetrying ? 'Reintentando...' : 'Reintentar conexión'}
          </Button>
        </div>

        {/* Technical Diagnostics Expander */}
        <div className="w-full pt-4 border-t border-border-subtle text-left">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-between w-full text-xs font-semibold text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer py-1"
          >
            <span className="flex items-center gap-1.5">
              <AlertTriangle size={13} className="text-status-warning" />
              Detalles técnicos de diagnóstico
            </span>
            {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showDetails && (
            <div className="mt-2 p-3 rounded-[var(--radius-card)] bg-surface-secondary/70 border border-border-default text-xs font-mono text-status-danger break-words leading-relaxed animate-in fade-in-0 duration-150">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
