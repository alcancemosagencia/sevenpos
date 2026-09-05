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
import { CloudAuthService, CloudBusinessMembership, CloudUser, SignUpParams } from '../domain/auth/CloudAuthService';
import { DeviceEnrollment, DeviceType } from '../domain/auth/DeviceEnrollment';
import { CloudBusinessLink } from '../domain/auth/CloudBusinessLink';
import { cloudAuthServiceFactory } from '../infrastructure/cloud/CloudAuthServiceFactory';
import { DeviceEnrollmentStorage } from '../infrastructure/auth/DeviceEnrollmentStorage';
import { CloudBusinessLinkStorage } from '../infrastructure/auth/CloudBusinessLinkStorage';

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

interface AuthContextType {
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

  // Cloud Actions
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (params: SignUpParams & { businessName: string; countryCode: string }) => Promise<{ success: boolean; requiresEmailVerification?: boolean; error?: string }>;
  setupCloudBusiness: (params: { businessName: string; countryCode: string }) => Promise<{ success: boolean; error?: string }>;
  checkEmailVerified: () => Promise<boolean>;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [state, setState] = useState<OnboardingState>(() => onboardingRepository.load());
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
  const [pendingEmailForVerification, setPendingEmailForVerification] = useState<string>('');
  const [pendingDraftBusinessName, setPendingDraftBusinessName] = useState<string>('');
  const [pendingDraftCountryCode, setPendingDraftCountryCode] = useState<string>('CL');
  const [pendingDraftOwnerFirstName, setPendingDraftOwnerFirstName] = useState<string>('');
  const [pendingDraftOwnerLastName, setPendingDraftOwnerLastName] = useState<string>('');
  const [isLinkingModalOpen, setIsLinkingModalOpen] = useState(false);

  const businessRepo = repositoryFactory.getBusinessRepository();
  const userRepo = repositoryFactory.getUserRepository();
  const pinVault = pinVaultFactory.getPinVault();
  const sessionRepo = repositoryFactory.getSessionRepository();

  const getCloudService = useCallback((): CloudAuthService => {
    if (cloudServiceOverride) return cloudServiceOverride;
    return cloudAuthServiceFactory.getService();
  }, [cloudServiceOverride]);

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

      // State Machine Resolution:
      if (localEnrollment) {
        // Enrolled device: check local session status
        if (result.sessionStatus === 'unlocked') {
          setAuthMachineState('DEVICE_UNLOCKED');
        } else {
          setAuthMachineState('DEVICE_LOCKED');
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
  }, [businessRepo, userRepo, pinVault, sessionRepo, setCountryCode]);

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

        if (localEnrollment) {
          if (result.sessionStatus === 'unlocked') {
            setAuthMachineState('DEVICE_UNLOCKED');
          } else {
            setAuthMachineState('DEVICE_LOCKED');
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
  }, [businessRepo, userRepo, pinVault, sessionRepo, setCountryCode]);

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
      console.error('Error during signInWithEmail:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Correo o contraseña incorrectos.' };
    }
  };

  // Sign Up with Email & Password
  const signUpWithEmail = async (
    params: SignUpParams & { businessName: string; countryCode: string }
  ): Promise<{ success: boolean; requiresEmailVerification?: boolean; error?: string }> => {
    try {
      const cloudService = getCloudService();

      // Store pending business draft for post-confirmation bootstrap
      setPendingDraftBusinessName(params.businessName.trim());
      setPendingDraftCountryCode(params.countryCode || 'CL');
      setPendingDraftOwnerFirstName(params.firstName.trim());
      setPendingDraftOwnerLastName(params.lastName ? params.lastName.trim() : '');

      const { user, requiresEmailVerification } = await cloudService.signUp({
        email: params.email,
        password: params.password,
        firstName: params.firstName,
        lastName: params.lastName,
      });

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
        countryCode: params.countryCode,
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
      console.error('Error during signUpWithEmail:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al registrar cuenta.' };
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

      const bootstrapRes = await cloudService.bootstrapOwnerBusiness({
        firstName: pendingDraftOwnerFirstName || state.owner.firstName || 'Propietario',
        lastName: pendingDraftOwnerLastName || state.owner.lastName || '',
        businessName: params.businessName.trim(),
        countryCode: params.countryCode || 'CL',
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

  // Check Email Verification
  const checkEmailVerified = async (): Promise<boolean> => {
    try {
      const cloudService = getCloudService();
      const isVerified = await cloudService.checkEmailVerified();
      if (!isVerified) {
        return false;
      }

      const user = await cloudService.getUser();
      if (user) {
        setCloudUser(user);
        const memberships = await cloudService.getMemberships();
        const ownerMembership = memberships.find((m) => m.role === 'OWNER' && m.status === 'ACTIVE');

        if (ownerMembership) {
          setCloudMembership(ownerMembership);
          setAuthMachineState('DEVICE_ENROLLMENT_REQUIRED');
        } else if (pendingDraftBusinessName) {
          // Auto-bootstrap using draft provided at signup
          const bootstrapRes = await cloudService.bootstrapOwnerBusiness({
            firstName: pendingDraftOwnerFirstName || state.owner.firstName || 'Propietario',
            lastName: pendingDraftOwnerLastName || state.owner.lastName || '',
            businessName: pendingDraftBusinessName,
            countryCode: pendingDraftCountryCode,
          });

          setCloudMembership({
            businessId: bootstrapRes.businessId,
            businessName: bootstrapRes.businessName,
            countryCode: bootstrapRes.countryCode,
            role: bootstrapRes.role,
            status: 'ACTIVE',
          });

          setAuthMachineState('DEVICE_ENROLLMENT_REQUIRED');
        } else {
          // Prompt user to name their business
          setAuthMachineState('BUSINESS_SETUP_REQUIRED');
        }
      }
      return true;
    } catch (err) {
      console.error('Error checking email verification:', err);
      return false;
    }
  };

  const resendVerificationEmail = async (): Promise<void> => {
    const cloudService = getCloudService();
    if (pendingEmailForVerification) {
      await cloudService.resendVerificationEmail(pendingEmailForVerification);
    }
  };

  const sendPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cloudService = getCloudService();
      await cloudService.sendPasswordReset(email);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error al enviar restablecimiento.' };
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

      // If this PC already had local PIN and owner, transition directly to unlocked
      const owner = await userRepo.getOwnerUser();
      if (owner) {
        setSessionStatus('unlocked');
        setAuthMachineState('DEVICE_UNLOCKED');
      } else {
        setAuthMachineState('PIN_SETUP_REQUIRED');
      }

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
          await businessRepo.saveBusinessWithSettings(
            {
              id: businessId,
              name: deviceEnrollment?.businessName || state.business.name || 'Mi Negocio',
              countryCode: (state.countryCode as SupportedCountryCode) || 'CL',
              phonePrefix: '+56',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              businessId,
              primaryCurrency: (state.regionalSettings.primaryCurrencyCode as import('../types/country').CurrencyCode) || 'CLP',
              secondaryCurrencyEnabled: false,
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
    setAuthMachineState('ACCOUNT_REQUIRED');
  };

  const goToRegister = () => {
    setAuthMachineState('REGISTER_REQUIRED');
  };

  const switchLocalAccount = () => {
    sessionRepo.clearSession().catch(() => {});
    setSessionStatus('locked');
    setAuthMachineState('ACCOUNT_REQUIRED');
  };

  const signOutCloudAccount = async () => {
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
        signInWithEmail,
        signUpWithEmail,
        setupCloudBusiness,
        checkEmailVerified,
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
