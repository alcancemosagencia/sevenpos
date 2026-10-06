import React, { useEffect, useRef, useState } from 'react';
import { Label, ListBox, Select } from '@heroui/react';
import { AuthLayout } from './AuthLayout';
import { AuthButton, AuthField, AuthFeedback, PasswordRules } from './AuthControls';
import { COUNTRY_PROFILES } from '../../config/countries';
import type { SupportedCountryCode } from '../../types/country';
import { EXISTING_ACCOUNT_MESSAGE, SAFE_SIGNUP_ACTION } from '../../application/auth/authMessages';

interface RegisterAccountPageProps {
  onRegister: (params: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    businessName: string;
    countryCode: string;
    currencyCode: string;
  }) => Promise<{ success: boolean; error?: string }>;
  onBackToLogin: () => void;
  onForgotPassword?: () => void;
  defaultFirstName?: string;
  defaultLastName?: string;
  defaultEmail?: string;
  defaultBusinessName?: string;
  defaultCountryCode?: string;
  defaultCurrencyCode?: string;
}

export const RegisterAccountPage: React.FC<RegisterAccountPageProps> = ({
  onRegister,
  onBackToLogin,
  onForgotPassword,
  defaultFirstName = '', defaultLastName = '', defaultEmail = '',
  defaultBusinessName = '',
  defaultCountryCode = 'CL',
  defaultCurrencyCode,
}) => {
  const [step, setStep] = useState(1);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { stepHeading.current?.focus({ preventScroll: true }); }, [step]);
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState(defaultBusinessName);
  const [countryCode, setCountryCode] = useState(defaultCountryCode);
  const [currencyCode, setCurrencyCode] = useState(defaultCurrencyCode || (COUNTRY_PROFILES[defaultCountryCode as SupportedCountryCode] ?? COUNTRY_PROFILES.CL).primaryCurrency.code);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password Policy Checks
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUpperCase && hasNumber && hasSpecialChar;
  const doPasswordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!firstName.trim()) {
      setErrorMessage('Ingresa tu nombre.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Ingresa tu correo electrónico.');
      return;
    }
    if (!businessName.trim()) {
      setErrorMessage('Ingresa el nombre de tu negocio.');
      return;
    }
    if (!isPasswordValid) {
      setErrorMessage('La contraseña no cumple con los requisitos de seguridad.');
      return;
    }
    if (!doPasswordsMatch) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onRegister({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        businessName: businessName.trim(),
        countryCode,
        currencyCode,
      });

      if (!res.success) {
        setErrorMessage(EXISTING_ACCOUNT_MESSAGE); setStep(2);
      }
    } catch {
      setErrorMessage(EXISTING_ACCOUNT_MESSAGE); setStep(2);
    } finally {
      setPassword(''); setConfirmPassword('');
      setIsSubmitting(false);
    }
  };

  const country = COUNTRY_PROFILES[countryCode as SupportedCountryCode] ?? COUNTRY_PROFILES.CL;
  function nextStep(event: React.FormEvent) {
    event.preventDefault();
    if (step === 3) { void handleSubmit(event); return; }
    setErrorMessage(null);
    if (step === 1 && !businessName.trim()) { setErrorMessage('Ingresa el nombre de tu negocio.'); return; }
    if (step === 2 && !firstName.trim()) { setErrorMessage('Ingresa tu nombre.'); return; }
    setStep(step + 1);
  }
  const stepNames = ['Datos del negocio', 'Datos del propietario', 'Datos de seguridad'];
  return <AuthLayout illustration={step === 1 ? 'business' : step === 2 ? 'owner' : 'security'}>
    <h1>Crea tu cuenta</h1>
    <div className="auth-step-heading">
      <h2 id="register-step-title" ref={stepHeading} tabIndex={-1}>{stepNames[step - 1]}</h2>
      <div className="auth-step-track" role="progressbar" aria-label="Progreso de registro" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step} aria-valuetext={`Paso ${step} de 3: ${stepNames[step - 1]}`}>
        {[1,2,3].map(value => <span key={value} data-active={step === value} />)}
      </div>
    </div>
    {errorMessage && errorMessage !== EXISTING_ACCOUNT_MESSAGE && <AuthFeedback>{errorMessage}</AuthFeedback>}
    <form className="auth-form" onSubmit={nextStep} aria-labelledby="register-step-title" aria-busy={isSubmitting}>
      <div className="auth-step-fields" key={step}>
        {step === 1 && <>
          <AuthField id="register-business" label="Nombre comercial" value={businessName} onChange={setBusinessName} autoComplete="organization" maxLength={200} required />
          <Select className="auth-field" value={country.countryCode} onChange={value => { if (value) { const code = String(value) as SupportedCountryCode; setCountryCode(code); setCurrencyCode(COUNTRY_PROFILES[code].primaryCurrency.code); } }} isRequired>
            <Label className="auth-label">País / Moneda</Label>
            <Select.Trigger className="auth-country-trigger"><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover className="auth-country-popover"><ListBox>{Object.values(COUNTRY_PROFILES).map(profile => <ListBox.Item key={profile.countryCode} id={profile.countryCode} textValue={profile.countryName}>{profile.countryName} · {profile.primaryCurrency.code}</ListBox.Item>)}</ListBox></Select.Popover>
          </Select>
          {country.secondaryCurrency ? <Select className="auth-field" value={currencyCode} onChange={value => value && setCurrencyCode(String(value))} isRequired>
            <Label className="auth-label">Moneda</Label>
            <Select.Trigger className="auth-country-trigger"><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover className="auth-country-popover"><ListBox>{[country.primaryCurrency, country.secondaryCurrency].map(currency => <ListBox.Item key={currency.code} id={currency.code} textValue={currency.code}>{currency.code}</ListBox.Item>)}</ListBox></Select.Popover>
          </Select> : <p className="auth-currency">Moneda: {currencyCode} · según tu país</p>}
        </>}
        {step === 2 && <>
          <AuthField id="register-first-name" label="Nombres" value={firstName} onChange={setFirstName} autoComplete="given-name" maxLength={100} required />
          <AuthField id="register-last-name" label="Apellidos" value={lastName} onChange={setLastName} autoComplete="family-name" maxLength={100} />
          <AuthField id="register-email" label="Correo electrónico" type="email" value={email} onChange={value => {setEmail(value);setErrorMessage(null);}} autoComplete="email" required error={errorMessage === EXISTING_ACCOUNT_MESSAGE ? EXISTING_ACCOUNT_MESSAGE : undefined} />
          {errorMessage === EXISTING_ACCOUNT_MESSAGE && <p className="auth-error">{SAFE_SIGNUP_ACTION}</p>}
          {errorMessage === EXISTING_ACCOUNT_MESSAGE && <div className="auth-inline-actions"><button className="auth-link" type="button" onClick={onBackToLogin}>Iniciar sesión</button>{onForgotPassword && <button className="auth-link" type="button" onClick={onForgotPassword}>Recuperar contraseña</button>}</div>}
        </>}
        {step === 3 && <>
          <AuthField id="register-password" label="Contraseña" type="password" value={password} onChange={setPassword} autoComplete="new-password" required />
          <AuthField id="register-confirm-password" label="Confirmar contraseña" type="password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" required error={confirmPassword && !doPasswordsMatch ? 'Las contraseñas no coinciden.' : undefined} />
          <PasswordRules password={password} />
        </>}
      </div>
      <div className="auth-step-actions">
        <AuthButton type="submit" busy={isSubmitting} isDisabled={step === 3 && (!isPasswordValid || !doPasswordsMatch)}>{isSubmitting ? 'Creando cuenta…' : step === 3 ? 'Crear cuenta' : 'Siguiente'}</AuthButton>
        {step > 1 && <button type="button" className="auth-link" disabled={isSubmitting} onClick={() => {setStep(step - 1);setErrorMessage(null);}}>Atrás</button>}
      </div>
    </form>
    <p className="auth-footer">¿Ya tienes una cuenta? <button className="auth-link" type="button" disabled={isSubmitting} onClick={onBackToLogin}>Inicia sesión</button></p>
  </AuthLayout>;
};
