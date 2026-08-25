import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { IconButton } from '../../../components/ui/IconButton';
import horizontalLogo from '../../../assets/branding/sevenpos-logo-horizontal.png';
import ownerIllustration from '../../../assets/illustrations/onboarding-owner.png';
import successIllustration from '../../../assets/illustrations/onboarding-success.png';

export interface OnboardingLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps?: number;
  stepTitle: string;
  stepDescription?: string;
  heroHeadline?: string;
  heroSubheadline?: string;
  isCompletion?: boolean;
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  children,
  currentStep,
  totalSteps = 6,
  stepTitle,
  stepDescription,
  heroHeadline = 'Deje su negocio listo antes de entrar por primera vez',
  heroSubheadline = 'Configuremos lo esencial para que puedas comenzar a vender con SevenPOS.',
  isCompletion = false,
}) => {
  const { theme, toggleTheme } = useTheme();
  const progressPercent = Math.round((currentStep / totalSteps) * 100);
  const illustration = isCompletion ? successIllustration : ownerIllustration;

  return (
    <div className="min-h-screen w-full bg-background text-text-primary flex items-center justify-center p-3 sm:p-6 md:p-8 lg:p-10 select-none overflow-x-hidden relative">
      {/* Global Theme Toggle available across all Onboarding Steps */}
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

      <div className="w-full max-w-5xl bg-surface border border-border-default rounded-[var(--radius-modal)] shadow-[var(--shadow-elevated)] overflow-hidden flex flex-col lg:flex-row min-h-[580px] sm:min-h-[620px]">
        {/* 1. Left Brand / Visual Hero Panel (Visible on lg 1024px+) */}
        <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-brand-primary/15 via-surface-secondary to-brand-secondary/10 p-8 flex-col justify-between border-r border-border-subtle relative overflow-hidden">
          {/* Brand Header */}
          <div className="relative z-10 space-y-4">
            <div className="bg-[#08090d] px-3 py-1.5 rounded-xl border border-white/10 shadow-xs inline-flex items-center">
              <img
                src={horizontalLogo}
                alt="SevenPOS"
                className="h-6 object-contain"
              />
            </div>

            <div className="pt-2">
              <span className="inline-block px-2.5 py-1 text-[11px] font-bold rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 mb-2">
                Configuración Inicial
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary leading-snug">
                {heroHeadline}
              </h2>
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                {heroSubheadline}
              </p>
            </div>
          </div>

          {/* 3D Contextual Character Art (Scaled up +15-20% for stronger presence) */}
          <div className="relative z-10 flex justify-center items-end mt-2">
            <img
              src={illustration}
              alt="SevenPOS Setup"
              className="max-h-[300px] sm:max-h-[340px] lg:max-h-[360px] object-contain drop-shadow-md transition-all duration-300"
            />
          </div>

          {/* Background Ambient Glow */}
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-brand-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-brand-secondary/15 blur-3xl pointer-events-none" />
        </div>

        {/* 2. Right Form / Configuration Panel (Responsive across all screens) */}
        <div className="flex-1 p-5 sm:p-8 md:p-10 flex flex-col justify-between bg-surface">
          {/* Header & Progress Indicator */}
          <div>
            {/* Mobile / Tablet Logo & Progress Bar */}
            <div className="flex items-center justify-between gap-3 mb-4 lg:mb-6">
              <div className="lg:hidden bg-[#08090d] px-2.5 py-1 rounded-lg border border-white/10 shadow-xs inline-flex items-center">
                <img
                  src={horizontalLogo}
                  alt="SevenPOS"
                  className="h-5 object-contain"
                />
              </div>

              <div className="flex items-center gap-2 ml-auto pr-10 sm:pr-0">
                <span className="text-xs font-semibold text-brand-primary bg-brand-primary/10 px-2.5 py-0.5 rounded-full border border-brand-primary/20">
                  Paso {currentStep} de {totalSteps}
                </span>
                <span className="text-xs font-bold text-text-tertiary">
                  {progressPercent}%
                </span>
              </div>
            </div>

            {/* Visual Progress Line */}
            <div className="w-full h-1.5 bg-surface-secondary rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-brand-primary transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Step Title & Description */}
            <div className="space-y-1 mb-6">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
                {stepTitle}
              </h1>
              {stepDescription && (
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  {stepDescription}
                </p>
              )}
            </div>
          </div>

          {/* Step Form Content */}
          <div className="flex-1 flex flex-col justify-center my-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
