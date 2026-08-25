import { OnboardingState } from '../types/onboarding';

export const ONBOARDING_STORAGE_KEY = 'sevenpos-onboarding-state';

export const DEFAULT_INITIAL_STATE: OnboardingState = {
  onboardingStatus: 'incomplete',
  sessionStatus: 'locked',
  currentStep: 1,
  countryCode: 'CL',
  business: {
    name: '',
    fiscalId: '',
    phone: '',
    phonePrefix: '+56',
    address: '',
  },
  regionalSettings: {
    primaryCurrencyCode: 'CLP',
    enableSecondaryUSD: false,
  },
  owner: {
    firstName: '',
    lastName: '',
    email: '',
    role: 'Dueño',
  },
};

export interface OnboardingRepository {
  load(): OnboardingState;
  save(state: OnboardingState): void;
  reset(): OnboardingState;
}

export class LocalStorageOnboardingRepository implements OnboardingRepository {
  load(): OnboardingState {
    // Check dev reset flag (only active in browser development mode)
    if (typeof window !== 'undefined') {
      const isDev = import.meta.env.DEV;
      const urlParams = new URLSearchParams(window.location.search);
      if (isDev && urlParams.get('reset') === 'true') {
        console.info('[SevenPOS Dev] Resetting onboarding state via ?reset=true');
        return this.reset();
      }
    }

    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as OnboardingState;
          if (parsed && (parsed.onboardingStatus === 'completed' || parsed.onboardingStatus === 'incomplete')) {
            if (parsed.onboardingStatus === 'completed') {
              parsed.currentStep = 1;
            }
            return parsed;
          }
        }
      } catch (err) {
        console.warn('Failed to load onboarding state from localStorage:', err);
      }
    }

    return { ...DEFAULT_INITIAL_STATE };
  }

  save(state: OnboardingState): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const sanitized = { ...state };
        if (sanitized.onboardingStatus === 'completed') {
          sanitized.currentStep = 1;
        }
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(sanitized));
      } catch (err) {
        console.warn('Failed to save onboarding state to localStorage:', err);
      }
    }
  }


  reset(): OnboardingState {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      } catch (err) {
        console.warn('Failed to remove onboarding state from localStorage:', err);
      }
    }
    return { ...DEFAULT_INITIAL_STATE };
  }
}

export const onboardingRepository = new LocalStorageOnboardingRepository();
