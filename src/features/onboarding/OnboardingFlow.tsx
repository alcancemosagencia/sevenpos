import React, { useState } from 'react';
import { OnboardingLayout } from './components/OnboardingLayout';
import { WelcomeStep } from './steps/WelcomeStep';
import { CountryStep } from './steps/CountryStep';
import { BusinessStep } from './steps/BusinessStep';
import { RegionalStep } from './steps/RegionalStep';
import { OwnerStep } from './steps/OwnerStep';
import { ConfirmationStep } from './steps/ConfirmationStep';
import { useAuth } from '../../context/AuthContext';
import { SupportedCountryCode } from '../../types/country';
import { COUNTRY_PROFILES } from '../../config/countries';

export const OnboardingFlow: React.FC = () => {
  const { state, updateDraftState, completeOnboarding, acknowledgeCompletion, isCompletionCelebrationActive } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (isCompletionCelebrationActive) return 6;
    if (state.currentStep && state.currentStep >= 1 && state.currentStep <= 5) return state.currentStep;
    return 1;
  });
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSubmittingOwner, setIsSubmittingOwner] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [isEntering, setIsEntering] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const goToStep = (step: number) => {
    setCurrentStep(step);
    if (step >= 1 && step <= 5) {
      updateDraftState({ currentStep: step });
    }
  };

  const handleCountrySelect = (countryCode: SupportedCountryCode) => {
    const profile = COUNTRY_PROFILES[countryCode];
    updateDraftState({
      countryCode,
      business: {
        ...state.business,
        phonePrefix: profile.phonePrefix,
      },
      regionalSettings: {
        primaryCurrencyCode: profile.primaryCurrency.code,
        enableSecondaryUSD: countryCode === 'VE' ? state.regionalSettings.enableSecondaryUSD : false,
      },
    });
  };

  // Step 5 -> Step 6: Coordinated Persistence in SQLite & Secure Vault
  const handleOwnerStepSubmit = async () => {
    setIsSubmittingOwner(true);
    setOwnerError(null);
    try {
      const result = await completeOnboarding(pin);
      if (!result.success) {
        setOwnerError(result.error || 'No se pudo guardar la configuración inicial.');
        return;
      }
      setCurrentStep(6);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setOwnerError(msg);
    } finally {
      setIsSubmittingOwner(false);
    }
  };


  // Step 6: Finalize First Run -> Transition to PIN Login
  const handleCompletionCTA = () => {
    setIsEntering(true);
    setCompletionError(null);
    try {
      acknowledgeCompletion();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setCompletionError(msg);
      setIsEntering(false);
    }
  };


  const stepMeta = [
    {
      title: 'Bienvenido a SevenPOS',
      description: 'Configuremos lo esencial para que puedas comenzar a vender.',
      heroHeadline: 'Deje su negocio listo antes de entrar por primera vez',
      heroSubheadline: 'Configuremos lo esencial para que puedas comenzar a vender con SevenPOS.',
    },
    {
      title: '¿Dónde opera tu negocio?',
      description: 'Seleccione el país para ajustar moneda, prefijo telefónico y formato fiscal.',
      heroHeadline: 'Selecciona la región operativa de tu comercio',
      heroSubheadline: 'SevenPOS adapta automáticamente moneda e identificación fiscal según tu país.',
    },
    {
      title: 'Datos de su negocio',
      description: 'Ingrese el nombre comercial y datos de contacto de su tienda o comercio.',
      heroHeadline: 'Personaliza la identidad de tu negocio',
      heroSubheadline: 'Estos datos aparecerán en sus recibos, comandas y reportes de venta.',
    },
    {
      title: 'Configuración regional y monedas',
      description: 'Valide la moneda base de operación comercial en su punto de venta.',
      heroHeadline: 'Configuración monetaria de alta precisión',
      heroSubheadline: 'Ajuste si operará en moneda local o en múltiples monedas de pago.',
    },
    {
      title: 'Usuario principal y seguridad',
      description: 'Cree el usuario administrador Dueño y configure el PIN de 4 dígitos para este dispositivo.',
      heroHeadline: 'Seguridad y control total de su negocio',
      heroSubheadline: 'El primer usuario tendrá permisos de Dueño y acceso rápido mediante PIN.',
    },
    {
      title: 'Todo está listo',
      description: 'Su configuración inicial está lista. Al continuar, irá a la pantalla de inicio de sesión por PIN.',
      heroHeadline: '¡Bienvenido a la nueva era de SevenPOS!',
      heroSubheadline: 'Su comercio está configurado y preparado para operar a máxima velocidad.',
    },
  ];

  const currentMeta = stepMeta[currentStep - 1];

  return (
    <OnboardingLayout
      currentStep={currentStep}
      totalSteps={6}
      stepTitle={currentMeta.title}
      stepDescription={currentMeta.description}
      heroHeadline={currentMeta.heroHeadline}
      heroSubheadline={currentMeta.heroSubheadline}
      isCompletion={currentStep === 6}
    >
      {currentStep === 1 && <WelcomeStep onNext={() => goToStep(2)} />}

      {currentStep === 2 && (
        <CountryStep
          selectedCountry={state.countryCode}
          onSelectCountry={handleCountrySelect}
          onNext={() => goToStep(3)}
          onBack={() => goToStep(1)}
        />
      )}

      {currentStep === 3 && (
        <BusinessStep
          countryCode={state.countryCode}
          data={state.business}
          onUpdate={(business) => updateDraftState({ business: { ...state.business, ...business } })}
          onNext={() => goToStep(4)}
          onBack={() => goToStep(2)}
        />
      )}

      {currentStep === 4 && (
        <RegionalStep
          countryCode={state.countryCode}
          settings={state.regionalSettings}
          onUpdate={(regionalSettings) =>
            updateDraftState({
              regionalSettings: { ...state.regionalSettings, ...regionalSettings },
            })
          }
          onNext={() => goToStep(5)}
          onBack={() => goToStep(3)}
        />
      )}

      {currentStep === 5 && (
        <OwnerStep
          data={state.owner}
          onUpdateOwner={(owner) => updateDraftState({ owner: { ...state.owner, ...owner } })}
          pin={pin}
          confirmPin={confirmPin}
          onChangePin={setPin}
          onChangeConfirmPin={setConfirmPin}
          onNext={handleOwnerStepSubmit}
          onBack={() => goToStep(4)}
          isSubmitting={isSubmittingOwner}
          error={ownerError}
        />
      )}

      {currentStep === 6 && (
        <ConfirmationStep
          state={state}
          onFinish={handleCompletionCTA}
          isLoading={isEntering}
          error={completionError}
          onRetry={handleCompletionCTA}
        />
      )}
    </OnboardingLayout>
  );
};
