import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import { CountryProvider } from '../context/CountryContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AppShell } from '../components/shell/AppShell';
import { DashboardPage } from '../pages/DashboardPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { OnboardingFlow } from '../features/onboarding/OnboardingFlow';
import { PinLoginPage } from '../features/auth/PinLoginPage';
import { ErrorBoundary } from '../components/errors/ErrorBoundary';
import { DatabaseBootErrorScreen } from '../components/errors/DatabaseBootErrorScreen';
import { DiagnosticsModal } from '../components/dev/DiagnosticsModal';
import { ScannerSimulatorModal } from '../components/dev/ScannerSimulatorModal';
import { resolveEntryRoute, syncBrowserUrl, normalizeProtectedPath, AppRoute } from '../application/routing/RouteResolver';
import { Activity } from 'lucide-react';

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
    onboardingStatus,
    sessionStatus,
    isCompletionCelebrationActive,
    activeBusinessName,
    activeOwnerName,
    lockSession,
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

  // Compute canonical route based on single source of truth and requested pathname
  const requestedPath = typeof window !== 'undefined' ? window.location.pathname : undefined;
  const currentRoute = resolveEntryRoute({
    isHydrated,
    onboardingStatus,
    sessionStatus,
    isCompletionCelebrationActive,
    requestedPath,
  });

  // Synchronize browser URL when auth state or route resolves
  useEffect(() => {
    syncBrowserUrl(currentRoute);
  }, [currentRoute]);

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

  // Guard 0: Native boot failure
  if (bootStatus === 'BOOT_FAILURE') {
    return <DatabaseBootErrorScreen error={bootError} onRetry={retryBoot} />;
  }

  // Guard 1: Loading splash while hydrating from SQLite/repositories
  if (currentRoute === 'loading') {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Guard 2: If onboarding is incomplete, render First Run Experience (/register)
  if (currentRoute === '/register') {
    return (
      <>
        <OnboardingFlow />
        {renderDevTools()}
      </>
    );
  }

  // Guard 3: If onboarding is completed and session is locked, render PIN Login (/login)
  if (currentRoute === '/login') {
    return (
      <>
        <PinLoginPage />
        {renderDevTools()}
      </>
    );
  }

  // Guard 4: If completed and unlocked, render full App Shell (with active protected route)
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
        {renderContent()}
      </AppShell>
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
