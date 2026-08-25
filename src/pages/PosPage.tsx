import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { Product } from '../domain/catalog/Product';
import { ProductPresentation } from '../domain/catalog/ProductPresentation';
import { Category } from '../domain/catalog/Category';
import { PaymentMethod } from '../domain/sales/PaymentMethod';
import { ReceiptDTO } from '../domain/sales/Receipt';
import { CompleteSale, CompleteSaleResult } from '../application/sales/CompleteSale';
import { EnsureDefaultPaymentMethods } from '../application/sales/EnsureDefaultPaymentMethods';
import { OpenCashSession } from '../application/cash/OpenCashSession';
import { CashSession } from '../domain/cash/CashSession';
import { CartProvider, useCart } from '../features/pos/context/CartContext';
import { PosProductGrid } from '../features/pos/components/PosProductGrid';
import { PosCartPanel } from '../features/pos/components/PosCartPanel';
import { PosPresentationModal } from '../features/pos/components/PosPresentationModal';
import { PosCheckoutModal, CheckoutPaymentRow } from '../features/pos/components/PosCheckoutModal';
import { PosReceiptModal } from '../features/pos/components/PosReceiptModal';
import { PosPriceChangedModal } from '../features/pos/components/PosPriceChangedModal';
import { OpenCashModal } from '../features/cash/components/OpenCashModal';
import { usePosScanner } from '../features/pos/hooks/usePosScanner';
import { generateUuid } from '../domain/common/IdGenerator';
import { ShoppingCart, Lock, LockOpen } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useCountry } from '../context/CountryContext';
import { formatMoney } from '../domain/common/money/Money';
import { CurrencyCode } from '../types/country';

interface PosWorkspaceContentProps {
  onNavigate: (route: string) => void;
}

