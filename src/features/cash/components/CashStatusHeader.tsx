import React from 'react';
import { CashSession } from '../../../domain/cash/CashSession';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Wallet, LockOpen, Lock, ArrowDownToLine, ArrowUpFromLine, Clock, User } from 'lucide-react';

interface CashStatusHeaderProps {
  session: CashSession | null;
  registerName: string;
  onOpenCash: () => void;
  onCloseCash: () => void;
  onCashIn: () => void;
  onCashOut: () => void;
}

export const CashStatusHeader: React.FC<CashStatusHeaderProps> = ({
  session,
  registerName,
  onOpenCash,
  onCloseCash,
  onCashIn,
  onCashOut,
}) => {
  const isOpen = session?.status === 'OPEN';

  const formatOpenedTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const formatOpenedDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-surface border border-border-default rounded-2xl p-4 sm:p-5 md:p-6 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left Status Info */}
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
          <div
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${
              isOpen
                ? 'bg-status-success/10 text-status-success border border-status-success/20'
                : 'bg-surface-secondary text-text-tertiary border border-border-default'
            }`}
          >
            {isOpen ? <LockOpen size={22} /> : <Lock size={22} />}
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-text-primary flex items-center gap-2">
                <Wallet size={18} className="text-brand-primary" />
                {registerName}
              </h2>
              <Badge variant={isOpen ? 'success' : 'neutral'} size="sm">
                {isOpen ? 'Caja abierta' : 'Caja cerrada'}
              </Badge>
            </div>

            {isOpen && session ? (
              <div className="flex items-center gap-x-4 gap-y-1 text-xs text-text-secondary flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Clock size={13} className="text-text-tertiary" />
                  Abierta hoy a las {formatOpenedTime(session.openedAt)} ({formatOpenedDate(session.openedAt)})
                </span>
                <span className="flex items-center gap-1.5">
                  <User size={13} className="text-text-tertiary" />
                  Por: <strong className="text-text-primary font-semibold">{session.openedByNameSnapshot}</strong>
                </span>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-text-secondary">
                No hay ningún turno activo actualmente. Abre la caja para comenzar a registrar ventas.
              </p>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto justify-start md:justify-end shrink-0">
          {isOpen ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={onCashIn}
                leftIcon={<ArrowDownToLine size={15} className="text-status-success" />}
                className="w-full sm:w-auto"
              >
                Ingresar efectivo
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={onCashOut}
                leftIcon={<ArrowUpFromLine size={15} className="text-status-warning" />}
                className="w-full sm:w-auto"
              >
                Retirar efectivo
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={onCloseCash}
                leftIcon={<Lock size={15} />}
                className="w-full sm:w-auto"
              >
                Cerrar caja
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={onOpenCash}
              leftIcon={<LockOpen size={16} />}
              className="w-full sm:w-auto"
            >
              Abrir caja
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
