import React, { useState } from 'react';
import { Lock, ShieldAlert, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../../components/ui/Avatar';
import { PinInput } from '../onboarding/components/PinInput';
import { NumericKeypad } from '../onboarding/components/NumericKeypad';
import { IconButton } from '../../components/ui/IconButton';
import horizontalLogo from '../../assets/branding/sevenpos-logo-horizontal.png';
import welcomeIllustration from '../../assets/illustrations/onboarding-welcome.png';

export const PinLoginPage: React.FC = () => {
  const { state, unlockWithPin, activeOwnerName, activeBusinessName, startRegistration } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [pin, setPin] = useState('');
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyPin = async (pinToTest: string) => {
    setIsVerifying(true);
    setHasError(false);
    setErrorMessage('');

    try {
      const result = await unlockWithPin(pinToTest);
      if (!result.isValid) {
        setHasError(true);
        setErrorMessage(result.error || 'PIN incorrecto. Intente nuevamente.');
        setPin('');
      }
    } catch (err) {
      console.error('Error verifying PIN:', err);
      setHasError(true);
      setErrorMessage('Error al verificar el PIN.');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePinChange = (nextPin: string) => {
    setPin(nextPin);
    if (hasError) {
      setHasError(false);
      setErrorMessage('');
    }
    if (nextPin.length === 4) {
      verifyPin(nextPin);
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length < 4 && !isVerifying) {
      const nextPin = pin + digit;
      handlePinChange(nextPin);
    }
  };

  const handleDelete = () => {
    if (pin.length > 0 && !isVerifying) {
      handlePinChange(pin.slice(0, -1));
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-text-primary flex items-center justify-center p-3 sm:p-6 select-none relative overflow-hidden">
      {/* Top right theme toggle */}
      <div className="fixed top-3.5 right-3.5 sm:top-5 sm:right-5 z-40">
        <IconButton
          variant="secondary"
          size="md"
          ariaLabel={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          onClick={toggleTheme}
          className="shadow-xs"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </IconButton>
      </div>

      <div className="w-full max-w-4xl bg-surface border border-border-default rounded-[var(--radius-modal)] shadow-[var(--shadow-elevated)] overflow-hidden flex flex-col md:flex-row min-h-[540px]">
        {/* Left Visual Panel (Desktop/Tablet) */}
        <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-brand-primary/15 via-surface-secondary to-brand-secondary/10 p-8 flex-col justify-between border-r border-border-subtle relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <div className="bg-[#08090d] px-3 py-1.5 rounded-xl border border-white/10 shadow-xs inline-flex items-center">
              <img
                src={horizontalLogo}
                alt="SevenPOS"
                className="h-6 object-contain"
              />
            </div>
            <div className="pt-2">
              <h2 className="text-xl font-bold tracking-tight text-text-primary">
                Punto de Venta Profesional
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                {activeBusinessName} • Terminal Principal
              </p>
            </div>
          </div>

          {/* Scaled character art (+15% presence) */}
          <div className="relative z-10 flex justify-center items-end mt-4">
            <img
              src={welcomeIllustration}
              alt="SevenPOS Merchant"
              className="max-h-[295px] lg:max-h-[325px] object-contain drop-shadow-md transition-all duration-300"
            />
          </div>

          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-brand-primary/20 blur-3xl pointer-events-none" />
        </div>

        {/* Right PIN Login Panel */}
        <div className="flex-1 p-5 sm:p-7 md:p-8 flex flex-col justify-between items-center text-center bg-surface">
          {/* Header & Logo on mobile */}
          <div className="w-full space-y-2 flex flex-col items-center">
            <div className="md:hidden bg-[#08090d] px-2.5 py-1 rounded-lg border border-white/10 shadow-xs inline-flex items-center mb-1">
              <img
                src={horizontalLogo}
                alt="SevenPOS"
                className="h-5 object-contain"
              />
            </div>

            {/* User Identity Card */}
            <div className="inline-flex items-center gap-3 p-2 px-4 rounded-[var(--radius-card)] bg-surface-secondary border border-border-default shadow-xs">
              <Avatar name={activeOwnerName} size="md" />
              <div className="text-left min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">
                  {activeOwnerName}
                </p>
                <p className="text-xs text-text-tertiary font-medium">
                  {state.owner.role} • {activeBusinessName}
                </p>
              </div>
            </div>

            <div className="pt-1">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-text-primary">
                Ingrese su PIN de acceso
              </h1>
              <p className="text-xs text-text-secondary">
                Use su PIN de 4 dígitos para desbloquear la sesión
              </p>
            </div>
          </div>

          {/* PIN Display & Keypad */}
          <div className="w-full flex flex-col items-center gap-3 my-2">
            {/* Elegant Dots Indicator */}
            <PinInput
              variant="dots"
              value={pin}
              onChange={handlePinChange}
              hasError={hasError}
              autoFocus
              disabled={isVerifying}
            />

            {errorMessage && (
              <p className="text-xs font-semibold text-status-danger animate-shake flex items-center gap-1.5">
                <ShieldAlert size={14} />
                {errorMessage}
              </p>
            )}

            {isVerifying && (
              <p className="text-xs text-brand-primary font-medium flex items-center gap-1.5 animate-pulse">
                <Lock size={13} />
                Verificando credenciales...
              </p>
            )}

            {/* Circular Keypad */}
            <NumericKeypad
              onDigit={handleDigit}
              onDelete={handleDelete}
              onSubmit={() => pin.length === 4 && verifyPin(pin)}
              disabled={isVerifying}
              canSubmit={pin.length === 4}
            />
          </div>

          {/* Footer secondary action */}
          <div className="flex flex-col items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={startRegistration}
              className="text-xs text-text-secondary hover:text-brand-primary transition-colors cursor-pointer select-none"
            >
              ¿No tienes cuenta? <span className="font-bold text-brand-primary underline">Regístrate</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPin('');
                setHasError(false);
                setErrorMessage('');
              }}
              className="text-[11px] text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer select-none"
            >
              ¿No es tu cuenta? <span className="underline">Cambiar sesión</span>
            </button>
            <span className="text-[10px] text-text-tertiary">
              SevenPOS Terminal • Sesión Protegida
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
