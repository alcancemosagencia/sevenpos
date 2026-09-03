import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import { CountryProvider } from '../context/CountryContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AppShell } from '../components/shell/AppShell';
import { DashboardPage } from '../pages/DashboardPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { OnboardingFlow } from '../features/onboarding/OnboardingFlow';
import { PinLoginPage } from '../features/auth/PinLoginPage';
import { AccountLoginPage } from '../features/auth/AccountLoginPage';
import { RegisterAccountPage } from '../features/auth/RegisterAccountPage';
import { VerifyEmailPage } from '../features/auth/VerifyEmailPage';
import { BusinessSetupPage } from '../features/auth/BusinessSetupPage';
import { ExistingLocalBusinessLinkPage } from '../features/auth/ExistingLocalBusinessLinkPage';
import { DeviceEnrollmentPage } from '../features/auth/DeviceEnrollmentPage';
import { SetupPinModal } from '../features/auth/SetupPinModal';
import { LinkAccountModal } from '../features/auth/LinkAccountModal';
import { LinkAccountBanner } from '../features/auth/LinkAccountBanner';
import { ErrorBoundary } from '../components/errors/ErrorBoundary';
import { DatabaseBootErrorScreen } from '../components/errors/DatabaseBootErrorScreen';
import { DiagnosticsModal } from '../components/dev/DiagnosticsModal';
import { ScannerSimulatorModal } from '../components/dev/ScannerSimulatorModal';
import { syncBrowserUrl, normalizeProtectedPath, resolveEntryRoute, AppRoute } from '../application/routing/RouteResolver';
import { Activity, WifiOff, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '../components/ui/Button';

import { ProductsListPage } from '../pages/ProductsListPage';
import { ProductFormPage } from '../pages/ProductFormPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { CategoriesPage } from '../pages/CategoriesPage';
import { InventoryPage } from '../pages/InventoryPage';
import { MovementsPage } from '../pages/MovementsPage';
import { ProductInventoryDetailPage } from '../pages/ProductInventoryDetailPage';
import { PosPage } from '../pages/PosPage';
import { SalesHistoryPage } from '../pages/SalesHistoryPage';
import { CashPage } from '../pages/CashPage';
import { PurchasesOrdersPage } from '../pages/PurchasesOrdersPage';
import { NewPurchaseOrderPage } from '../pages/NewPurchaseOrderPage';
import { PurchaseOrderDetailPage } from '../pages/PurchaseOrderDetailPage';
import { SuppliersPage } from '../pages/SuppliersPage';
import { CustomersPage } from '../pages/CustomersPage';
import { CustomerDetailPage } from '../pages/CustomerDetailPage';
import { ExpensesPage } from '../pages/ExpensesPage';

// Navigation titles lookup
const NAV_TITLES: Record<string, string> = {
  dashboard: 'Panel Principal',
  pos: 'Punto de Venta',
  sales: 'Ventas y Facturación',
  products: 'Catálogo — Productos',
  categories: 'Catálogo — Categorías',
  stock: 'Inventario — Existencias',
  'stock-adjustments': 'Inventario — Movimientos',
  'purchase-orders': 'Compras — Órdenes de Compra',
  suppliers: 'Compras — Proveedores',
  'cash-register': 'Finanzas — Caja y Turnos',
  expenses: 'Finanzas — Gastos Operativos',
  customers: 'Gestión de Clientes',
  recharges: 'Recargas y Servicios',
  reports: 'Reportes e Inteligencia',
  audit: 'Auditoría y Seguridad',
  settings: 'Configuración General',
  help: 'Centro de Ayuda',
  subscription: 'Planes y Suscripción',
  logout: 'Cerrar Sesión',
};

function getNavIdFromPath(path?: string): string {
  if (!path) return 'dashboard';
  const clean = path.split('?')[0].replace(/\/+$/, '') || '/';
  switch (clean) {
    case '/pos':
      return 'pos';
    case '/sales':
      return 'sales';
    case '/cash':
    case '/finances/cash':
    case '/finances/cash-register':
    case '/cash-register':
      return 'cash-register';
    case '/catalog/products':
    case '/products':
      return 'products';
    case '/catalog/categories':
    case '/categories':
      return 'categories';
    case '/inventory':
    case '/stock':
      return 'stock';
    case '/inventory/movements':
    case '/stock-adjustments':
      return 'stock-adjustments';
    case '/purchases/orders':
    case '/purchases/purchase-orders':
    case '/purchase-orders':
      return 'purchase-orders';
    case '/purchases/suppliers':
    case '/suppliers':
      return 'suppliers';
    case '/finances/expenses':
    case '/expenses':
      return 'expenses';
    case '/customers':
      return 'customers';
    case '/recharges':
      return 'recharges';
    case '/reports':
      return 'reports';
    case '/audit':
      return 'audit';
    case '/settings':
      return 'settings';
    case '/help':
      return 'help';
    case '/subscription':
      return 'subscription';
    case '/dashboard':
    default:
      if (clean.startsWith('/customers/')) {
        return 'customers';
      }
      return 'dashboard';
  }
}

function getCanonicalPathForNavId(navId: string): AppRoute {
  switch (navId) {
    case 'pos':
      return '/pos';
    case 'sales':
      return '/sales';
    case 'products':
      return '/catalog/products';
    case 'categories':
      return '/catalog/categories';
    case 'stock':
      return '/inventory';
    case 'stock-adjustments':
      return '/inventory/movements';
    case 'purchase-orders':
      return '/purchases/orders';
    case 'suppliers':
      return '/purchases/suppliers';
    case 'cash-register':
      return '/finances/cash';
    case 'expenses':
      return '/finances/expenses';
    case 'customers':
      return '/customers';
    case 'recharges':
      return '/recharges';
    case 'reports':
      return '/reports';
    case 'audit':
      return '/audit';
    case 'settings':
      return '/settings';
    case 'help':
      return '/help';
    case 'subscription':
      return '/subscription';
    case 'dashboard':
    default:
      return '/dashboard';
  }
}

const AppRoot: React.FC = () => {
  const {
    isHydrated,
    bootStatus,
    bootError,
    retryBoot,
    authMachineState,
    onboardingStatus,
    isCompletionCelebrationActive,
    activeBusinessName,
    activeOwnerName,
    activeCountryCode,
    cloudUser,
    cloudMembership,
    isCloudLinked,
    pendingEmailForVerification,
    signInWithEmail,
    signUpWithEmail,
    setupCloudBusiness,
    checkEmailVerified,
    resendVerificationEmail,
    sendPasswordReset,
    enrollDevice,
    setupNewDevicePin,
    isLinkingModalOpen,
    openLinkingModal,
    closeLinkingModal,
    linkExistingLocalBusiness,
    linkExistingLocalBusinessWithNewAccount,
    linkExistingLocalBusinessWithExistingAccount,
    lockSession,
    goToAccountLogin,
    goToRegister,
    signOutCloudAccount,
    sessionStatus,
    state,
  } = useAuth();

  const [activeNavId, setActiveNavId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const normalized = normalizeProtectedPath(window.location.pathname);
      if (normalized) {
        return getNavIdFromPath(normalized);
      }
    }
    return 'dashboard';
  });

  const [productSubView, setProductSubView] = useState<'list' | 'new' | 'edit' | 'detail'>('list');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const [inventorySubView, setInventorySubView] = useState<'list' | 'detail'>('list');
  const [selectedInventoryProductId, setSelectedInventoryProductId] = useState<string | null>(null);

  const [purchaseOrderSubView, setPurchaseOrderSubView] = useState<'list' | 'new' | 'detail'>('list');
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<string | null>(null);

  const [customerSubView, setCustomerSubView] = useState<'list' | 'detail'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/customers/') && path.replace('/customers/', '').length > 0) {
        return 'detail';
      }
    }
    return 'list';
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/customers/')) {
        return path.replace('/customers/', '') || null;
      }
    }
    return null;
  });

  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Synchronize browser URL based on active navigation and auth machine state
  useEffect(() => {
    const targetRoute = resolveEntryRoute({
      isHydrated,
      authMachineState,
      onboardingStatus,
      sessionStatus,
      isCompletionCelebrationActive,
      requestedPath: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });

    if (authMachineState === 'DEVICE_UNLOCKED') {
      const targetNavRoute = getCanonicalPathForNavId(activeNavId);
      syncBrowserUrl(targetNavRoute);
    } else {
      syncBrowserUrl(targetRoute);
    }
  }, [isHydrated, authMachineState, isCompletionCelebrationActive, onboardingStatus, sessionStatus, activeNavId]);

  const handleNavigateNav = (navId: string) => {
    if (navId.startsWith('/customers/')) {
      const custId = navId.replace('/customers/', '');
      setActiveNavId('customers');
      setSelectedCustomerId(custId);
      setCustomerSubView('detail');
      return;
    }

    setActiveNavId(navId);
    const targetRoute = getCanonicalPathForNavId(navId);
    syncBrowserUrl(targetRoute);

    if (navId === 'products') {
      setProductSubView('list');
      setSelectedProductId(null);
    }
    if (navId === 'stock') {
      setInventorySubView('list');
      setSelectedInventoryProductId(null);
    }
    if (navId === 'purchase-orders') {
      setPurchaseOrderSubView('list');
      setSelectedPurchaseOrderId(null);
    }
    if (navId === 'customers') {
      setCustomerSubView('list');
      setSelectedCustomerId(null);
    }
  };

  function renderDevTools() {
    if (!import.meta.env.DEV) return null;
    return (
      <>
        <button
          type="button"
          onClick={() => setShowDiagnostics(true)}
          className="fixed bottom-3 right-3 z-50 p-2 rounded-full bg-surface-secondary border border-border-default shadow-md hover:border-brand-primary text-text-tertiary hover:text-brand-primary transition-colors cursor-pointer text-xs flex items-center gap-1"
          title="Abrir Diagnósticos Técnicos (AG-03 / AG-04 Core)"
        >
          <Activity size={14} />
          <span className="font-mono text-[10px] font-semibold">DEV Core</span>
        </button>
        <DiagnosticsModal
          isOpen={showDiagnostics}
          onClose={() => setShowDiagnostics(false)}
          onOpenScannerSimulator={() => setShowScanner(true)}
        />
        <ScannerSimulatorModal
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
        />
      </>
    );
  }

  // 1. Boot failure
  if (bootStatus === 'BOOT_FAILURE') {
    return <DatabaseBootErrorScreen error={bootError} onRetry={retryBoot} />;
  }

  // 2. Loading splash while hydrating
  if (!isHydrated || authMachineState === 'BOOTING') {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // 3. Offline on new device
  if (authMachineState === 'OFFLINE_NEW_DEVICE') {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-surface border border-border-default rounded-3xl p-8 space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-status-danger/10 text-status-danger flex items-center justify-center mx-auto">
            <WifiOff size={28} />
          </div>
          <h1 className="text-xl font-bold text-text-primary">Conexión a Internet requerida</h1>
          <p className="text-xs text-text-secondary">
            Necesitas conexión a Internet para vincular este dispositivo por primera vez. Una vez vinculado, podrás operar sin conexión mediante PIN.
          </p>
          <Button variant="brand" size="md" onClick={retryBoot} leftIcon={<RotateCcw size={15} />} className="w-full">
            Reintentar conexión
          </Button>
        </div>
      </div>
    );
  }

  // 4. Cloud Configuration Error
  if (authMachineState === 'CLOUD_CONFIGURATION_ERROR') {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-surface border border-status-danger/30 rounded-3xl p-8 space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-status-danger/10 text-status-danger flex items-center justify-center mx-auto">
            <AlertTriangle size={28} />
          </div>
          <h1 className="text-xl font-bold text-text-primary">Configuración Cloud no detectada</h1>
          <p className="text-xs text-text-secondary">
            Las variables de entorno <code className="font-mono text-brand-primary">VITE_SUPABASE_URL</code> y{' '}
            <code className="font-mono text-brand-primary">VITE_SUPABASE_PUBLISHABLE_KEY</code> deben estar configuradas.
          </p>
        </div>
      </div>
    );
  }

  // 5. Account Login Required (Email + Password on new device)
  if (authMachineState === 'ACCOUNT_REQUIRED') {
    return (
      <>
        <AccountLoginPage
          onLogin={signInWithEmail}
          onGoToRegister={goToRegister}
          onForgotPassword={sendPasswordReset}
        />
        {renderDevTools()}
      </>
    );
  }

  // 6. Registration Page
  if (authMachineState === 'REGISTER_REQUIRED') {
    return (
      <>
        <RegisterAccountPage
          onRegister={signUpWithEmail}
          onBackToLogin={goToAccountLogin}
          defaultBusinessName={state.business.name}
          defaultCountryCode={state.countryCode}
        />
        {renderDevTools()}
      </>
    );
  }

  // 7. Email Verification Required
  if (authMachineState === 'EMAIL_VERIFICATION_REQUIRED') {
    return (
      <>
        <VerifyEmailPage
          email={pendingEmailForVerification}
          onCheckVerification={checkEmailVerified}
          onResendEmail={resendVerificationEmail}
          onBackToLogin={goToAccountLogin}
        />
        {renderDevTools()}
      </>
    );
  }

  // 8. Existing Local Business Link Required (Authenticated user with existing PC business)
  if (authMachineState === 'EXISTING_LOCAL_BUSINESS_LINK_REQUIRED') {
    return (
      <>
        <ExistingLocalBusinessLinkPage
          userEmail={cloudUser?.email || ''}
          localBusinessName={state.business.name}
          localCountryCode={state.countryCode}
          onLinkBusiness={linkExistingLocalBusiness}
          onSignOut={signOutCloudAccount}
        />
        {renderDevTools()}
      </>
    );
  }

  // 9. Business Setup Required (Authenticated user without existing business)
  if (authMachineState === 'BUSINESS_SETUP_REQUIRED') {
    return (
      <>
        <BusinessSetupPage
          userEmail={cloudUser?.email || ''}
          defaultBusinessName={state.business.name}
          defaultCountryCode={state.countryCode}
          onSetupBusiness={setupCloudBusiness}
          onSignOut={signOutCloudAccount}
        />
        {renderDevTools()}
      </>
    );
  }

  // 8. Device Enrollment Required
  if (authMachineState === 'DEVICE_ENROLLMENT_REQUIRED') {
    return (
      <>
        <DeviceEnrollmentPage
          businessName={cloudMembership?.businessName || state.business.name || 'Mi Negocio'}
          onEnroll={enrollDevice}
        />
        {renderDevTools()}
      </>
    );
  }

  // 9. PIN Setup Required
  if (authMachineState === 'PIN_SETUP_REQUIRED') {
    return (
      <>
        <SetupPinModal
          isOpen={true}
          onSavePin={setupNewDevicePin}
        />
        {renderDevTools()}
      </>
    );
  }

  // 10. Legacy Local Onboarding (First-Run Experience step 1-6)
  if (onboardingStatus === 'incomplete' || isCompletionCelebrationActive) {
    return (
      <>
        <OnboardingFlow />
        {renderDevTools()}
      </>
    );
  }

  // 11. Locked Session: PIN entry
  if (authMachineState === 'DEVICE_LOCKED') {
    return (
      <>
        <PinLoginPage />
        {renderDevTools()}
      </>
    );
  }

  // 12. Unlocked Session: Main App Shell
  let currentPageTitle = NAV_TITLES[activeNavId] || 'SevenPOS';
  if (activeNavId === 'products') {
    if (productSubView === 'new') currentPageTitle = 'Catálogo — Nuevo Producto';
    else if (productSubView === 'edit') currentPageTitle = 'Catálogo — Editar Producto';
    else if (productSubView === 'detail') currentPageTitle = 'Catálogo — Detalle de Producto';
  }
  if (activeNavId === 'purchase-orders') {
    if (purchaseOrderSubView === 'new') currentPageTitle = 'Compras — Nueva Orden de Compra';
    else if (purchaseOrderSubView === 'detail') currentPageTitle = 'Compras — Detalle de Orden';
  }

  const renderContent = () => {
    if (activeNavId === 'dashboard') {
      return <DashboardPage onNavigateToPos={() => handleNavigateNav('pos')} />;
    }

    if (activeNavId === 'pos') {
      return (
        <PosPage
          onNavigate={(route) => {
            const navId = getNavIdFromPath(route as AppRoute);
            handleNavigateNav(navId);
          }}
        />
      );
    }

    if (activeNavId === 'sales') {
      return (
        <SalesHistoryPage
          onNavigate={(route) => {
            const navId = getNavIdFromPath(route as AppRoute);
            handleNavigateNav(navId);
          }}
        />
      );
    }

    if (activeNavId === 'products') {
      if (productSubView === 'new') {
        return (
          <ProductFormPage
            onBack={() => setProductSubView('list')}
            onSuccess={(newId) => {
              setSelectedProductId(newId);
              setProductSubView('detail');
            }}
          />
        );
      }
      if (productSubView === 'edit' && selectedProductId) {
        return (
          <ProductFormPage
            productId={selectedProductId}
            onBack={() => setProductSubView('detail')}
            onSuccess={(updatedId) => {
              setSelectedProductId(updatedId);
              setProductSubView('detail');
            }}
          />
        );
      }
      if (productSubView === 'detail' && selectedProductId) {
        return (
          <ProductDetailPage
            productId={selectedProductId}
            onBack={() => setProductSubView('list')}
            onEditProduct={(editId) => {
              setSelectedProductId(editId);
              setProductSubView('edit');
            }}
          />
        );
      }
      return (
        <ProductsListPage
          onNavigateToNewProduct={() => {
            setSelectedProductId(null);
            setProductSubView('new');
          }}
          onNavigateToEditProduct={(editId) => {
            setSelectedProductId(editId);
            setProductSubView('edit');
          }}
          onNavigateToProductDetail={(detailId) => {
            setSelectedProductId(detailId);
            setProductSubView('detail');
          }}
        />
      );
    }

    if (activeNavId === 'categories') {
      return <CategoriesPage />;
    }

    if (activeNavId === 'stock') {
      if (inventorySubView === 'detail' && selectedInventoryProductId) {
        return (
          <ProductInventoryDetailPage
            productId={selectedInventoryProductId}
            onBack={() => {
              setSelectedInventoryProductId(null);
              setInventorySubView('list');
            }}
          />
        );
      }
      return (
        <InventoryPage
          onNavigateToCatalog={() => handleNavigateNav('products')}
          onNavigateToMovements={() => handleNavigateNav('stock-adjustments')}
          onNavigateToProductDetail={(prodId) => {
            setSelectedInventoryProductId(prodId);
            setInventorySubView('detail');
          }}
        />
      );
    }

    if (activeNavId === 'stock-adjustments') {
      return <MovementsPage onBackToInventory={() => handleNavigateNav('stock')} />;
    }

    if (activeNavId === 'purchase-orders') {
      if (purchaseOrderSubView === 'new') {
        return (
          <NewPurchaseOrderPage
            onBack={() => setPurchaseOrderSubView('list')}
            onSuccess={(newId) => {
              setSelectedPurchaseOrderId(newId);
              setPurchaseOrderSubView('detail');
            }}
          />
        );
      }
      if (purchaseOrderSubView === 'detail' && selectedPurchaseOrderId) {
        return (
          <PurchaseOrderDetailPage
            orderId={selectedPurchaseOrderId}
            onBack={() => setPurchaseOrderSubView('list')}
            onNavigateToInventory={() => handleNavigateNav('stock')}
          />
        );
      }
      return (
        <PurchasesOrdersPage
          onNavigateToNewOrder={() => {
            setSelectedPurchaseOrderId(null);
            setPurchaseOrderSubView('new');
          }}
          onNavigateToOrderDetail={(orderId) => {
            setSelectedPurchaseOrderId(orderId);
            setPurchaseOrderSubView('detail');
          }}
        />
      );
    }

    if (activeNavId === 'suppliers') {
      return <SuppliersPage />;
    }

    if (activeNavId === 'cash-register') {
      return <CashPage />;
    }

    if (activeNavId === 'expenses') {
      return <ExpensesPage />;
    }

    if (activeNavId === 'customers') {
      if (customerSubView === 'detail' && selectedCustomerId) {
        return (
          <CustomerDetailPage
            customerId={selectedCustomerId}
            onBack={() => {
              setSelectedCustomerId(null);
              setCustomerSubView('list');
            }}
            onNavigate={handleNavigateNav}
          />
        );
      }
      return (
        <CustomersPage
          onNavigate={handleNavigateNav}
          onSelectCustomerDetail={(id) => {
            setSelectedCustomerId(id);
            setCustomerSubView('detail');
          }}
        />
      );
    }

    return (
      <PlaceholderPage
        title={currentPageTitle}
        subtitle="Estructura de navegación validada para la carrocería de SevenPOS."
      />
    );
  };

  return (
    <>
      <AppShell
        activeNavId={activeNavId}
        onNavigate={handleNavigateNav}
        onLogout={lockSession}
        pageTitle={currentPageTitle}
        businessName={activeBusinessName}
        userName={activeOwnerName}
        userRole="Dueño"
      >
        {!isCloudLinked && <LinkAccountBanner onOpenLinkModal={openLinkingModal} />}
        {renderContent()}
      </AppShell>
      <LinkAccountModal
        isOpen={isLinkingModalOpen}
        onClose={closeLinkingModal}
        localBusinessName={activeBusinessName}
        localCountryCode={activeCountryCode}
        localOwnerFirstName={state.owner.firstName}
        localOwnerLastName={state.owner.lastName}
        onLinkWithNewAccount={linkExistingLocalBusinessWithNewAccount}
        onLinkWithExistingAccount={linkExistingLocalBusinessWithExistingAccount}
      />
      {renderDevTools()}
    </>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <CountryProvider>
          <AuthProvider>
            <AppRoot />
          </AuthProvider>
        </CountryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
