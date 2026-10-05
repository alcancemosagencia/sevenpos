import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { OnboardingState, OnboardingStatus, SessionStatus } from '../types/onboarding';
import { SupportedCountryCode } from '../types/country';
import { COUNTRY_PROFILES } from '../config/countries';
import { useCountry } from './CountryContext';
import { BootApplication, BootStatus } from '../application/boot/BootApplication';
import { CompleteInitialSetup } from '../application/onboarding/CompleteInitialSetup';
import { VerifyPin } from '../application/auth/VerifyPin';
import { databaseManager } from '../infrastructure/database/DatabaseManager';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { pinVaultFactory } from '../infrastructure/security/PinVaultFactory';
import { onboardingRepository } from '../services/onboardingRepository';
import { resolveEntryRoute, syncBrowserUrl } from '../application/routing/RouteResolver';
import { CloudAuthService, CloudBusinessMembership, CloudUser, SignUpParams } from '../domain/auth/CloudAuthService';
import { DeviceEnrollment, DeviceType } from '../domain/auth/DeviceEnrollment';
import { CloudBusinessLink } from '../domain/auth/CloudBusinessLink';
import { cloudAuthServiceFactory } from '../infrastructure/cloud/CloudAuthServiceFactory';
import { DeviceEnrollmentStorage } from '../infrastructure/auth/DeviceEnrollmentStorage';
import { CloudBusinessLinkStorage } from '../infrastructure/auth/CloudBusinessLinkStorage';
import { logAuditEventSafely } from '../application/audit/auditEventHelper';
import { clearRegistrationDraft, completeRegistration, readRegistrationDraft, registrationDraft, restoreRegistrationFields, saveRegistrationDraft } from '../application/auth/RegistrationDraft';
import { authMessage } from '../application/auth/authMessages';

export type AuthStateMachineState =
  | 'BOOTING'
  | 'ACCOUNT_REQUIRED'
  | 'REGISTER_REQUIRED'
  | 'EMAIL_VERIFICATION_REQUIRED'
  | 'BUSINESS_SETUP_REQUIRED'
  | 'EXISTING_LOCAL_BUSINESS_LINK_REQUIRED'
  | 'DEVICE_ENROLLMENT_REQUIRED'
  | 'PIN_SETUP_REQUIRED'
  | 'DEVICE_LOCKED'
  | 'DEVICE_UNLOCKED'
  | 'CLOUD_CONFIGURATION_ERROR'
  | 'OFFLINE_NEW_DEVICE';

export interface AuthContextType {
  // Lifecycle & State Machine
  isHydrated: boolean;
  bootStatus: BootStatus;
  bootError?: string;
  retryBoot: () => Promise<void>;
  authMachineState: AuthStateMachineState;
  onboardingStatus: OnboardingStatus;
  sessionStatus: SessionStatus;
  isCompletionCelebrationActive: boolean;

  // Cloud Identity & Device Enrollment
  cloudUser: CloudUser | null;
  cloudMembership: CloudBusinessMembership | null;
  deviceEnrollment: DeviceEnrollment | null;
  cloudBusinessLink: CloudBusinessLink | null;
  isCloudLinked: boolean;
  pendingEmailForVerification: string;

  // Local Domain State
  state: OnboardingState;
  updateDraftState: (partial: Partial<OnboardingState>) => void;
  activeBusinessName: string;
  activeOwnerName: string;
  activeCountryCode: SupportedCountryCode;
  businessId: string | null;

