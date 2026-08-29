import React, { useState } from 'react';
import { Smartphone, Monitor, Tablet, Globe, ArrowRight, Store, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { DeviceType } from '../../domain/auth/DeviceEnrollment';
import sevenposLogo from '../../assets/branding/sevenpos-logo-horizontal.png';

interface DeviceEnrollmentPageProps {
  businessName: string;
  onEnroll: (params: {
    deviceName: string;
    platform: string;
    deviceType: DeviceType;
  }) => Promise<{ success: boolean; error?: string }>;
}

export const DeviceEnrollmentPage: React.FC<DeviceEnrollmentPageProps> = ({
  businessName,
  onEnroll,
}) => {
  // Detect default platform and device type
  const detectDefaults = () => {
    if (typeof window === 'undefined') {
      return { type: 'DESKTOP' as DeviceType, name: 'Terminal Principal', platform: 'Web' };
    }
    const ua = navigator.userAgent;
    let type: DeviceType = 'DESKTOP';
    let platform = 'Web';
    let suggestedName = 'Mi Computador';

    if (/iPad|Tablet/i.test(ua)) {
      type = 'TABLET';
      platform = 'Tablet';
      suggestedName = 'Mi Tablet';
    } else if (/iPhone/i.test(ua)) {
      type = 'MOBILE';
      platform = 'iOS';
      suggestedName = 'Mi iPhone';
    } else if (/Android/i.test(ua)) {
      type = 'MOBILE';
      platform = 'Android';
      suggestedName = 'Mi Android';
    } else if (/Macintosh|Mac OS X/i.test(ua)) {
      type = 'DESKTOP';
      platform = 'macOS';
      suggestedName = 'Mac Principal';
    } else if (/Windows/i.test(ua)) {
      type = 'DESKTOP';
      platform = 'Windows';
      suggestedName = 'Caja Principal - Windows';
    }

    return { type, name: suggestedName, platform };
  };

  const defaults = detectDefaults();
  const [deviceName, setDeviceName] = useState(defaults.name);
  const [deviceType, setDeviceType] = useState<DeviceType>(defaults.type);
  const [platform] = useState(defaults.platform);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!deviceName.trim()) {
      setErrorMessage('Ingresa un nombre para este terminal.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onEnroll({
        deviceName: deviceName.trim(),
        platform,
        deviceType,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Error al enrolar dispositivo.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al registrar dispositivo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-surface border border-border-default rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex justify-center">
          <img src={sevenposLogo} alt="SevenPOS" className="h-7 w-auto object-contain" />
        </div>

        <div className="space-y-1 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-semibold">
            <Sparkles size={13} />
            <span>Vincular Nuevo Dispositivo</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
            Configurar este terminal
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary">
            Asigna un nombre a este equipo para identificarlo en tu panel.
          </p>
        </div>

        {/* Business Badge */}
        <div className="p-3.5 bg-surface-secondary border border-border-default rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
            <Store size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
              Negocio asociado
            </p>
            <p className="text-sm font-bold text-text-primary truncate">{businessName}</p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs flex items-center gap-2.5 text-left">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Nombre del dispositivo
            </label>
            <input
              type="text"
              required
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Ej. Mi iPhone, Caja 1"
              className="w-full px-3.5 py-2.5 bg-surface-secondary border border-border-default rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Tipo de terminal
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { type: 'DESKTOP' as DeviceType, label: 'PC', icon: Monitor },
                { type: 'MOBILE' as DeviceType, label: 'Móvil', icon: Smartphone },
                { type: 'TABLET' as DeviceType, label: 'Tablet', icon: Tablet },
                { type: 'WEB' as DeviceType, label: 'Web', icon: Globe },
              ].map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDeviceType(type)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs font-semibold transition-colors ${
                    deviceType === type
                      ? 'bg-brand-primary/10 border-brand-primary text-brand-primary'
                      : 'bg-surface-secondary border-border-default text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            variant="brand"
            size="lg"
            isLoading={isSubmitting}
            rightIcon={<ArrowRight size={16} />}
            className="w-full font-bold pt-2"
          >
            Continuar a Crear PIN
          </Button>
        </form>
      </div>
    </div>
  );
};
