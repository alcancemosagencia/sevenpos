import React from 'react';
import { Button } from './Button';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return (
          <div className="w-12 h-12 rounded-full bg-status-danger/10 text-status-danger flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-full bg-status-warning/10 text-status-warning flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
        );
      case 'primary':
      default:
        return (
          <div className="w-12 h-12 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center">
            <Info size={24} />
          </div>
        );
    }
  };

  const getButtonVariant = () => {
    switch (variant) {
      case 'danger':
        return 'danger' as const;
      case 'warning':
        return 'secondary' as const;
      case 'primary':
      default:
        return 'primary' as const;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-sm bg-surface border border-border-default rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="p-5 flex flex-col items-center text-center gap-3">
          {getIcon()}
          <h2 id="confirm-modal-title" className="text-base font-bold text-text-primary">
            {title}
          </h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            {description}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border-default bg-surface-secondary/20">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={getButtonVariant()}
            disabled={isLoading}
            onClick={() => {
              onConfirm();
            }}
          >
            {isLoading ? 'Procesando...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
