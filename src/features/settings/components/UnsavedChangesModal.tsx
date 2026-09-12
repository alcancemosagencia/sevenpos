import React from 'react';
import { Button } from '../../../components/ui/Button';
import { AlertCircle } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onStay: () => void;
  onDiscard: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onStay,
  onDiscard,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200">
      <div
        className="w-full max-w-md bg-surface border border-border-default rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-changes-title"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-status-warning/10 border border-status-warning/20 text-status-warning flex items-center justify-center shrink-0">
            <AlertCircle size={22} />
          </div>
          <div>
            <h3 id="unsaved-changes-title" className="text-base font-bold text-text-primary">
              Tienes cambios sin guardar
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Si cambias de sección ahora, las modificaciones no guardadas se perderán.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-border-default flex items-center justify-end gap-2.5">
          <Button type="button" variant="outline" size="md" onClick={onStay}>
            Seguir editando
          </Button>
          <Button type="button" variant="brand" size="md" onClick={onDiscard}>
            Descartar cambios
          </Button>
        </div>
      </div>
    </div>
  );
};
