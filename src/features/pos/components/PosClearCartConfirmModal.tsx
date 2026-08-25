import React from 'react';
import { Button } from '../../../components/ui/Button';
import { AlertTriangle } from 'lucide-react';

interface PosClearCartConfirmModalProps {
  isOpen: boolean;
  itemCount: number;
  onClose: () => void;
  onConfirmClear: () => void;
}

export const PosClearCartConfirmModal: React.FC<PosClearCartConfirmModalProps> = ({
  isOpen,
  itemCount,
  onClose,
  onConfirmClear,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm dark:bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface border border-border-strong rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-5 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-status-danger/10 text-status-danger flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-base font-bold text-text-primary">¿Vaciar el carrito?</h2>
          <p className="text-xs text-text-secondary">
            Esta acción eliminará todos los {itemCount} productos agregados a la venta actual.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border-default bg-surface-secondary/20">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirmClear();
              onClose();
            }}
          >
            Sí, vaciar
          </Button>
        </div>
      </div>
    </div>
  );
};
