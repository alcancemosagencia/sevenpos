import React, { useState } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/ui/Avatar';
import { PinInput } from '../onboarding/components/PinInput';
import { NumericKeypad } from '../onboarding/components/NumericKeypad';
import { AuthLayout } from './AuthLayout';


export const PinLoginPage: React.FC = () => {
  const {
    state,
    unlockWithPin,
    activeOwnerName,
    activeBusinessName,
    goToRegister,
    switchLocalAccount,
  } = useAuth();

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
    <AuthLayout illustration="terminal" terminalIdentity={activeBusinessName}>
      <div className="auth-pin">
        <div className="auth-pin-identity">
          <Avatar name={activeOwnerName} size="md" />
          <div><p>{activeOwnerName}</p><span>{state.owner.role} • {activeBusinessName}</span></div>
        </div>
        <h1>Ingrese su PIN de acceso</h1>
        <p className="auth-description">Use su PIN de 4 dígitos para desbloquear la sesión</p>
        <div className="auth-pin-controls">
          <PinInput variant="dots" value={pin} onChange={handlePinChange} hasError={hasError} autoFocus disabled={isVerifying} />
          {errorMessage && <p role="alert" className="auth-error"><ShieldAlert size={14} />{errorMessage}</p>}
          {isVerifying && <p role="status"><Lock size={13} />Verificando credenciales...</p>}
          <NumericKeypad className="auth-pin-keypad" onDigit={handleDigit} onDelete={handleDelete} onSubmit={() => pin.length === 4 && verifyPin(pin)} disabled={isVerifying} canSubmit={pin.length === 4} />
        </div>
        <div className="auth-footer">
          <button type="button" data-testid="pin-login-register-btn" onClick={goToRegister} className="auth-link">¿No tienes cuenta? <strong>Regístrate</strong></button>
          <button type="button" data-testid="pin-login-switch-account-btn" onClick={switchLocalAccount} className="auth-link">¿No es tu cuenta? <u>Cambiar sesión</u></button>
          <p>SevenPOS Terminal • Sesión Protegida</p>
        </div>
      </div>
    </AuthLayout>
  );
};
