import React, { useState, useRef } from 'react';
import { ArrowRight, ArrowLeft, User, ShieldCheck, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { OwnerData } from '../../../types/onboarding';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { PinInput, PinInputHandle } from '../components/PinInput';

export interface OwnerStepProps {
  data: OwnerData;
  onUpdateOwner: (data: Partial<OwnerData>) => void;
  pin: string;
  confirmPin: string;
  onChangePin: (pin: string) => void;
  onChangeConfirmPin: (confirmPin: string) => void;
  onNext: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
  error?: string | null;
}

export const OwnerStep: React.FC<OwnerStepProps> = ({
  data,
  onUpdateOwner,
  pin,
  confirmPin,
  onChangePin,
  onChangeConfirmPin,
  onNext,
  onBack,
  isSubmitting = false,
  error = null,
}) => {
  const [nameError, setNameError] = useState('');
  const [pinError, setPinError] = useState('');
  const confirmPinRef = useRef<PinInputHandle>(null);

  const handlePinChange = (newPin: string) => {
    onChangePin(newPin);
    if (pinError) setPinError('');
    // Auto-advance to confirm field when 4 digits are completed
    if (newPin.length === 4) {
      setTimeout(() => {
        confirmPinRef.current?.focus();
      }, 50);
    }
  };

  const handleConfirmPinChange = (newConfirmPin: string) => {
    onChangeConfirmPin(newConfirmPin);
    if (pinError) setPinError('');
  };

  const isPinComplete = pin.length === 4;
  const isConfirmComplete = confirmPin.length === 4;
  const isMatching = isPinComplete && isConfirmComplete && pin === confirmPin;
  const hasMismatch = isPinComplete && isConfirmComplete && pin !== confirmPin;

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.firstName.trim()) {
      setNameError('El nombre del propietario es obligatorio.');
      return;
    }
    setNameError('');

    if (!isPinComplete) {
      setPinError('El PIN debe tener 4 dígitos.');
      return;
    }

    if (!isConfirmComplete) {
      setPinError('Debe confirmar su PIN de 4 dígitos.');
      return;
    }

    if (!isMatching) {
      setPinError('Los PIN ingresados no coinciden.');
      return;
    }

    setPinError('');
    onNext();
  };

  return (
    <form onSubmit={handleContinue} className="space-y-4">
      {/* 1. Nombre & Apellido */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Nombre del dueño *"
          placeholder="Ej. Omar"
          value={data.firstName}
          error={nameError}
          onChange={(e) => {
            onUpdateOwner({ firstName: e.target.value });
            if (nameError) setNameError('');
          }}
          leftIcon={<User size={16} />}
          autoFocus
        />

        <Input
          label="Apellido (Opcional)"
          placeholder="Ej. Torres"
          value={data.lastName || ''}
          onChange={(e) => onUpdateOwner({ lastName: e.target.value })}
        />
      </div>

      {/* 2. Correo & Rol */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
        <Input
          label="Correo electrónico (Opcional)"
          type="email"
          placeholder="admin@minegocio.com"
          value={data.email || ''}
          onChange={(e) => onUpdateOwner({ email: e.target.value })}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary">
            Rol en el sistema
          </label>
          <div className="h-10 px-3 rounded-[var(--radius-control)] bg-surface-secondary border border-border-default flex items-center justify-between text-sm font-semibold text-text-primary shadow-xs">
            <span className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-brand-primary" />
              Dueño (Administrador Principal)
            </span>
          </div>
        </div>
      </div>

      {/* 3. PIN Setup Section (Refined Credential Setup without bottom keypad) */}
      <div className="pt-3 border-t border-border-subtle space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-brand-primary" />
            <h4 className="text-sm font-bold text-text-primary">
              Crea tu PIN de acceso (4 dígitos)
            </h4>
          </div>
          <span className="text-[11px] text-text-tertiary">
            Escribe con tu teclado físico
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-[var(--radius-card)] bg-surface border border-border-default shadow-xs">
          {/* PIN Input 1 */}
          <div className="flex flex-col items-center gap-1.5">
            <PinInput
              label="Nuevo PIN"
              value={pin}
              onChange={handlePinChange}
              hasError={hasMismatch || !!pinError}
              isSuccess={isMatching}
            />
            <span className="text-[10px] text-text-tertiary">
              4 dígitos numéricos
            </span>
          </div>

          {/* PIN Input 2 (Confirm) */}
          <div className="flex flex-col items-center gap-1.5">
            <PinInput
              ref={confirmPinRef}
              label="Confirmar PIN"
              value={confirmPin}
              onChange={handleConfirmPinChange}
              hasError={hasMismatch || !!pinError}
              isSuccess={isMatching}
            />
            <span className="text-[10px] text-text-tertiary">
              Repite el mismo código
            </span>
          </div>
        </div>

        {/* Real-time Match Feedback */}
        <div className="min-h-[22px] flex items-center justify-center">
          {isMatching && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold animate-in fade-in-0 duration-150">
              <CheckCircle2 size={14} />
              <span>Los PIN coinciden correctamente</span>
            </div>
          )}

          {hasMismatch && (
            <div className="flex items-center gap-1.5 text-xs text-status-danger font-semibold animate-in fade-in-0 duration-150">
              <span>Los PIN ingresados no coinciden</span>
            </div>
          )}

          {pinError && !hasMismatch && (
            <p className="text-xs text-status-danger font-medium animate-shake">
              {pinError}
            </p>
          )}

          {!isMatching && !hasMismatch && !pinError && (
            <p className="text-[11px] text-text-tertiary">
              Usarás este PIN para desbloquear rápidamente SevenPOS en este equipo.
            </p>
          )}
        </div>
      </div>

      {/* Submission Error Alert */}
      {error && (
        <div className="p-3.5 rounded-[var(--radius-button)] bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-500 animate-in fade-in-0">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-text-primary">
              No pudimos finalizar la configuración
            </h4>
            <p className="text-xs text-text-secondary mt-0.5">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="pt-2 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="md"
          leftIcon={<ArrowLeft size={16} />}
          onClick={onBack}
          disabled={isSubmitting}
        >
          Atrás
        </Button>

        <Button
          type="submit"
          variant="brand"
          size="md"
          rightIcon={<ArrowRight size={16} />}
          isLoading={isSubmitting}
          disabled={!isMatching || isSubmitting}
          className="px-6 font-semibold"
        >
          Continuar
        </Button>
      </div>
    </form>
  );
};
