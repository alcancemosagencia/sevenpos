import React from 'react';
import { Button } from '../../../components/ui/Button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface PriceConflictItem {
  productName: string;
  presentationName?: string | null;
  previousPrice: number;
  newPrice: number;
}

interface PosPriceChangedModalProps {
  isOpen: boolean;
  conflicts: PriceConflictItem[];
  onAcknowledge: () => void;
}

export const PosPriceChangedModal: React.FC<PosPriceChangedModalProps> = ({
  isOpen,
  conflicts,
  onAcknowledge,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm dark:bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-border-strong rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-5 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-status-warning/10 text-status-warning flex items-center justify-center">
            <AlertCircle size={26} />
          </div>
          <h2 className="text-base font-bold text-text-primary">El precio de algunos productos cambió</h2>
          <p className="text-xs text-text-secondary">
            Actualizamos el carrito con los precios vigentes del catálogo. Por favor revísalo antes de confirmar la venta.
          </p>

          <div className="w-full mt-2 p-3 bg-surface-secondary rounded-xl border border-border-default max-h-48 overflow-y-auto text-left flex flex-col gap-2">
            {conflicts.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border-default/40 last:border-0">
                <span className="font-semibold text-text-primary truncate">
                  {c.productName} {c.presentationName ? `· ${c.presentationName}` : ''}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-text-tertiary line-through">${c.previousPrice.toLocaleString('es-ES')}</span>
                  <span className="font-bold text-brand-primary">${c.newPrice.toLocaleString('es-ES')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end px-5 py-3.5 border-t border-border-default bg-surface-secondary/20">
          <Button variant="primary" leftIcon={<RefreshCw size={14} />} onClick={onAcknowledge}>
            Entendido, revisar carrito
          </Button>
        </div>
      </div>
    </div>
  );
};