const PosWorkspaceContent: React.FC<PosWorkspaceContentProps> = ({ onNavigate }) => {
  const { activeOwnerName } = useAuth();
  const { country } = useCountry();
  const currency = country.primaryCurrency.code as CurrencyCode;
  const businessId = 'primary-business';
  const userId = 'primary-user';
  const userName = activeOwnerName || 'Cajero';

  const {
    items,
    total,
    customerName,
    customerId,
    note,
    globalDiscount,
    addItem,
    clearCart,
    updatePricesFromConflict,
  } = useCart();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [presentations, setPresentations] = useState<ProductPresentation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [stockMap, setStockMap] = useState<Map<string, number>>(new Map());

  // Cash Session State
  const [activeCashSession, setActiveCashSession] = useState<CashSession | null>(null);
  const [isOpenCashModalOpen, setIsOpenCashModalOpen] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedFilterType, setSelectedFilterType] = useState<'ALL' | 'FEATURED' | 'CATEGORY'>('ALL');

  // Presentation Modal
  const [selectedProductForPres, setSelectedProductForPres] = useState<Product | null>(null);
  const [availablePresForModal, setAvailablePresForModal] = useState<ProductPresentation[]>([]);

  // Checkout & Receipt Modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);
  const [currentIdempotencyKey, setCurrentIdempotencyKey] = useState<string>('');
  const [completedReceipt, setCompletedReceipt] = useState<ReceiptDTO | null>(null);

  // Price Conflict Modal
  const [priceConflicts, setPriceConflicts] = useState<
    { productName: string; presentationName?: string | null; previousPrice: number; newPrice: number }[]
  >([]);
  const [isPriceConflictModalOpen, setIsPriceConflictModalOpen] = useState(false);

  // Mobile cart sheet toggle
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Repositories & Use Cases
  const productRepo = useMemo(() => repositoryFactory.getProductRepository(), []);
  const presentationRepo = useMemo(() => repositoryFactory.getProductPresentationRepository(), []);
  const categoryRepo = useMemo(() => repositoryFactory.getCategoryRepository(), []);
  const paymentMethodRepo = useMemo(() => repositoryFactory.getPaymentMethodRepository(), []);
  const movementRepo = useMemo(() => repositoryFactory.getInventoryMovementRepository(), []);
  const lotRepo = useMemo(() => repositoryFactory.getInventoryLotRepository(), []);
  const saleRepo = useMemo(() => repositoryFactory.getSaleRepository(), []);
  const businessRepo = useMemo(() => repositoryFactory.getBusinessRepository(), []);
  const registerRepo = useMemo(() => repositoryFactory.getCashRegisterRepository(), []);
  const cashSessionRepo = useMemo(() => repositoryFactory.getCashSessionRepository(), []);

  const openCashUseCase = useMemo(
    () => new OpenCashSession(cashSessionRepo, registerRepo),
    [cashSessionRepo, registerRepo]
  );

  const completeSaleUseCase = useMemo(
    () =>
      new CompleteSale(
        saleRepo,
        paymentMethodRepo,
        productRepo,
        presentationRepo,
        movementRepo,
        lotRepo,
        businessRepo,
        cashSessionRepo
      ),
    [saleRepo, paymentMethodRepo, productRepo, presentationRepo, movementRepo, lotRepo, businessRepo, cashSessionRepo]
  );

  const loadData = useCallback(async () => {
    try {
      // 1. Ensure default payment methods
      const ensurePm = new EnsureDefaultPaymentMethods(paymentMethodRepo);
      await ensurePm.execute(businessId);

      // 2. Fetch Catalog & Payment Methods
      const [prodRes, cats, pms] = await Promise.all([
        productRepo.list({ businessId, pageSize: 1000, status: 'active' }),
        categoryRepo.list(businessId, true),
        paymentMethodRepo.listActivePaymentMethods(businessId),
      ]);

      const activeProds = prodRes.items.map((i) => i.product);

      // Fetch all active presentations for active products
      const allPresentations: ProductPresentation[] = [];
      const newStockMap = new Map<string, number>();

      for (const p of activeProds) {
        try {
          const presList = await presentationRepo.listByProduct(p.id, businessId, true);
          allPresentations.push(...presList);

          const stock = await movementRepo.getCurrentStock(p.id, businessId);
          newStockMap.set(p.id, stock);
        } catch {
          newStockMap.set(p.id, 0);
        }
      }

      // 3. Fetch active cash session
      const activeSession = await cashSessionRepo.getActiveSession(businessId);
      setActiveCashSession(activeSession);

      setProducts(activeProds);
      setPresentations(allPresentations);
      setCategories(cats);
      setPaymentMethods(pms);
      setStockMap(newStockMap);
    } catch (err) {
      console.error('Error loading POS catalog data:', err);
    }
  }, [businessId, productRepo, presentationRepo, categoryRepo, paymentMethodRepo, movementRepo, cashSessionRepo]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // Barcode Scanner Integration
  usePosScanner({
    businessId,
    products,
    presentations,
    movementRepo,
    onBarcodeMatched: (prod, pres, availableStock) => {
      addItem(prod, pres, 1, availableStock);
    },
    onScanError: (msg) => {
      console.warn('Scanner notice:', msg);
    },
    enabled: !isCheckoutOpen && !isPriceConflictModalOpen,
  });

  // Handlers for Product Selection
  const handleSelectProduct = (product: Product) => {
    const stock = stockMap.get(product.id) || 0;
    if (stock <= 0) return;
    addItem(product, null, 1, stock);
  };

  const handleOpenPresentationModal = (product: Product, presList: ProductPresentation[]) => {
    setSelectedProductForPres(product);
    setAvailablePresForModal(presList);
  };

  const handleSelectBaseFromModal = (product: Product) => {
    const stock = stockMap.get(product.id) || 0;
    addItem(product, null, 1, stock);
    setSelectedProductForPres(null);
  };

  const handleSelectPresFromModal = (product: Product, presentation: ProductPresentation) => {
    const stock = stockMap.get(product.id) || 0;
    addItem(product, presentation, 1, stock);
    setSelectedProductForPres(null);
  };

  // Open Cash Handler
  const handleOpenCash = async (openingAmount: number, note: string | null) => {
    const res = await openCashUseCase.execute({
      businessId,
      openedByUserId: userId,
      openedByNameSnapshot: userName,
      openingAmount,
      currencyCode: currency,
      note,
    });

    if (!res.success) {
      throw new Error(res.error || 'Error al abrir caja');
    }

    await loadData();
  };

  // Open Checkout Flow
  const handleOpenCheckout = () => {
    if (!activeCashSession) {
      setIsOpenCashModalOpen(true);
      return;
    }
    if (items.length === 0) return;
    setCheckoutError(null);
    setCurrentIdempotencyKey(generateUuid());
    setIsCheckoutOpen(true);
  };

  // Execute Sale Transaction
  const handleConfirmSale = async (payments: CheckoutPaymentRow[], saleNote?: string) => {
    if (isSubmittingCheckout) return;
    setIsSubmittingCheckout(true);
    setCheckoutError(null);

    try {
      const payloadItems = items.map((i) => ({
        productId: i.productId,
        presentationId: i.presentationId,
        quantity: i.quantity,
        expectedUnitPrice: i.unitPrice,
        expectedLineTotal: i.lineTotal,
      }));

      const payloadPayments = payments.map((p) => ({
        paymentMethodId: p.paymentMethodId,
        amount: p.amount,
        receivedAmount: p.receivedAmount,
        changeAmount: p.changeAmount,
      }));

      const result: CompleteSaleResult = await completeSaleUseCase.execute({
        businessId,
        userId,
        userName,
        customerId: customerId || undefined,
        customerName,
        idempotencyKey: currentIdempotencyKey || generateUuid(),
        items: payloadItems,
        globalDiscount: globalDiscount
          ? {
              type: globalDiscount.type,
              value: globalDiscount.value,
            }
          : undefined,
        payments: payloadPayments,
        note: saleNote || note || undefined,
      });

      if (!result.success) {
        if (result.errorType === 'PRICE_CHANGED' && result.updatedPrices) {
          // Build price conflicts list for modal
          const conflictsList = result.updatedPrices.map((up) => {
            const matchedItem = items.find(
              (i) => i.productId === up.productId && (i.presentationId || null) === (up.presentationId || null)
            );
            return {
              productName: matchedItem?.productName || 'Producto',
              presentationName: matchedItem?.presentationName,
              previousPrice: matchedItem?.unitPrice || 0,
              newPrice: up.officialUnitPrice,
            };
          });

          updatePricesFromConflict(result.updatedPrices);
          setPriceConflicts(conflictsList);
          setIsCheckoutOpen(false);
          setIsPriceConflictModalOpen(true);
          return;
        }

        setCheckoutError(result.error || 'No se pudo completar la venta.');
        return;
      }

      // Successful sale: Close checkout, clear cart, open receipt modal, reload stocks
      setIsCheckoutOpen(false);
      setCheckoutError(null);
      clearCart();
      if (result.receipt) {
        setCompletedReceipt(result.receipt);
      }
      await loadData();
    } catch (err) {
      setCheckoutError(`Error inesperado al procesar la venta: ${String(err)}`);
    } finally {
      setIsSubmittingCheckout(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] p-4 lg:p-6 overflow-hidden max-w-[1920px] mx-auto w-full space-y-3">
      {/* Closed Cash Warning Banner */}
      {!activeCashSession && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 px-4 flex items-center justify-between gap-3 text-xs md:text-sm text-amber-500 shrink-0">
          <div className="flex items-center gap-2">
            <Lock size={16} className="shrink-0" />
            <span>
              <strong>Caja cerrada:</strong> Debes abrir un turno de caja para procesar cobros y registrar ventas.
            </span>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsOpenCashModalOpen(true)}
            className="shrink-0 flex items-center gap-1.5"
          >
            <LockOpen size={14} />
            <span>Abrir caja</span>
          </Button>
        </div>
      )}

      {/* Main Grid + Cart Panel Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 h-full overflow-hidden">
        {/* Left Area: Product Grid (65-70% on desktop) */}
        <div className="lg:col-span-8 xl:col-span-8 2xl:col-span-9 flex flex-col h-full overflow-hidden">
          <PosProductGrid
            products={products}
            presentations={presentations}
            categories={categories}
            stockMap={stockMap}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategoryId={selectedCategoryId}
            selectedFilterType={selectedFilterType}
            onSelectAllCategories={() => {
              setSelectedFilterType('ALL');
              setSelectedCategoryId(null);
            }}
            onSelectFeatured={() => {
              setSelectedFilterType('FEATURED');
              setSelectedCategoryId(null);
            }}
            onSelectCategory={(catId) => {
              setSelectedFilterType('CATEGORY');
              setSelectedCategoryId(catId);
            }}
            onSelectProduct={handleSelectProduct}
            onSelectPresentationRequest={handleOpenPresentationModal}
            onNavigateToCatalog={() => onNavigate('/products')}
            onNavigateToInventory={() => onNavigate('/inventory')}
          />
        </div>

        {/* Right Area: Lateral Cart Panel (Desktop) */}
        <div className="hidden lg:flex lg:col-span-4 xl:col-span-4 2xl:col-span-3 flex-col h-full overflow-hidden">
          <PosCartPanel
            onOpenCheckout={handleOpenCheckout}
            isCashOpen={Boolean(activeCashSession)}
            onOpenCash={() => setIsOpenCashModalOpen(true)}
          />
        </div>
      </div>

      {/* Mobile / Tablet Floating Cart Bar */}
      {/* Mobile Cart Floating Action */}
      {items.length > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full bg-brand-primary text-white p-4 rounded-2xl shadow-xl flex items-center justify-between font-bold"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} />
              <span>Ver Carrito ({items.length})</span>
            </div>
            <span className="text-lg">{formatMoney(total, currency)}</span>
          </button>
        </div>
      )}

      {/* Mobile Cart Sheet / Modal */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end p-2 sm:p-4">
          <div className="w-full max-h-[85vh] bg-surface rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-border-default">
            <div className="p-2 border-b border-border-default flex justify-end">
              <button
                type="button"
                onClick={() => setIsMobileCartOpen(false)}
                className="text-xs font-semibold text-text-secondary px-3 py-1.5 rounded-lg hover:bg-surface-secondary"
              >
                Cerrar vista
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <PosCartPanel
                onOpenCheckout={() => {
                  setIsMobileCartOpen(false);
                  handleOpenCheckout();
                }}
                isCashOpen={Boolean(activeCashSession)}
                onOpenCash={() => {
                  setIsMobileCartOpen(false);
                  setIsOpenCashModalOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Presentation Selection Modal */}
      <PosPresentationModal
        isOpen={Boolean(selectedProductForPres)}
        product={selectedProductForPres}
        presentations={availablePresForModal}
        stockScaled={selectedProductForPres ? stockMap.get(selectedProductForPres.id) || 0 : 0}
        onClose={() => setSelectedProductForPres(null)}
        onSelectBaseProduct={handleSelectBaseFromModal}
        onSelectPresentation={handleSelectPresFromModal}
      />

      {/* Checkout Modal */}
      <PosCheckoutModal
        isOpen={isCheckoutOpen}
        total={total}
        paymentMethods={paymentMethods}
        customerName={customerName}
        isSubmitting={isSubmittingCheckout}
        externalError={checkoutError}
        onClose={() => {
          setIsCheckoutOpen(false);
          setCheckoutError(null);
        }}
        onConfirmSale={handleConfirmSale}
      />

      {/* Receipt Completed Modal */}
      <PosReceiptModal
        isOpen={Boolean(completedReceipt)}
        receipt={completedReceipt}
        onClose={() => setCompletedReceipt(null)}
        onNewSale={() => setCompletedReceipt(null)}
      />

      {/* Price Changed Notification Modal */}
      <PosPriceChangedModal
        isOpen={isPriceConflictModalOpen}
        conflicts={priceConflicts}
        onAcknowledge={() => setIsPriceConflictModalOpen(false)}
      />

      {/* Open Cash Modal */}
      <OpenCashModal
        isOpen={isOpenCashModalOpen}
        onClose={() => setIsOpenCashModalOpen(false)}
        onConfirm={handleOpenCash}
        currency={currency}
        userName={userName}
        registerName="Caja principal"
      />
    </div>
  );
};

export const PosPage: React.FC<{ onNavigate: (route: string) => void }> = ({ onNavigate }) => {
  return (
    <CartProvider businessId="primary-business" userId="primary-user">
      <PosWorkspaceContent onNavigate={onNavigate} />
    </CartProvider>
  );
};
