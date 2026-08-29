import React, { useState } from 'react';
import { Lock, ShieldCheck, Delete, Check, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface SetupPinModalProps {
  isOpen: boolean;
  onSavePin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  onCancel?: () => void;
}

export const SetupPinModal: React.FC<SetupPinModalProps> = ({
  isOpen,
  onSavePin,
  onCancel,
}) => {
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPin = step === 'create' ? firstPin : confirmPin;

  const handleDigit = (digit: string) => {
    if (currentPin.length >= 4) return;
    const next = currentPin + digit;
    setErrorMessage(null);

    if (step === 'create') {
      setFirstPin(next);
      if (next.length === 4) {
        setTimeout(() => {
          setStep('confirm');
        }, 150);
      }
    } else {
      setConfirmPin(next);
      if (next.length === 4) {
        if (next !== firstPin) {
          setErrorMessage('Los PINs no coinciden. Intenta nuevamente.');
          setConfirmPin('');
          setFirstPin('');
          setStep('create');
        } else {
          // Submit valid matched PIN
          submitPin(next);
        }
      }
    }
  };

  const handleDelete = () => {
    setErrorMessage(null);
    if (step === 'create') {
      setFirstPin((prev) => prev.slice(0, -1));
    } else {
      if (confirmPin.length > 0) {
        setConfirmPin((prev) => prev.slice(0, -1));
      } else {
        setStep('create');
        setFirstPin('');
      }
    }
  };

  const submitPin = async (pin: string) => {
    setIsSubmitting(true);
    try {
      const res = await onSavePin(pin);
      if (!res.success) {
        setErrorMessage(res.error || 'Error al guardar PIN local.');
        setConfirmPin('');
        setFirstPin('');
        setStep('create');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al configurar PIN.');
      setConfirmPin('');
      setFirstPin('');
      setStep('create');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-surface border border-border-default rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center mx-auto">
          {step === 'create' ? <Lock size={28} /> : <ShieldCheck size={28} />}
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-text-primary">
            {step === 'create' ? 'Crea tu PIN de acceso' : 'Confirma tu PIN'}
          </h2>
          <p className="text-xs text-text-secondary">
            {step === 'create'
              ? 'Usa un PIN de 4 dígitos para desbloquear este terminal rápidamente.'
              : 'Ingresa nuevamente los 4 dígitos para confirmar.'}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs flex items-center gap-2 text-left">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 4-Dots Display */}
        <div className="flex justify-center items-center gap-4 py-2">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = index < currentPin.length;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-brand-primary scale-110 shadow-sm shadow-brand-primary/50'
                    : 'bg-surface-secondary border-2 border-border-default'
                }`}
              />
            );
          })}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-surface-secondary hover:bg-surface-hover border border-border-default text-lg font-bold text-text-primary active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-xs"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-surface-secondary hover:bg-surface-hover border border-border-default text-text-secondary active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            title="Borrar dígito"
          >
            <Delete size={20} />
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-surface-secondary hover:bg-surface-hover border border-border-default text-lg font-bold text-text-primary active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-xs"
          >
            0
          </button>

          <div className="h-14 rounded-2xl flex items-center justify-center text-brand-primary opacity-40">
            <Check size={20} />
          </div>
        </div>

        {onCancel && (
          <div className="pt-2">
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
