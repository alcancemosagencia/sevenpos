import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { SettingsSectionId, GeneralSettingsForm, CurrencySettingsForm, PosSettingsForm, PrintingSettingsForm, InventorySettingsForm, DeviceSettingsData } from '../features/settings/types';
import { GeneralSection } from '../features/settings/components/GeneralSection';
import { CurrencySection } from '../features/settings/components/CurrencySection';
import { PosSection } from '../features/settings/components/PosSection';
import { PrintingSection } from '../features/settings/components/PrintingSection';
import { InventorySection } from '../features/settings/components/InventorySection';
import { SecuritySection } from '../features/settings/components/SecuritySection';
import { DeviceSection } from '../features/settings/components/DeviceSection';
import { AppearanceSection } from '../features/settings/components/AppearanceSection';
import { UnsavedChangesModal } from '../features/settings/components/UnsavedChangesModal';
import { Skeleton } from '../components/ui/Skeleton';
import {
  Building2,
  Coins,
  ShoppingCart,
  Printer,
  Boxes,
  ShieldCheck,
  Monitor,
  Palette,
  Settings as SettingsIcon,
} from 'lucide-react';

interface NavSectionItem {
  id: SettingsSectionId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const SETTINGS_SECTIONS: NavSectionItem[] = [
  { id: 'general', label: 'General', icon: Building2 },
  { id: 'currency', label: 'Moneda y Región', icon: Coins },
  { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart },
  { id: 'printing', label: 'Tickets e Impresión', icon: Printer },
  { id: 'inventory', label: 'Inventario', icon: Boxes },
  { id: 'security', label: 'Seguridad y Acceso', icon: ShieldCheck },
  { id: 'device', label: 'Dispositivo', icon: Monitor },
  { id: 'appearance', label: 'Apariencia', icon: Palette },
];

export const SettingsPage: React.FC = () => {
  const { businessId, activeOwnerName, cloudUser, deviceEnrollment } = useAuth();
  const currentBusinessId = businessId || 'primary-business';
  const currentUserId = cloudUser?.id || 'primary-user';
  const currentUserName = activeOwnerName || 'Administrador';
  const currentDeviceId = deviceEnrollment?.deviceId || 'local-device';

  const [activeSection, setActiveSection] = useState<SettingsSectionId>('general');
  const [pendingSection, setPendingSection] = useState<SettingsSectionId | null>(null);
  const [isCurrentDirty, setIsCurrentDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Loaded Settings Data
  const [isLoading, setIsLoading] = useState(true);
  const [generalData, setGeneralData] = useState<GeneralSettingsForm | null>(null);
  const [currencyData, setCurrencyData] = useState<CurrencySettingsForm | null>(null);
  const [posData, setPosData] = useState<PosSettingsForm | null>(null);
  const [printingData, setPrintingData] = useState<PrintingSettingsForm | null>(null);
  const [inventoryData, setInventoryData] = useState<InventorySettingsForm | null>(null);
  const [deviceData, setDeviceData] = useState<DeviceSettingsData | null>(null);

  const settingsService = repositoryFactory.getSettingsService();

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [gen, curr, inv] = await Promise.all([
          settingsService.getGeneralSettings(currentBusinessId),
          settingsService.getCurrencySettings(currentBusinessId),
          settingsService.getInventorySettings(currentBusinessId),
        ]);

        const pos = settingsService.getPosSettings();
        const print = settingsService.getPrintingSettings();
        const dev = settingsService.getDeviceSettings();

        if (isMounted) {
          setGeneralData(
            gen || {
              name: 'SevenPOS Store',
              fiscalId: '',
              phone: '',
              phonePrefix: '+56',
              address: '',
              countryCode: 'CL',
            }
          );
          setCurrencyData(
            curr || {
              countryCode: 'CL',
              primaryCurrency: 'CLP',
              secondaryCurrencyEnabled: false,
              secondaryCurrency: null,
              exchangeRateProvider: 'MANUAL',
              manualExchangeRate: 1,
            }
          );
          setPosData(pos);
          setPrintingData(print);
          setInventoryData(inv);
          setDeviceData(dev);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [currentBusinessId, settingsService]);

  const handleNavClick = (sectionId: SettingsSectionId) => {
    if (sectionId === activeSection) return;

    if (isCurrentDirty) {
      setPendingSection(sectionId);
      setShowUnsavedModal(true);
    } else {
      setActiveSection(sectionId);
    }
  };

  const handleConfirmDiscard = () => {
    setIsCurrentDirty(false);
    setShowUnsavedModal(false);
    if (pendingSection) {
      setActiveSection(pendingSection);
      setPendingSection(null);
    }
  };

  const handleStay = () => {
    setShowUnsavedModal(false);
    setPendingSection(null);
  };

  // Section Save Handlers
  const handleSaveGeneral = async (form: GeneralSettingsForm) => {
    const res = await settingsService.saveGeneralSettings(currentBusinessId, form, {
      userId: currentUserId,
      userName: currentUserName,
      deviceId: currentDeviceId,
    });
    if (res.success) {
      setGeneralData(form);
      setIsCurrentDirty(false);
    }
    return res;
  };

  const handleSaveCurrency = async (form: CurrencySettingsForm) => {
    const res = await settingsService.saveCurrencySettings(currentBusinessId, form, {
      userId: currentUserId,
      userName: currentUserName,
      deviceId: currentDeviceId,
    });
    if (res.success) {
      setCurrencyData(form);
      setIsCurrentDirty(false);
    }
    return res;
  };

  const handleSavePos = async (form: PosSettingsForm) => {
    const res = await settingsService.savePosSettings(form, {
      userId: currentUserId,
      userName: currentUserName,
      businessId: currentBusinessId,
      deviceId: currentDeviceId,
    });
    if (res.success) {
      setPosData(form);
      setIsCurrentDirty(false);
    }
    return res;
  };

  const handleSavePrinting = async (form: PrintingSettingsForm) => {
    const res = await settingsService.savePrintingSettings(form, {
      userId: currentUserId,
      userName: currentUserName,
      businessId: currentBusinessId,
      deviceId: currentDeviceId,
    });
    if (res.success) {
      setPrintingData(form);
      setIsCurrentDirty(false);
    }
    return res;
  };

  const handleSaveInventory = async (form: InventorySettingsForm) => {
    const res = await settingsService.saveInventorySettings(currentBusinessId, form, {
      userId: currentUserId,
      userName: currentUserName,
      deviceId: currentDeviceId,
    });
    if (res.success) {
      setInventoryData(form);
      setIsCurrentDirty(false);
    }
    return res;
  };

  const handleSavePin = async (input: { currentPin: string; newPin: string; confirmPin: string }) => {
    return settingsService.changePin(currentUserId, input, {
      userId: currentUserId,
      userName: currentUserName,
      businessId: currentBusinessId,
      deviceId: currentDeviceId,
    });
  };

  const navButtonsRef = React.useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (activeSection && navButtonsRef.current[activeSection]) {
      navButtonsRef.current[activeSection]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'nearest',
        block: 'nearest',
      });
    }
  }, [activeSection]);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-in fade-in-0 duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 border-b border-border-default pb-4 sm:pb-5">
        <div>
          <div className="flex items-center gap-2 text-text-tertiary text-xs font-semibold uppercase tracking-wider mb-0.5 sm:mb-1">
            <SettingsIcon size={14} />
            <span>Configuración</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">Configuración</h1>
          <p className="text-xs text-text-secondary mt-0.5 sm:mt-1">
            Personaliza SevenPOS para que funcione como tu negocio.
          </p>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start w-full">
        {/* Subnav Navigation */}
        <div className="w-full lg:w-64 shrink-0 overflow-x-auto no-scrollbar pb-1 lg:pb-0 scroll-smooth">
          <nav
            className="flex lg:flex-col gap-1.5 p-1 bg-surface-secondary/40 lg:bg-transparent border border-border-default lg:border-0 rounded-2xl min-w-max lg:min-w-0"
            role="tablist"
            aria-label="Secciones de configuración"
          >
            {SETTINGS_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  ref={(el) => {
                    navButtonsRef.current[sec.id] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleNavClick(sec.id)}
                  className={`shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left min-h-[44px] sm:min-h-0 whitespace-nowrap ${
                    isActive
                      ? 'bg-surface lg:bg-surface-secondary text-text-primary shadow-xs border border-border-default font-bold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface/50 lg:hover:bg-surface-secondary/50 border border-transparent'
                  }`}
                >
                  <Icon
                    size={16}
                    className={isActive ? 'text-brand-primary shrink-0' : 'text-text-tertiary shrink-0'}
                  />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 w-full bg-surface border border-border-default rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xs min-h-[480px]">
          {isLoading && (
            <div className="space-y-6">
              <Skeleton className="h-6 w-48 rounded-lg" />
              <Skeleton className="h-4 w-96 rounded-lg" />
              <div className="space-y-4 pt-4">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            </div>
          )}

          {!isLoading && (
            <>
              {activeSection === 'general' && generalData && (
                <GeneralSection
                  initialData={generalData}
                  onSave={handleSaveGeneral}
                  onDirtyChange={setIsCurrentDirty}
                />
              )}

              {activeSection === 'currency' && currencyData && (
                <CurrencySection
                  initialData={currencyData}
                  onSave={handleSaveCurrency}
                  onDirtyChange={setIsCurrentDirty}
                />
              )}

              {activeSection === 'pos' && posData && (
                <PosSection
                  initialData={posData}
                  onSave={handleSavePos}
                  onDirtyChange={setIsCurrentDirty}
                />
              )}

              {activeSection === 'printing' && printingData && (
                <PrintingSection
                  initialData={printingData}
                  onSave={handleSavePrinting}
                  onDirtyChange={setIsCurrentDirty}
                  businessName={generalData?.name}
                />
              )}

              {activeSection === 'inventory' && inventoryData && (
                <InventorySection
                  initialData={inventoryData}
                  onSave={handleSaveInventory}
                  onDirtyChange={setIsCurrentDirty}
                />
              )}

              {activeSection === 'security' && (
                <SecuritySection onSavePin={handleSavePin} />
              )}

              {activeSection === 'device' && deviceData && (
                <DeviceSection deviceData={deviceData} />
              )}

              {activeSection === 'appearance' && (
                <AppearanceSection />
              )}
            </>
          )}
        </div>
      </div>

      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onStay={handleStay}
        onDiscard={handleConfirmDiscard}
      />
    </div>
  );
};
