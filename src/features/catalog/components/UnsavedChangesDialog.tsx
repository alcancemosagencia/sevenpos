import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onStay: () => void;
  onLeave: () => void;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  isOpen,
  onStay,
  onLeave,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm dark:bg-black/80 animate-in fade-in duration-150">
      <div
        className="w-full max-w-sm bg-surface border border-border-strong rounded-2xl shadow-2xl p-5 animate-in zoom-in-95 duration-150 text-center space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
          <AlertTriangle size={24} />
        </div>

        <div>
          <h3 className="text-base font-bold text-text-primary">Tienes cambios sin guardar</h3>
          <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
            Si sales de esta pantalla ahora, se perderán las modificaciones que no hayas guardado.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onStay}
            className="flex-1 text-xs"
          >
            Seguir editando
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={onLeave}
            className="flex-1 text-xs"
          >
            Salir sin guardar
          </Button>
        </div>
      </div>
    </div>
  );
};