  // Cloud Actions
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  reauthenticateOwnerForBilling: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (params: SignUpParams & { businessName: string; countryCode: string }) => Promise<{ success: boolean; requiresEmailVerification?: boolean; error?: string }>;
  setupCloudBusiness: (params: { businessName: string; countryCode: string }) => Promise<{ success: boolean; error?: string }>;
  checkEmailVerified: () => Promise<boolean>;
  verifyEmailOtp: (otp: string) => Promise<{ success: boolean; error?: string }>;
  updatePendingVerificationEmail: (newEmail: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationEmail: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  enrollDevice: (params: { deviceName: string; platform: string; deviceType: DeviceType }) => Promise<{ success: boolean; error?: string }>;
  setupNewDevicePin: (pin: string) => Promise<{ success: boolean; error?: string }>;

  // PC Existing Business Link Actions
  isLinkingModalOpen: boolean;
  openLinkingModal: () => void;
  closeLinkingModal: () => void;
  linkExistingLocalBusiness: () => Promise<{ success: boolean; error?: string }>;
  linkExistingLocalBusinessWithNewAccount: (params: { firstName: string; lastName: string; email: string; password: string }) => Promise<{ success: boolean; requiresEmailVerification?: boolean; error?: string }>;
  linkExistingLocalBusinessWithExistingAccount: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;

  // Local PIN & Session
  completeOnboarding: (pin: string) => Promise<{ success: boolean; error?: string }>;
  acknowledgeCompletion: () => void;
  unlockWithPin: (pin: string) => Promise<{ isValid: boolean; error?: string; isLockedOut?: boolean }>;
  lockSession: () => void;
  resetOnboarding: () => void;
  startRegistration: () => void;
  goToLogin: () => void;
  goToAccountLogin: () => void;
  goToRegister: () => void;
  switchLocalAccount: () => void;
  signOutCloudAccount: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode; cloudServiceOverride?: CloudAuthService }> = ({
  children,
  cloudServiceOverride,
}) => {
  const [bootStatus, setBootStatus] = useState<BootStatus>('INITIALIZING');
  const [bootError, setBootError] = useState<string | undefined>(undefined);
  const [authMachineState, setAuthMachineState] = useState<AuthStateMachineState>('BOOTING');
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>('incomplete');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('locked');
  const [isCompletionCelebrationActive, setIsCompletionCelebrationActive] = useState<boolean>(false);
  const [state, setState] = useState<OnboardingState>(() => restoreRegistrationFields(onboardingRepository.load(), readRegistrationDraft()));
  const { setCountryCode } = useCountry();

  // Cloud state
  const [cloudUser, setCloudUser] = useState<CloudUser | null>(null);
  const [cloudMembership, setCloudMembership] = useState<CloudBusinessMembership | null>(null);
  const [deviceEnrollment, setDeviceEnrollment] = useState<DeviceEnrollment | null>(() =>
    DeviceEnrollmentStorage.getEnrollment()
  );
  const [cloudBusinessLink, setCloudBusinessLink] = useState<CloudBusinessLink | null>(() =>
    CloudBusinessLinkStorage.getLink()
  );
  const [pendingRegistration, setPendingRegistration] = useState(readRegistrationDraft);
  const [pendingEmailForVerification, setPendingEmailForVerification] = useState<string>(() => readRegistrationDraft()?.email ?? '');
  const [resolvedBusinessId, setResolvedBusinessId] = useState<string | null>(() => {
    const enc = DeviceEnrollmentStorage.getEnrollment();
    if (enc?.localBusinessId) return enc.localBusinessId;
    const link = CloudBusinessLinkStorage.getLink();
    if (link?.localBusinessId) return link.localBusinessId;
    return null;
  });
  const [isLinkingModalOpen, setIsLinkingModalOpen] = useState(false);

  const businessRepo = repositoryFactory.getBusinessRepository();
  const userRepo = repositoryFactory.getUserRepository();
  const pinVault = pinVaultFactory.getPinVault();
  const sessionRepo = repositoryFactory.getSessionRepository();

  const getCloudService = useCallback((): CloudAuthService => {
    if (cloudServiceOverride) return cloudServiceOverride;
    return cloudAuthServiceFactory.getService();
  }, [cloudServiceOverride]);

  const restoreRegistration = useCallback(async (): Promise<boolean> => {
    const draft = readRegistrationDraft();
    if (!draft) return false;
    setPendingRegistration(draft); setPendingEmailForVerification(draft.email);
    setState(previous => restoreRegistrationFields(previous, draft));
    try {
      const service = getCloudService(); const user = await service.getUser();
      if (user?.emailConfirmed && user.email.trim().toLowerCase() === draft.email) {
        setCloudUser(user);
        const membership = await completeRegistration(service, user, draft);
        if (membership) { setCloudMembership(membership); setAuthMachineState('DEVICE_ENROLLMENT_REQUIRED'); return true; }
      }
    } catch { /* Keep the draft and retry after confirmation; never discard on network failure. */ }
    setAuthMachineState('EMAIL_VERIFICATION_REQUIRED'); return true;
  }, [getCloudService]);

  // Non-blocking background hydration of cloud session if available
  const hydrateCloudSessionSilently = useCallback(async () => {
    try {
      const cloudService = getCloudService();
      const user = await cloudService.getUser();
      if (user && user.emailConfirmed) {
        setCloudUser(user);
        const memberships = await cloudService.getMemberships();
        const activeMembership =
          memberships.find((m) => m.role === 'OWNER' && m.status === 'ACTIVE') ||
          memberships.find((m) => m.status === 'ACTIVE');
        if (activeMembership) {
          setCloudMembership(activeMembership);
          if (activeMembership.businessId) {
            setResolvedBusinessId((prev) => (prev && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(prev)) ? prev : activeMembership.businessId);
          }
          if (activeMembership.countryCode && COUNTRY_PROFILES[activeMembership.countryCode as SupportedCountryCode]) {
            const cc = activeMembership.countryCode as SupportedCountryCode;
            setCountryCode(cc);
            const prof = COUNTRY_PROFILES[cc];
            setState((prev) => ({
              ...prev,
              countryCode: cc,
              business: {
                ...prev.business,
                name: activeMembership.businessName || prev.business.name,
                phonePrefix: prof.phonePrefix,
              },
              regionalSettings: {
                ...prev.regionalSettings,
                primaryCurrencyCode: prof.primaryCurrency.code,
                secondaryCurrencyCode: prof.secondaryCurrency?.code,
                enableSecondaryUSD: cc === 'VE',
              },
            }));
          }
        }
      }
    } catch {
      // Non-blocking: network offline or token expired
    }
  }, [getCloudService, setCountryCode]);

  // Main Boot Process
  const runBoot = useCallback(async () => {
    setBootStatus('INITIALIZING');
    setBootError(undefined);
    setAuthMachineState('BOOTING');

    try {
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

      // Check local storage descriptors
      const localEnrollment = DeviceEnrollmentStorage.getEnrollment();
      const localLink = CloudBusinessLinkStorage.getLink();
      setDeviceEnrollment(localEnrollment);
      setCloudBusinessLink(localLink);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const candidateBusinessId =
        (localEnrollment?.cloudBusinessId && uuidRegex.test(localEnrollment.cloudBusinessId) ? localEnrollment.cloudBusinessId : null) ||
        (localLink?.cloudBusinessId && uuidRegex.test(localLink.cloudBusinessId) ? localLink.cloudBusinessId : null) ||
        (result.business?.id && uuidRegex.test(result.business.id) ? result.business.id : null) ||
        result.business?.id ||
        localEnrollment?.localBusinessId ||
        localLink?.localBusinessId ||
        null;
      setResolvedBusinessId(candidateBusinessId);

      if (localEnrollment || localLink) {
        hydrateCloudSessionSilently();
      }

      const initialPath = typeof window !== 'undefined'
        ? window.location.pathname.split('?')[0].replace(/\/+$/, '') || '/'
        : '';

      // State Machine Resolution:
      if (!localEnrollment && !(result.onboardingStatus === 'completed' && result.business) && await restoreRegistration()) {
        // Registration refresh resumes the non-secret draft, never enrolled-device unlock.
      } else if (initialPath === '/register' && result.sessionStatus !== 'unlocked') {
        setAuthMachineState('REGISTER_REQUIRED');
      } else if (localEnrollment) {
        // Enrolled device: check local session status
        if (result.sessionStatus === 'unlocked') {
          setAuthMachineState('DEVICE_UNLOCKED');
        } else {
          const owner = await userRepo.getOwnerUser();
          setAuthMachineState(owner && await pinVault.hasPinCredential(owner.id) ? 'DEVICE_LOCKED' : 'PIN_SETUP_REQUIRED');
        }
      } else if (result.onboardingStatus === 'completed' && result.business) {
        // Existing local business on PC: PIN login or unlocked
        if (result.sessionStatus === 'unlocked') {
          setAuthMachineState('DEVICE_UNLOCKED');
        } else {
          setAuthMachineState('DEVICE_LOCKED');
        }
      } else {
        // Fresh terminal / new device without local onboarding
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setAuthMachineState('OFFLINE_NEW_DEVICE');
        } else {
          setAuthMachineState('ACCOUNT_REQUIRED');
        }
      }
    } catch (err: unknown) {
      console.error('Error during boot resolution:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado durante arranque.';
      if (msg === 'CLOUD_AUTH_NOT_CONFIGURED') {
        setAuthMachineState('CLOUD_CONFIGURATION_ERROR');
      } else {
        setBootStatus('BOOT_FAILURE');
        setBootError(msg);
      }
    }
  }, [businessRepo, userRepo, pinVault, sessionRepo, setCountryCode, hydrateCloudSessionSilently, restoreRegistration]);

  useEffect(() => {
    let isMounted = true;
    const executeBoot = async () => {
      try {
        const bootService = new BootApplication(databaseManager, businessRepo, userRepo, pinVault, sessionRepo);
        const result = await bootService.execute();

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

        const localEnrollment = DeviceEnrollmentStorage.getEnrollment();
        const localLink = CloudBusinessLinkStorage.getLink();
        setDeviceEnrollment(localEnrollment);
        setCloudBusinessLink(localLink);
        setResolvedBusinessId(result.business?.id || localEnrollment?.localBusinessId || localLink?.localBusinessId || null);

        if (localEnrollment || localLink) {
          hydrateCloudSessionSilently();
        }

        const initialPath = typeof window !== 'undefined'
          ? window.location.pathname.split('?')[0].replace(/\/+$/, '') || '/'
          : '';

        if (!localEnrollment && !(result.onboardingStatus === 'completed' && result.business) && await restoreRegistration()) {
          // The draft is deliberately subordinate to an existing local terminal.
        } else if (initialPath === '/register' && result.sessionStatus !== 'unlocked') {
          setAuthMachineState('REGISTER_REQUIRED');
        } else if (localEnrollment) {
          if (result.sessionStatus === 'unlocked') {
            setAuthMachineState('DEVICE_UNLOCKED');
          } else {
            const owner = await userRepo.getOwnerUser();
            if (!isMounted) return;
            setAuthMachineState(owner && await pinVault.hasPinCredential(owner.id) ? 'DEVICE_LOCKED' : 'PIN_SETUP_REQUIRED');
          }
        } else if (result.onboardingStatus === 'completed' && result.business) {
          if (result.sessionStatus === 'unlocked') {
            setAuthMachineState('DEVICE_UNLOCKED');
          } else {
            setAuthMachineState('DEVICE_LOCKED');
          }
        } else {
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setAuthMachineState('OFFLINE_NEW_DEVICE');
          } else {
            setAuthMachineState('ACCOUNT_REQUIRED');
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Error inesperado durante arranque.';
        if (msg === 'CLOUD_AUTH_NOT_CONFIGURED') {
          setAuthMachineState('CLOUD_CONFIGURATION_ERROR');
        } else {
          setBootStatus('BOOT_FAILURE');
          setBootError(msg);
        }
      }
    };

    executeBoot();

    return () => {
      isMounted = false;
    };
  }, [businessRepo, userRepo, pinVault, sessionRepo, setCountryCode, hydrateCloudSessionSilently, restoreRegistration]);

  // Synchronize browser canonical URL anytime auth lifecycle state changes
  useEffect(() => {
    const isHydrated = bootStatus === 'READY';
    const targetRoute = resolveEntryRoute({
      isHydrated,
      authMachineState,
      onboardingStatus,
      sessionStatus,
      isCompletionCelebrationActive,
      requestedPath: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });
    syncBrowserUrl(targetRoute);
  }, [bootStatus, authMachineState, onboardingStatus, sessionStatus, isCompletionCelebrationActive]);

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

  // Sign In with Email & Password
  const signInWithEmail = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cloudService = getCloudService();
      const user = await cloudService.signInWithPassword(email, pass);
      setCloudUser(user);

      if (!user.emailConfirmed) {
        setPendingEmailForVerification(user.email);
        setAuthMachineState('EMAIL_VERIFICATION_REQUIRED');
        return { success: false, error: 'Por favor confirma tu correo electrónico antes de continuar.' };
      }

      // Query memberships
      const memberships = await cloudService.getMemberships();
      const ownerMembership = memberships.find((m) => m.role === 'OWNER');

      if (!ownerMembership) {
        // Authenticated user with confirmed email, but no business created yet in Cloud DB
        const localBiz = await businessRepo.getPrimaryBusiness();
        const hasLocalBusiness = (localBiz != null && localBiz.name.trim().length > 0) || (state.business.name.trim().length > 0);
        const localLink = CloudBusinessLinkStorage.getLink();

        if (hasLocalBusiness && !localLink) {
          setAuthMachineState('EXISTING_LOCAL_BUSINESS_LINK_REQUIRED');
        } else {
          setAuthMachineState('BUSINESS_SETUP_REQUIRED');
        }
        return { success: true };
      }

      if (ownerMembership.status === 'INACTIVE') {
        return { success: false, error: 'Tu membresía de propietario se encuentra inactiva. Contacta soporte.' };
      }

      if (ownerMembership.status === 'REVOKED') {
        return { success: false, error: 'Tu acceso como propietario ha sido revocado.' };
      }

      setCloudMembership(ownerMembership);
      if (ownerMembership.businessId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ownerMembership.businessId)) {
        setResolvedBusinessId((prev) => (prev && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(prev)) ? prev : ownerMembership.businessId);
      }

      // Check if this specific physical device is already enrolled
      const currentEnrollment = DeviceEnrollmentStorage.getEnrollment();
      if (currentEnrollment && currentEnrollment.cloudBusinessId === ownerMembership.businessId) {
        // Device is already enrolled
        setAuthMachineState('DEVICE_LOCKED');
      } else {
        setAuthMachineState('DEVICE_ENROLLMENT_REQUIRED');
      }

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: authMessage(err, 'Correo o contraseña incorrectos.') };
    }
  };

  // Re-authenticate Cloud Owner specifically for Billing actions (does NOT reset local terminal session)
  const reauthenticateOwnerForBilling = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const cloudService = getCloudService();
      const user = await cloudService.signInWithPassword(email, pass);

      if (!user.emailConfirmed) {
        return { success: false, error: 'Por favor confirma tu correo electrónico antes de continuar.' };
      }

      // Query memberships to ensure user is active OWNER
      const memberships = await cloudService.getMemberships();
      const ownerMembership = memberships.find((m) => m.role === 'OWNER');

      if (!ownerMembership) {
        return {
          success: false,
          error: 'Esta acción solo puede realizarla el propietario del negocio.',
        };
      }

      if (ownerMembership.status === 'INACTIVE') {
        return {
          success: false,
          error: 'Tu membresía de propietario se encuentra inactiva. Contacta soporte.',
        };
      }

      if (ownerMembership.status === 'REVOKED') {
        return {
          success: false,
          error: 'Tu acceso como propietario ha sido revocado.',
        };
      }

      // Check business match if local business is enrolled/linked
      const currentEnrollment = DeviceEnrollmentStorage.getEnrollment();
      const currentLink = CloudBusinessLinkStorage.getLink();
      const expectedCloudBizId = currentEnrollment?.cloudBusinessId || currentLink?.cloudBusinessId;
      if (expectedCloudBizId && ownerMembership.businessId !== expectedCloudBizId) {
        return {
          success: false,
          error: 'La cuenta ingresada pertenece a otro negocio.',
        };
      }

      // Populate cloud identity state without altering local terminal authMachineState
      setCloudUser(user);
      setCloudMembership(ownerMembership);

      return { success: true };
    } catch (err: unknown) {
      console.error('Error during reauthenticateOwnerForBilling:', err);
      return { success: false, error: err instanceof Error ? err.message : 'No pudimos verificar la cuenta del propietario.' };
    }
  };

  // Sign Up with Email & Password
  const signUpWithEmail = async (
    params: SignUpParams & { businessName: string; countryCode: string }
  ): Promise<{ success: boolean; requiresEmailVerification?: boolean; error?: string }> => {
    try {
      const cloudService = getCloudService();

      // Store pending business draft for post-confirmation bootstrap
      const chosenCountry = (params.countryCode as SupportedCountryCode) || 'CL';
      const draft = registrationDraft(params);
      if (!draft) return { success: false, error: 'Revisa los datos de registro antes de continuar.' };

      const { user, requiresEmailVerification } = await cloudService.signUp({
        email: params.email,
        password: params.password,
        firstName: params.firstName,
        lastName: params.lastName,
        businessName: draft.businessName,
        countryCode: draft.countryCode,
      });

      saveRegistrationDraft(draft); setPendingRegistration(draft);
      if (state.onboardingStatus !== 'completed') setCountryCode(chosenCountry);
      setState(previous => restoreRegistrationFields(previous, draft));

      setCloudUser(user);
      setPendingEmailForVerification(params.email);

      if (requiresEmailVerification || !user?.emailConfirmed) {
        setAuthMachineState('EMAIL_VERIFICATION_REQUIRED');
        return { success: true, requiresEmailVerification: true };
      }

      // If email is pre-confirmed (e.g. dev mode), bootstrap business immediately
      const bootstrapRes = await cloudService.bootstrapOwnerBusiness({
        firstName: params.firstName,
        lastName: params.lastName,
        businessName: params.businessName,
        countryCode: chosenCountry,
      });

      setCloudMembership({
        businessId: bootstrapRes.businessId,
        businessName: bootstrapRes.businessName,
        countryCode: bootstrapRes.countryCode,
        role: bootstrapRes.role,
        status: 'ACTIVE',
      });

      setAuthMachineState('DEVICE_ENROLLMENT_REQUIRED');
      return { success: true, requiresEmailVerification: false };
    } catch (err: unknown) {
      return { success: false, error: authMessage(err, 'No pudimos iniciar el registro. Inténtalo nuevamente.') };
    }
  };

  // Setup Cloud Business (for confirmed authenticated users without business)
  const setupCloudBusiness = async (params: {
    businessName: string;
    countryCode: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const cloudService = getCloudService();
      const user = await cloudService.getUser();
      if (!user) {
        setAuthMachineState('ACCOUNT_REQUIRED');
        return { success: false, error: 'Sesión no válida. Inicia sesión nuevamente.' };
      }

      const chosenCountry = (params.countryCode as SupportedCountryCode) || 'CL';
      const prof = COUNTRY_PROFILES[chosenCountry] || COUNTRY_PROFILES.CL;
      setCountryCode(chosenCountry);
      setState((prev) => ({
        ...prev,
        countryCode: chosenCountry,
        business: {
          ...prev.business,
          name: params.businessName.trim(),
          phonePrefix: prof.phonePrefix,
        },
        regionalSettings: {
          ...prev.regionalSettings,
          primaryCurrencyCode: prof.primaryCurrency.code,
          secondaryCurrencyCode: prof.secondaryCurrency?.code,
          enableSecondaryUSD: chosenCountry === 'VE',
        },
      }));

      const bootstrapRes = await cloudService.bootstrapOwnerBusiness({
        firstName: pendingRegistration?.firstName || state.owner.firstName || 'Propietario',
        lastName: pendingRegistration?.lastName || state.owner.lastName || '',
        businessName: params.businessName.trim(),
        countryCode: chosenCountry,
      });

      const membership: CloudBusinessMembership = {
        businessId: bootstrapRes.businessId,
        businessName: bootstrapRes.businessName,
        countryCode: bootstrapRes.countryCode,
        role: bootstrapRes.role,
        status: 'ACTIVE',
      };

      setCloudMembership(membership);
      setAuthMachineState('DEVICE_ENROLLMENT_REQUIRED');
      return { success: true };
    } catch (err: unknown) {
      console.error('Error setting up cloud business:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al configurar negocio cloud.' };
    }
  };

  const finishVerifiedUser = async (user: CloudUser) => {
    const membership = await completeRegistration(getCloudService(), user, pendingRegistration ?? readRegistrationDraft());
    setCloudUser(user);
    if (!membership) { setAuthMachineState('BUSINESS_SETUP_REQUIRED'); return; }
    setCloudMembership(membership);
    const enrollment = DeviceEnrollmentStorage.getEnrollment();
    if (enrollment?.cloudBusinessId === membership.businessId && enrollment.userId === user.id) {
      const owner = await userRepo.getOwnerUser();
      const hasPin = owner && await pinVault.hasPinCredential(owner.id);
      setAuthMachineState(hasPin ? sessionStatus === 'unlocked' ? 'DEVICE_UNLOCKED' : 'DEVICE_LOCKED' : 'PIN_SETUP_REQUIRED');
    } else setAuthMachineState('DEVICE_ENROLLMENT_REQUIRED');
  };

  // A retry after verification never consumes the single-use OTP again.
  const checkEmailVerified = async (): Promise<boolean> => {
    try {
      const user = await getCloudService().getUser();
      if (!user?.emailConfirmed) return false;
      if (pendingEmailForVerification && user.email.trim().toLowerCase() !== pendingEmailForVerification.trim().toLowerCase()) return false;
      await finishVerifiedUser(user); return true;
    } catch { return false; }
  };

  // Verify Email OTP
  const verifyEmailOtp = async (token: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cloudService = getCloudService();
      const current = await cloudService.getUser();
      const user = current?.emailConfirmed && current.email.trim().toLowerCase() === pendingEmailForVerification.trim().toLowerCase()
        ? current : await cloudService.verifyEmailOtp(pendingEmailForVerification, token, 'signup');
      await finishVerifiedUser(user);
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: authMessage(err, 'No pudimos completar la verificación. Intenta continuar nuevamente; tus datos se conservan.'),
      };
    }
  };

  // Update pending verification email (e.g. typo correction)
  const updatePendingVerificationEmail = async (newEmail: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const trimmed = newEmail.trim();
      setPendingEmailForVerification(trimmed);
      const cloudService = getCloudService();
      await cloudService.resendVerificationEmail(trimmed);
      return { success: true };
    } catch (err: unknown) {
      console.error('Error updating pending verification email:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error al reenviar el código al nuevo correo.',
      };
    }
  };

  const resendVerificationEmail = async (): Promise<void> => {

    const cloudService = getCloudService();
    if (pendingEmailForVerification) {
      const current = await cloudService.getUser();
      if (current?.emailConfirmed && current.email.trim().toLowerCase() === pendingEmailForVerification.trim().toLowerCase()) {
        await finishVerifiedUser(current);
        return;
      }
      await cloudService.resendVerificationEmail(pendingEmailForVerification);
    }
  };

  const sendPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cloudService = getCloudService();
      await cloudService.sendPasswordReset(email);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: authMessage(err, 'No pudimos solicitar el enlace. Inténtalo nuevamente.') };
    }
  };

  // Enroll Device
  const enrollDevice = async (params: {
    deviceName: string;
    platform: string;
    deviceType: DeviceType;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const cloudService = getCloudService();
      const businessId = cloudMembership?.businessId || cloudBusinessLink?.cloudBusinessId;
      if (!businessId) {
        return { success: false, error: 'No se encontró negocio asociado para enrolar el terminal.' };
      }

      const cloudDevice = await cloudService.enrollDevice({
        businessId,
        deviceName: params.deviceName,
        platform: params.platform,
        deviceType: params.deviceType,
      });

      const user = await cloudService.getUser();
      const enrollment: DeviceEnrollment = {
        deviceId: cloudDevice.id,
        cloudBusinessId: cloudDevice.businessId,
        localBusinessId: state.business.fiscalId || undefined,
        userId: cloudDevice.userId,
        accountEmail: user?.email || '',
        businessName: cloudMembership?.businessName || state.business.name || 'Mi Negocio',
        displayName: cloudDevice.deviceName,
        platform: cloudDevice.platform,
        deviceType: cloudDevice.deviceType,
        enrolledAt: cloudDevice.createdAt,
      };

      DeviceEnrollmentStorage.saveEnrollment(enrollment);
      setDeviceEnrollment(enrollment);

      // Persist CloudBusinessLink for the enrolled terminal so banner and link status are immediately synchronized
      const link: CloudBusinessLink = {
        localBusinessId: enrollment.localBusinessId || cloudDevice.businessId,
        cloudBusinessId: cloudDevice.businessId,
        cloudUserId: cloudDevice.userId,
        linkedAt: cloudDevice.createdAt,
      };
      CloudBusinessLinkStorage.saveLink(link);
      setCloudBusinessLink(link);

      // Audit device enrollment
      logAuditEventSafely({
        businessId: cloudDevice.businessId,
        eventCategory: 'DEVICE',
        eventType: 'device.enrolled',
        action: 'DEVICE_ENROLLED',
        severity: 'INFO',
        actorUserId: cloudDevice.userId,
        actorNameSnapshot: activeOwnerName,
        deviceId: cloudDevice.id,
        deviceNameSnapshot: cloudDevice.deviceName,
        entityType: 'DEVICE',
        entityId: cloudDevice.id,
        entityLabel: cloudDevice.deviceName,
        summary: `Terminal enrolado: ${cloudDevice.deviceName} (${cloudDevice.platform})`,
        metadata: {
          platform: cloudDevice.platform,
          deviceType: cloudDevice.deviceType,
        },
      });

      // If this PC already had local PIN and owner, transition directly to unlocked
      const owner = await userRepo.getOwnerUser();
      const hasPin = owner && await pinVault.hasPinCredential(owner.id);
      setAuthMachineState(hasPin ? sessionStatus === 'unlocked' ? 'DEVICE_UNLOCKED' : 'DEVICE_LOCKED' : 'PIN_SETUP_REQUIRED');

      return { success: true };
    } catch (err: unknown) {
      console.error('Error enrolling device:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al enrolar dispositivo.' };
    }
  };

  // Setup New Device PIN
  const setupNewDevicePin = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      let owner = await userRepo.getOwnerUser();
      if (!owner) {
        const business = await businessRepo.getPrimaryBusiness();
        let businessId = business?.id;
        if (!businessId) {
          businessId = 'biz-local-generated';
          const effectiveCountry = (cloudMembership?.countryCode as SupportedCountryCode) ||
            (state.countryCode as SupportedCountryCode) || 'CL';
          const prof = COUNTRY_PROFILES[effectiveCountry] || COUNTRY_PROFILES.CL;
          await businessRepo.saveBusinessWithSettings(
            {
              id: businessId,
              name: deviceEnrollment?.businessName || cloudMembership?.businessName || state.business.name || 'Mi Negocio',
              countryCode: effectiveCountry,
              phonePrefix: prof.phonePrefix,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              businessId,
              primaryCurrency: prof.primaryCurrency.code as import('../types/country').CurrencyCode,
              secondaryCurrency: (prof.secondaryCurrency?.code as import('../types/country').CurrencyCode) || null,
              secondaryCurrencyEnabled: effectiveCountry === 'VE',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          );
        }

        const newUser = {
          id: 'usr-local-owner',
          businessId,
          role: 'OWNER' as const,
          firstName: state.owner.firstName || 'Propietario',
          lastName: state.owner.lastName || '',
          email: deviceEnrollment?.accountEmail || cloudUser?.email || '',
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await userRepo.saveUser(newUser);
        owner = newUser;
      }

      // Save PIN in Vault
      await pinVault.savePinCredential(owner.id, pin);

      // Mark session unlocked
      await sessionRepo.saveSession({
        status: 'unlocked',
        unlockedUserId: owner.id,
        unlockedAt: new Date().toISOString(),
      });

      setOnboardingStatus('completed');
      setSessionStatus('unlocked');
      setAuthMachineState('DEVICE_UNLOCKED');
      clearRegistrationDraft(); setPendingRegistration(null); setPendingEmailForVerification('');
      return { success: true };
    } catch (err: unknown) {
      console.error('Error setting up PIN:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al configurar PIN.' };
    }
  };

  // Link Existing Local Business (Official Bootstrap on already authenticated PC)
  const linkExistingLocalBusiness = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const cloudService = getCloudService();
      const user = await cloudService.getUser();
      if (!user) {
        setAuthMachineState('ACCOUNT_REQUIRED');
        return { success: false, error: 'Sesión no válida. Inicia sesión nuevamente.' };
      }

      const localBiz = await businessRepo.getPrimaryBusiness();
      const localName = localBiz?.name || state.business.name || 'Mi Negocio';
      const localCountry = localBiz?.countryCode || state.countryCode || 'CL';
      const localOwner = await userRepo.getOwnerUser();
      const firstName = localOwner?.firstName || state.owner.firstName || 'Propietario';
      const lastName = localOwner?.lastName || state.owner.lastName || '';

      const bootstrapRes = await cloudService.bootstrapOwnerBusiness({
        firstName,
        lastName,
        businessName: localName,
        countryCode: localCountry,
      });

      // Save local -> cloud link descriptor
      const link: CloudBusinessLink = {
        localBusinessId: localBiz?.id || state.business.fiscalId || 'local-primary',
        cloudBusinessId: bootstrapRes.businessId,
        cloudUserId: bootstrapRes.userId,
        linkedAt: new Date().toISOString(),
      };
      CloudBusinessLinkStorage.saveLink(link);
      setCloudBusinessLink(link);

      // Enroll PC
      const cloudDevice = await cloudService.enrollDevice({
        businessId: bootstrapRes.businessId,
        deviceName: 'Caja Principal (PC)',
        platform: 'Windows Desktop',
        deviceType: 'DESKTOP',
      });

      const enrollment: DeviceEnrollment = {
        deviceId: cloudDevice.id,
        cloudBusinessId: cloudDevice.businessId,
        localBusinessId: localBiz?.id || state.business.fiscalId,
        userId: cloudDevice.userId,
        accountEmail: user.email,
        businessName: localName,
        displayName: cloudDevice.deviceName,
        platform: cloudDevice.platform,
        deviceType: cloudDevice.deviceType,
        enrolledAt: cloudDevice.createdAt,
      };
      DeviceEnrollmentStorage.saveEnrollment(enrollment);
      setDeviceEnrollment(enrollment);

      setCloudMembership({
        businessId: bootstrapRes.businessId,
        businessName: bootstrapRes.businessName,
        countryCode: bootstrapRes.countryCode,
        role: bootstrapRes.role,
        status: 'ACTIVE',
      });

      // If this PC already had local PIN and owner, transition directly to unlocked or locked
      if (localOwner) {
        setSessionStatus('unlocked');
        setAuthMachineState('DEVICE_UNLOCKED');
      } else {
        setAuthMachineState('PIN_SETUP_REQUIRED');
      }

      return { success: true };
    } catch (err: unknown) {
      console.error('Error linking existing local business:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al vincular negocio local.' };
    }
  };

  // Link Existing Local Business (PC Migration)
  const linkExistingLocalBusinessWithNewAccount = async (params: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; requiresEmailVerification?: boolean; error?: string }> => {
    try {
      const cloudService = getCloudService();
      const localBiz = await businessRepo.getPrimaryBusiness();
      const localName = localBiz?.name || state.business.name || 'Mi Negocio';
      const localCountry = localBiz?.countryCode || state.countryCode || 'CL';

      const { user, requiresEmailVerification } = await cloudService.signUp({
        email: params.email,
        password: params.password,
        firstName: params.firstName,
        lastName: params.lastName,
      });

      setCloudUser(user);
      setPendingEmailForVerification(params.email);

      if (requiresEmailVerification) {
        setAuthMachineState('EMAIL_VERIFICATION_REQUIRED');
        return { success: true, requiresEmailVerification: true };
      }

      const bootstrapRes = await cloudService.bootstrapOwnerBusiness({
        firstName: params.firstName,
        lastName: params.lastName,
        businessName: localName,
        countryCode: localCountry,
      });

      // Save local -> cloud link descriptor
      const link: CloudBusinessLink = {
        localBusinessId: localBiz?.id || 'local-primary',
        cloudBusinessId: bootstrapRes.businessId,
        cloudUserId: bootstrapRes.userId,
        linkedAt: new Date().toISOString(),
      };
      CloudBusinessLinkStorage.saveLink(link);
      setCloudBusinessLink(link);

      // Enroll PC
      const cloudDevice = await cloudService.enrollDevice({
        businessId: bootstrapRes.businessId,
        deviceName: 'Caja Principal (PC)',
        platform: 'Desktop',
        deviceType: 'DESKTOP',
      });

      const enrollment: DeviceEnrollment = {
        deviceId: cloudDevice.id,
        cloudBusinessId: cloudDevice.businessId,
        localBusinessId: localBiz?.id,
        userId: cloudDevice.userId,
        accountEmail: user?.email || params.email,
        businessName: localName,
        displayName: cloudDevice.deviceName,
        platform: cloudDevice.platform,
        deviceType: cloudDevice.deviceType,
        enrolledAt: cloudDevice.createdAt,
      };
      DeviceEnrollmentStorage.saveEnrollment(enrollment);
      setDeviceEnrollment(enrollment);

      return { success: true, requiresEmailVerification: false };
    } catch (err: unknown) {
      console.error('Error linking existing business with new account:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al vincular cuenta.' };
    }
  };

  const linkExistingLocalBusinessWithExistingAccount = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const cloudService = getCloudService();
      const localBiz = await businessRepo.getPrimaryBusiness();
      const user = await cloudService.signInWithPassword(email, pass);
      setCloudUser(user);

      const memberships = await cloudService.getMemberships();
      const ownerMembership = memberships.find((m) => m.role === 'OWNER' && m.status === 'ACTIVE');

      if (!ownerMembership) {
        return { success: false, error: 'No se encontró una membresía activa de propietario en esta cuenta.' };
      }

      const link: CloudBusinessLink = {
        localBusinessId: localBiz?.id || 'local-primary',
        cloudBusinessId: ownerMembership.businessId,
        cloudUserId: user.id,
        linkedAt: new Date().toISOString(),
      };
      CloudBusinessLinkStorage.saveLink(link);
      setCloudBusinessLink(link);

      const cloudDevice = await cloudService.enrollDevice({
        businessId: ownerMembership.businessId,
        deviceName: 'Caja Principal (PC)',
        platform: 'Desktop',
        deviceType: 'DESKTOP',
      });

      const enrollment: DeviceEnrollment = {
        deviceId: cloudDevice.id,
        cloudBusinessId: cloudDevice.businessId,
        localBusinessId: localBiz?.id,
        userId: cloudDevice.userId,
        accountEmail: user.email,
        businessName: ownerMembership.businessName,
        displayName: cloudDevice.deviceName,
        platform: cloudDevice.platform,
        deviceType: cloudDevice.deviceType,
        enrolledAt: cloudDevice.createdAt,
      };
      DeviceEnrollmentStorage.saveEnrollment(enrollment);
      setDeviceEnrollment(enrollment);

      return { success: true };
    } catch (err: unknown) {
      console.error('Error linking existing business with existing account:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al vincular cuenta existente.' };
    }
  };

  // Local Initial Setup Completion
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
    setAuthMachineState('DEVICE_LOCKED');
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

    const primaryBiz = await businessRepo.getPrimaryBusiness().catch(() => null);
    const bizId = primaryBiz?.id || cloudMembership?.businessId || deviceEnrollment?.cloudBusinessId || 'local-primary';

    if (result.isValid) {
      await sessionRepo.saveSession({
        status: 'unlocked',
        unlockedUserId: result.userId || 'primary-user',
        unlockedAt: new Date().toISOString(),
      });

      setSessionStatus('unlocked');
      setAuthMachineState('DEVICE_UNLOCKED');
      const updated: OnboardingState = {
        ...state,
        sessionStatus: 'unlocked',
      };
      setState(updated);
      onboardingRepository.save(updated);

      if (deviceEnrollment || cloudBusinessLink) {
        hydrateCloudSessionSilently();
      }

      logAuditEventSafely({
        businessId: bizId,
        eventCategory: 'AUTH',
        eventType: 'auth.login.success',
        action: 'PIN_LOGIN',
        severity: 'INFO',
        actorUserId: result.userId || 'usr-local-owner',
        actorNameSnapshot: activeOwnerName,
        actorRoleSnapshot: 'OWNER',
        deviceId: deviceEnrollment?.deviceId || null,
        deviceNameSnapshot: deviceEnrollment?.displayName || null,
        entityType: 'SESSION',
        entityId: result.userId || 'usr-local-owner',
        summary: `Desbloqueo de terminal exitoso: ${activeOwnerName}`,
      });
    } else {
      const isLocked = Boolean(result.isLockedOut);
      logAuditEventSafely({
        businessId: bizId,
        eventCategory: 'AUTH',
        eventType: isLocked ? 'auth.pin.locked' : 'auth.pin.failed',
        action: isLocked ? 'PIN_LOCKOUT' : 'PIN_FAILED',
        severity: isLocked ? 'CRITICAL' : 'WARNING',
        actorUserId: result.userId || null,
        actorNameSnapshot: activeOwnerName,
        deviceId: deviceEnrollment?.deviceId || null,
        deviceNameSnapshot: deviceEnrollment?.displayName || null,
        entityType: 'AUTH',
        entityId: result.userId || 'device-pin',
        summary: isLocked
          ? 'Terminal bloqueado temporalmente por reiterados intentos fallidos de PIN'
          : 'Intento fallido de desbloqueo con PIN',
      });
    }

    return result;
  };

  const lockSession = () => {
    sessionRepo.clearSession().catch(() => {});
    setSessionStatus('locked');
    setAuthMachineState('DEVICE_LOCKED');
    const updated: OnboardingState = {
      ...state,
      sessionStatus: 'locked',
    };
    setState(updated);
    onboardingRepository.save(updated);

    businessRepo.getPrimaryBusiness().then((biz) => {
      const bizId = biz?.id || cloudMembership?.businessId || deviceEnrollment?.cloudBusinessId || 'local-primary';
      logAuditEventSafely({
        businessId: bizId,
        eventCategory: 'AUTH',
        eventType: 'auth.logout',
        action: 'SESSION_LOCKED',
        severity: 'INFO',
        actorNameSnapshot: activeOwnerName,
        deviceId: deviceEnrollment?.deviceId || null,
        deviceNameSnapshot: deviceEnrollment?.displayName || null,
        entityType: 'SESSION',
        entityId: 'current-session',
        summary: `Sesión bloqueada en terminal por ${activeOwnerName}`,
      });
    }).catch(() => {});
  };

  const resetOnboarding = () => {
    onboardingRepository.reset();
    setState(onboardingRepository.load());
    setIsCompletionCelebrationActive(false);
    setOnboardingStatus('incomplete');
    setSessionStatus('locked');
    setAuthMachineState('ACCOUNT_REQUIRED');
  };

  const startRegistration = () => {
    updateDraftState({ onboardingStatus: 'incomplete', sessionStatus: 'locked', currentStep: 1 });
  };

  const goToLogin = () => {
    setIsCompletionCelebrationActive(false);
    setSessionStatus('locked');
    setAuthMachineState('DEVICE_LOCKED');
    updateDraftState({ onboardingStatus: 'completed', sessionStatus: 'locked' });
  };

  const goToAccountLogin = () => {
    clearRegistrationDraft(); setPendingRegistration(null); setPendingEmailForVerification('');
    setAuthMachineState('ACCOUNT_REQUIRED');
  };

  const goToRegister = () => {
    clearRegistrationDraft(); setPendingRegistration(null); setPendingEmailForVerification('');
    setAuthMachineState('REGISTER_REQUIRED');
  };

  const switchLocalAccount = () => {
    clearRegistrationDraft(); setPendingRegistration(null); setPendingEmailForVerification('');
    sessionRepo.clearSession().catch(() => {});
    setSessionStatus('locked');
    setAuthMachineState('ACCOUNT_REQUIRED');
  };

  const signOutCloudAccount = async () => {
    clearRegistrationDraft(); setPendingRegistration(null); setPendingEmailForVerification('');
    try {
      const cloudService = getCloudService();
      await cloudService.signOut();
    } catch {
      // Ignore network errors on sign out
    }
    setCloudUser(null);
    setCloudMembership(null);
    setAuthMachineState('ACCOUNT_REQUIRED');
  };

  const activeBusinessName = deviceEnrollment?.businessName || state.business.name || 'Mi Negocio';
  const activeOwnerName = state.owner.firstName
    ? `${state.owner.firstName} ${state.owner.lastName || ''}`.trim()
    : 'Usuario';
  const activeCountryCode = (state.countryCode as SupportedCountryCode) || 'CL';

  return (
    <AuthContext.Provider
      value={{
        isHydrated: bootStatus === 'READY',
        bootStatus,
        bootError,
        retryBoot: runBoot,
        authMachineState,
        onboardingStatus,
        sessionStatus,
        isCompletionCelebrationActive,
        cloudUser,
        cloudMembership,
        deviceEnrollment,
        cloudBusinessLink,
        isCloudLinked: Boolean(
          cloudBusinessLink ||
            deviceEnrollment ||
            (cloudMembership && cloudMembership.businessId)
        ),
        pendingEmailForVerification,
        state,
        updateDraftState,
        activeBusinessName,
        activeOwnerName,
        activeCountryCode,
        businessId: resolvedBusinessId,
        signInWithEmail,
        reauthenticateOwnerForBilling,
        signUpWithEmail,
        setupCloudBusiness,
        checkEmailVerified,
        verifyEmailOtp,
        updatePendingVerificationEmail,
        resendVerificationEmail,
        sendPasswordReset,
        enrollDevice,
        setupNewDevicePin,
        isLinkingModalOpen,
        openLinkingModal: () => setIsLinkingModalOpen(true),
        closeLinkingModal: () => setIsLinkingModalOpen(false),
        linkExistingLocalBusiness,
        linkExistingLocalBusinessWithNewAccount,
        linkExistingLocalBusinessWithExistingAccount,
        completeOnboarding,
        acknowledgeCompletion,
        unlockWithPin,
        lockSession,
        resetOnboarding,
        startRegistration,
        goToLogin,
        goToAccountLogin,
        goToRegister,
        switchLocalAccount,
        signOutCloudAccount,
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
