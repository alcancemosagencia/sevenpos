import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { OnboardingState, OnboardingStatus, SessionStatus } from '../types/onboarding';
import { SupportedCountryCode } from '../types/country';
import { useCountry } from './CountryContext';
import { BootApplication, BootStatus } from '../application/boot/BootApplication';
import { CompleteInitialSetup } from '../application/onboarding/CompleteInitialSetup';
import { VerifyPin } from '../application/auth/VerifyPin';
import { databaseManager } from '../infrastructure/database/DatabaseManager';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { pinVaultFactory } from '../infrastructure/security/PinVaultFactory';
import { onboardingRepository } from '../services/onboardingRepository';
import { resolveEntryRoute, syncBrowserUrl } from '../application/routing/RouteResolver';

interface AuthContextType {
  isHydrated: boolean;
  bootStatus: BootStatus;
  bootError?: string;
  retryBoot: () => Promise<void>;
  onboardingStatus: OnboardingStatus;
  sessionStatus: SessionStatus;
  isCompletionCelebrationActive: boolean;
  state: OnboardingState;
  updateDraftState: (partial: Partial<OnboardingState>) => void;
  completeOnboarding: (pin: string) => Promise<{ success: boolean; error?: string }>;
  acknowledgeCompletion: () => void;
  unlockWithPin: (pin: string) => Promise<{ isValid: boolean; error?: string; isLockedOut?: boolean }>;
  lockSession: () => void;
  resetOnboarding: () => void;
  startRegistration: () => void;
  goToLogin: () => void;
  switchLocalAccount: () => void;
  activeBusinessName: string;
  activeOwnerName: string;
  activeCountryCode: SupportedCountryCode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bootStatus, setBootStatus] = useState<BootStatus>('INITIALIZING');
  const [bootError, setBootError] = useState<string | undefined>(undefined);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>('incomplete');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('locked');
  // Runtime-only UI state for the Step 6 celebration. MUST ALWAYS start false on boot.
  const [isCompletionCelebrationActive, setIsCompletionCelebrationActive] = useState<boolean>(false);
  const [state, setState] = useState<OnboardingState>(() => onboardingRepository.load());
  const { setCountryCode } = useCountry();

  const businessRepo = repositoryFactory.getBusinessRepository();
  const userRepo = repositoryFactory.getUserRepository();
  const pinVault = pinVaultFactory.getPinVault();
  const sessionRepo = repositoryFactory.getSessionRepository();

  // Boot Application
  const runBoot = useCallback(async () => {
    setBootStatus('INITIALIZING');
    setBootError(undefined);

    const bootService = new BootApplication(databaseManager, businessRepo, userRepo, pinVault, sessionRepo);
    const result = await bootService.execute();

    if (result.status === 'BOOT_FAILURE') {
      setBootStatus('BOOT_FAILURE');
      setBootError(result.error);
      return;
    }

    setBootStatus('READY');
    setOnboardingStatus(result.onboardingStatus);
    setSessionStatus(result.sessionStatus);
    // Celebration state MUST remain false on fresh boot
    setIsCompletionCelebrationActive(false);

    if (result.business && result.owner) {
      const merged: OnboardingState = {
        onboardingStatus: 'completed',
        sessionStatus: result.sessionStatus,
        currentStep: 1,
        countryCode: result.business.countryCode,
        business: {
          name: result.business.name,
          fiscalId: result.business.fiscalId || '',
          phone: result.business.phone || '',
          phonePrefix: result.business.phonePrefix || '+56',
          address: result.business.address || '',
        },
        regionalSettings: {
          primaryCurrencyCode: result.settings?.primaryCurrency || 'CLP',
          secondaryCurrencyCode: result.settings?.secondaryCurrency || undefined,
          enableSecondaryUSD: result.settings?.secondaryCurrencyEnabled || false,
          exchangeRateProvider: (result.settings?.exchangeRateProvider as 'BCV' | 'MANUAL') || undefined,
        },
        owner: {
          firstName: result.owner.firstName,
          lastName: result.owner.lastName || '',
          email: result.owner.email || '',
          role: 'Dueño',
        },
      };
      setState(merged);
      setCountryCode(result.business.countryCode);
    }
  }, [businessRepo, userRepo, pinVault, sessionRepo, setCountryCode]);

  useEffect(() => {
    let isMounted = true;
    const bootService = new BootApplication(databaseManager, businessRepo, userRepo, pinVault, sessionRepo);
    bootService.execute().then((result) => {
      if (!isMounted) return;
      if (result.status === 'BOOT_FAILURE') {
        setBootStatus('BOOT_FAILURE');
        setBootError(result.error);
        return;
      }

      setBootStatus('READY');
      setOnboardingStatus(result.onboardingStatus);
      setSessionStatus(result.sessionStatus);
      setIsCompletionCelebrationActive(false);

      if (result.business && result.owner) {
        const merged: OnboardingState = {
          onboardingStatus: 'completed',
          sessionStatus: result.sessionStatus,
          currentStep: 1,
          countryCode: result.business.countryCode,
          business: {
            name: result.business.name,
            fiscalId: result.business.fiscalId || '',
            phone: result.business.phone || '',
            phonePrefix: result.business.phonePrefix || '+56',
            address: result.business.address || '',
          },
          regionalSettings: {
            primaryCurrencyCode: result.settings?.primaryCurrency || 'CLP',
            secondaryCurrencyCode: result.settings?.secondaryCurrency || undefined,
            enableSecondaryUSD: result.settings?.secondaryCurrencyEnabled || false,
            exchangeRateProvider: (result.settings?.exchangeRateProvider as 'BCV' | 'MANUAL') || undefined,
          },
          owner: {
            firstName: result.owner.firstName,
            lastName: result.owner.lastName || '',
            email: result.owner.email || '',
            role: 'Dueño',
          },
        };
        setState(merged);
        setCountryCode(result.business.countryCode);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [businessRepo, userRepo, pinVault, sessionRepo, setCountryCode]);

  // Synchronize browser canonical URL anytime auth/onboarding lifecycle state changes
  useEffect(() => {
    const isHydrated = bootStatus === 'READY';
    const targetRoute = resolveEntryRoute({
      isHydrated,
      onboardingStatus,
      sessionStatus,
      isCompletionCelebrationActive,
      requestedPath: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });
    syncBrowserUrl(targetRoute);
  }, [bootStatus, onboardingStatus, sessionStatus, isCompletionCelebrationActive]);

  // Keep country context in sync with draft changes
  useEffect(() => {
    if (state.countryCode) {
      setCountryCode(state.countryCode);
    }
  }, [state.countryCode, setCountryCode]);

  const updateDraftState = (partial: Partial<OnboardingState>) => {
    setState((prev) => {
      const next = { ...prev, ...partial };
      onboardingRepository.save(next);
      return next;
    });
  };

  const completeOnboarding = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    const setupService = new CompleteInitialSetup(businessRepo, userRepo, pinVault);
    const result = await setupService.execute({
      business: {
        name: state.business.name,
        countryCode: state.countryCode,
        fiscalId: state.business.fiscalId,
        phone: state.business.phone,
        phonePrefix: state.business.phonePrefix,
        address: state.business.address,
      },
      settings: {
        primaryCurrency: state.regionalSettings.primaryCurrencyCode as import('../types/country').CurrencyCode,
        secondaryCurrency: (state.regionalSettings.secondaryCurrencyCode as import('../types/country').CurrencyCode) || null,
        secondaryCurrencyEnabled: state.regionalSettings.enableSecondaryUSD,
        exchangeRateProvider: state.regionalSettings.exchangeRateProvider,
      },
      owner: {
        firstName: state.owner.firstName,
        lastName: state.owner.lastName,
        email: state.owner.email,
      },
      pin,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    setOnboardingStatus('completed');
    setSessionStatus('locked');
    setIsCompletionCelebrationActive(true);

    const updated: OnboardingState = {
      ...state,
      onboardingStatus: 'completed',
      sessionStatus: 'locked',
      currentStep: 1,
    };
    setState(updated);
    onboardingRepository.save(updated);

    return { success: true };
  };

  const acknowledgeCompletion = () => {
    setIsCompletionCelebrationActive(false);
    lockSession();
  };

  const unlockWithPin = async (pin: string) => {
    const verifyService = new VerifyPin(userRepo, pinVault);
    const result = await verifyService.execute(pin);

    if (result.isValid) {
      // Save ephemeral session to SessionRepository (sessionStorage in browser, process memory in Tauri)
      await sessionRepo.saveSession({
        status: 'unlocked',
        unlockedUserId: result.userId || 'primary-user',
        unlockedAt: new Date().toISOString(),
      });

      setSessionStatus('unlocked');
      const updated: OnboardingState = {
        ...state,
        sessionStatus: 'unlocked',
      };
      setState(updated);
      onboardingRepository.save(updated);
    }

    return result;
  };

  const lockSession = () => {
    sessionRepo.clearSession().catch(() => {});
    setSessionStatus('locked');
    const updated: OnboardingState = {
      ...state,
      sessionStatus: 'locked',
    };
    setState(updated);
    onboardingRepository.save(updated);
  };

  const resetOnboarding = () => {
    sessionRepo.clearSession().catch(() => {});
    businessRepo.resetAll().catch(() => {});
    userRepo.resetAll().catch(() => {});
    pinVault.resetVault().catch(() => {});
    const fresh = onboardingRepository.reset();
    setState(fresh);
    setOnboardingStatus('incomplete');
    setSessionStatus('locked');
    setIsCompletionCelebrationActive(false);
  };

  const startRegistration = () => {
    setIsCompletionCelebrationActive(false);
    setOnboardingStatus('incomplete');
    setSessionStatus('locked');
    updateDraftState({ onboardingStatus: 'incomplete', sessionStatus: 'locked', currentStep: 1 });
  };

  const goToLogin = () => {
    setIsCompletionCelebrationActive(false);
    setOnboardingStatus('completed');
    setSessionStatus('locked');
    updateDraftState({ onboardingStatus: 'completed', sessionStatus: 'locked' });
  };

  const switchLocalAccount = () => {
    sessionRepo.clearSession().catch(() => {});
    setSessionStatus('locked');
    const updated: OnboardingState = {
      ...state,
      sessionStatus: 'locked',
    };
    setState(updated);
    onboardingRepository.save(updated);
  };

  const activeBusinessName = state.business.name || 'Mi Negocio';
  const activeOwnerName = state.owner.firstName
    ? `${state.owner.firstName} ${state.owner.lastName || ''}`.trim()
    : 'Usuario';
  const activeCountryCode = state.countryCode || 'CL';

  return (
    <AuthContext.Provider
      value={{
        isHydrated: bootStatus === 'READY',
        bootStatus,
        bootError,
        retryBoot: runBoot,
        onboardingStatus,
        sessionStatus,
        isCompletionCelebrationActive,
        state,
        updateDraftState,
        completeOnboarding,
        acknowledgeCompletion,
        unlockWithPin,
        lockSession,
        resetOnboarding,
        startRegistration,
        goToLogin,
        switchLocalAccount,
        activeBusinessName,
        activeOwnerName,
        activeCountryCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
