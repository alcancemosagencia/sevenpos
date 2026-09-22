import React, { useState } from 'react';
import { PlatformAuthProvider, usePlatformAuth } from './context/PlatformAuthContext';
import { PlatformLoginPage } from './pages/PlatformLoginPage';
import { PlatformShell, PlatformTab } from './components/PlatformShell';
import { PlatformDashboardPage } from './pages/PlatformDashboardPage';
import { PlatformBusinessesPage } from './pages/PlatformBusinessesPage';
import { PlatformBusinessDetailPage } from './pages/PlatformBusinessDetailPage';
import { PlatformSettingsPage } from './pages/PlatformSettingsPage';
import { ThemeProvider } from '../context/ThemeContext';
import { RefreshCw } from 'lucide-react';

const PlatformRouter: React.FC = () => {
  const { admin, isLoading } = usePlatformAuth();
  const [currentTab, setCurrentTab] = useState<PlatformTab>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path.includes('/settings') || hash.includes('settings')) {
        return 'settings';
      }
      if (path.includes('/businesses') || hash.includes('businesses')) {
        return 'businesses';
      }
    }
    return 'dashboard';
  });
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [businessFilter, setBusinessFilter] = useState<{ plan?: string; source?: string } | undefined>(undefined);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3 text-text-secondary">
          <RefreshCw size={24} className="animate-spin text-brand-primary" />
          <span className="text-xs font-semibold">Cargando SevenPOS Platform...</span>
        </div>
      </div>
    );
  }

  if (!admin) {
    return <PlatformLoginPage />;
  }

  return (
    <PlatformShell
      currentTab={currentTab}
      onSelectTab={(tab) => {
        setSelectedBusinessId(null);
        setCurrentTab(tab);
      }}
    >
      {selectedBusinessId ? (
        <PlatformBusinessDetailPage
          businessId={selectedBusinessId}
          onBack={() => setSelectedBusinessId(null)}
        />
      ) : currentTab === 'settings' ? (
        <PlatformSettingsPage />
      ) : currentTab === 'businesses' ? (
        <PlatformBusinessesPage
          initialFilter={businessFilter}
          onSelectBusiness={(id) => setSelectedBusinessId(id)}
        />
      ) : (
        <PlatformDashboardPage
          onNavigateToBusinesses={(filter) => {
            setBusinessFilter(filter);
            setCurrentTab('businesses');
          }}
          onSelectBusiness={(id) => setSelectedBusinessId(id)}
        />
      )}
    </PlatformShell>
  );
};

export const PlatformApp: React.FC = () => {
  return (
    <ThemeProvider>
      <PlatformAuthProvider>
        <PlatformRouter />
      </PlatformAuthProvider>
    </ThemeProvider>
  );
};

export default PlatformApp;
