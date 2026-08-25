import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Building2,
  DollarSign,
  Package,
  Boxes,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { PageContainer } from '../components/shell/PageContainer';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { DatePicker } from '../components/ui/DatePicker';
import { Supplier } from '../domain/purchases/Supplier';
import { Product } from '../domain/catalog/Product';
import { ProductPresentation } from '../domain/catalog/ProductPresentation';
import { ProductListItem } from '../domain/catalog/ProductRepository';
import { CreatePurchaseOrderItemDto } from '../domain/purchases/PurchaseOrder';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { ListSuppliers } from '../application/purchases/ListSuppliers';
import { CreatePurchaseOrder } from '../application/purchases/CreatePurchaseOrder';
import { QUANTITY_SCALE } from '../domain/common/quantity/Quantity';
import { generateUUID } from '../domain/common/IdGenerator';

interface NewPurchaseOrderPageProps {
  onBack: () => void;
  onSuccess: (orderId: string) => void;
}

interface OrderDraftLine {
  id: string; // Temporary local ID
  product: Product;
  presentationId: string | null;
  presentationName: string | null;
  presentationFactor: number;
  baseUnit: string;
  quantityInput: number; // e.g. 5
  unitCostInput: number; // Minor currency integer, e.g. 1500
  discountInput: number; // Minor currency integer
  lineTotal: number; // Minor currency integer
}

export const NewPurchaseOrderPage: React.FC<NewPurchaseOrderPageProps> = ({
  onBack,
  onSuccess,
}) => {
  const businessId = 'primary-business';
  const currencyCode = 'CLP';

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // Catalog data for product search
  const [products, setProducts] = useState<Product[]>([]);
  const [presentations, setPresentations] = useState<ProductPresentation[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

  // Draft Lines
  const [lines, setLines] = useState<OrderDraftLine[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load suppliers and products
  useEffect(() => {
    async function loadData() {
      try {
        const supplierRepo = repositoryFactory.getSupplierRepository();
        const productRepo = repositoryFactory.getProductRepository();
        const presentationRepo = repositoryFactory.getProductPresentationRepository();

        const [suppliersList, productsListResult] = await Promise.all([
          new ListSuppliers(supplierRepo).execute(businessId, false),
          productRepo.list({ businessId, status: 'active' }),
        ]);

        setSuppliers(suppliersList);
        if (suppliersList.length > 0) {
          setSelectedSupplierId(suppliersList[0].id);
        }
        setProducts(productsListResult.items.map((i: ProductListItem) => i.product));

        const allPresentations: ProductPresentation[] = [];
        for (const item of productsListResult.items) {
          const pList = await presentationRepo.listByProduct(item.product.id, businessId, true);
          allPresentations.push(...pList);
        }
        setPresentations(allPresentations);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos.');
      }
    }
    loadData();
  }, [businessId]);

  const handleAddProduct = (product: Product, presentation?: ProductPresentation) => {
    const factor = presentation ? presentation.unitFactor : 1;
    const presentationName = presentation ? presentation.name : null;
    const presentationId = presentation ? presentation.id : null;

    // Use catalog cost price if available, otherwise default to 0
    const defaultCost = product.costPrice ? product.costPrice * factor : 0;

    // Check if item with exact presentation already exists in draft
    const existingIndex = lines.findIndex(
      (l) => l.product.id === product.id && l.presentationId === presentationId
    );

    if (existingIndex !== -1) {
      // Increase quantity by 1
      const updatedLines = [...lines];
      const line = updatedLines[existingIndex];
      const newQty = line.quantityInput + 1;
      const newLineTotal = Math.max(
        0,
        Math.round((newQty * QUANTITY_SCALE * line.unitCostInput) / QUANTITY_SCALE) - line.discountInput
      );
      updatedLines[existingIndex] = {
        ...line,
        quantityInput: newQty,
        lineTotal: newLineTotal,
      };
      setLines(updatedLines);
    } else {
      const newLine: OrderDraftLine = {
        id: generateUUID(),
        product,
        presentationId,
        presentationName,
        presentationFactor: factor,
        baseUnit: product.baseUnit,
        quantityInput: 1,
        unitCostInput: defaultCost,
        discountInput: 0,
        lineTotal: defaultCost,
      };
      setLines([...lines, newLine]);
    }
    setProductSearch('');
    setIsSearchingProducts(false);
  };

  const handleUpdateLine = (
    lineId: string,
    updates: Partial<Pick<OrderDraftLine, 'quantityInput' | 'unitCostInput' | 'discountInput'>>
  ) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;

        const newQty = updates.quantityInput !== undefined ? updates.quantityInput : line.quantityInput;
        const newCost = updates.unitCostInput !== undefined ? updates.unitCostInput : line.unitCostInput;
        const newDisc = updates.discountInput !== undefined ? updates.discountInput : line.discountInput;

        const newLineTotal = Math.max(
          0,
          Math.round((newQty * QUANTITY_SCALE * newCost) / QUANTITY_SCALE) - newDisc
        );

        return {
          ...line,
          quantityInput: newQty,
          unitCostInput: newCost,
          discountInput: newDisc,
          lineTotal: newLineTotal,
        };
      })
    );
  };

  const handleRemoveLine = (lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  // Calculations
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const total = Math.max(0, subtotal - globalDiscount);

  const handleSubmit = async (targetStatus: 'DRAFT' | 'ORDERED') => {
    if (!selectedSupplierId) {
      setError('Debes seleccionar un proveedor.');
      return;
    }
    if (lines.length === 0) {
      setError('Debes agregar al menos un producto a la orden de compra.');
      return;
    }

    // Validate quantities
    for (const l of lines) {
      if (l.quantityInput <= 0) {
        setError(`La cantidad para "${l.product.name}" debe ser mayor a 0.`);
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const orderRepo = repositoryFactory.getPurchaseOrderRepository();
      const supplierRepo = repositoryFactory.getSupplierRepository();
      const createUseCase = new CreatePurchaseOrder(orderRepo, supplierRepo);

      const itemsDto: CreatePurchaseOrderItemDto[] = lines.map((l) => ({
        productId: l.product.id,
        presentationId: l.presentationId,
        productNameSnapshot: l.product.name,
        presentationNameSnapshot: l.presentationName,
        baseUnit: l.baseUnit,
        presentationFactor: l.presentationFactor,
        orderedQuantity: Math.round(l.quantityInput * QUANTITY_SCALE),
        unitCost: l.unitCostInput,
        discountTotal: l.discountInput,
        skuSnapshot: l.product.sku || null,
        barcodeSnapshot: l.product.barcode || null,
      }));

      const createdOrder = await createUseCase.execute(
        businessId,
        {
          supplierId: selectedSupplierId,
          currencyCode,
          expectedDate: expectedDate || null,
          note: note.trim() || null,
          discountTotal: globalDiscount,
          taxTotal: 0,
          items: itemsDto,
          status: targetStatus,
        },
        'primary-user',
        'José Pérez'
      );

      onSuccess(createdOrder.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la orden de compra.');
      setIsSubmitting(false);
    }
  };

  const filteredProducts = productSearch.trim()
    ? products.filter((p) => {
        const q = productSearch.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
        );
      })
    : [];

  return (
    <PageContainer maxWidth="default">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={onBack}
            aria-label="Volver a órdenes de compra"
          >
            <ArrowLeft size={16} />
            <span>Volver a órdenes</span>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Nueva Orden de Compra</h1>
            <p className="text-xs text-text-secondary">
              Planifica y solicita mercadería a tus proveedores comerciales.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="md"
            onClick={() => handleSubmit('DRAFT')}
            disabled={isSubmitting || lines.length === 0}
            className="flex-1 sm:flex-initial"
          >
            <span>Guardar borrador</span>
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => handleSubmit('ORDERED')}
            disabled={isSubmitting || lines.length === 0}
            className="flex-1 sm:flex-initial"
          >
            <CheckCircle2 size={16} />
            <span>Guardar y enviar orden</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 bg-danger-500/10 border border-danger-500/20 rounded-2xl text-danger-500 text-sm font-medium flex items-center gap-2">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Order Config & Products Search */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Details Card */}
          <Card className="p-5 space-y-4">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Building2 size={16} className="text-brand-primary" />
              Datos del Proveedor y Entrega
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Proveedor <span className="text-danger-500">*</span>
                </label>
                {suppliers.length === 0 ? (
                  <p className="text-xs text-danger-500 py-2">
                    No tienes proveedores activos. Registra un proveedor primero.
                  </p>
                ) : (
                  <Select
                    value={selectedSupplierId}
                    onChange={(val) => setSelectedSupplierId(val)}
                    options={suppliers.map((s) => ({
                      value: s.id,
                      label: `${s.name} ${s.taxId ? `(${s.taxId})` : ''}`,
                    }))}
                    placeholder="Seleccionar proveedor..."
                  />
                )}
              </div>

              <div>
                <DatePicker
                  label="Fecha Esperada de Entrega"
                  value={expectedDate}
                  onChange={setExpectedDate}
                  placeholder="Seleccionar fecha..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Notas / Instrucciones al Proveedor
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Horario de recepción, condiciones de pago o referencia de cotización..."
                rows={2}
                className="w-full px-3.5 py-2.5 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm focus:outline-none focus:border-brand-primary transition-colors resize-none"
              />
            </div>
          </Card>

          {/* Product Search Card */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <Package size={16} className="text-brand-primary" />
                Agregar Productos a la Orden
              </h2>
              <span className="text-xs text-text-tertiary">
                {lines.length} producto{lines.length !== 1 ? 's' : ''} en la orden
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary"
              />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setIsSearchingProducts(true);
                }}
                onFocus={() => setIsSearchingProducts(true)}
                placeholder="Buscar producto por nombre, SKU o código de barras..."
                className="w-full pl-10 pr-4 py-2.5 bg-surface-secondary border border-border-default rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-primary transition-colors"
              />

              {/* Product Results Dropdown */}
              {isSearchingProducts && productSearch.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-border-strong rounded-2xl shadow-2xl z-20 max-h-64 overflow-y-auto divide-y divide-border-subtle">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-text-tertiary">
                      No se encontraron productos coincidentes.
                    </div>
                  ) : (
                    filteredProducts.map((p) => {
                      const prodPresentations = presentations.filter(
                        (pr) => pr.productId === p.id && pr.active
                      );
                      return (
                        <div key={p.id} className="p-3 hover:bg-surface-secondary transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="font-semibold text-sm text-text-primary">{p.name}</div>
                              <div className="text-xs text-text-tertiary flex items-center gap-2 mt-0.5">
                                <span>Unidad base: {p.baseUnit}</span>
                                {p.sku && <span>SKU: {p.sku}</span>}
                                {p.costPrice ? (
                                  <span>Costo ref: ${p.costPrice.toLocaleString('es-CL')}</span>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleAddProduct(p)}
                              >
                                <Plus size={14} />
                                <span>{p.baseUnit}</span>
                              </Button>
                              {prodPresentations.map((pr) => (
                                <Button
                                  key={pr.id}
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleAddProduct(p, pr)}
                                >
                                  <Boxes size={14} />
                                  <span>{pr.name} (x{pr.unitFactor})</span>
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Lines Table */}
            {lines.length === 0 ? (
              <div className="p-8 border border-dashed border-border-default rounded-xl text-center text-text-tertiary text-xs">
                Usa el buscador para agregar los productos que necesitas comprar.
              </div>
            ) : (
              <div className="border border-border-default rounded-xl overflow-hidden divide-y divide-border-subtle">
                {lines.map((line, index) => (
                  <div
                    key={line.id}
                    className="p-3.5 bg-surface-secondary/20 hover:bg-surface-secondary/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-text-tertiary">#{index + 1}</span>
                        <h4 className="font-semibold text-text-primary text-sm truncate">
                          {line.product.name}
                        </h4>
                        {line.presentationName && (
                          <span className="px-2 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary text-xs font-semibold">
                            {line.presentationName} (x{line.presentationFactor})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        Base: {line.baseUnit} • Equivalente:{' '}
                        <span className="font-mono text-text-secondary font-semibold">
                          {(line.quantityInput * line.presentationFactor).toLocaleString('es-CL')}{' '}
                          {line.baseUnit}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap justify-between sm:justify-end">
                      {/* Quantity Input */}
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-text-tertiary">Cant:</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={line.quantityInput}
                          onChange={(e) =>
                            handleUpdateLine(line.id, {
                              quantityInput: Math.max(1, parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-16 px-2 py-1 bg-surface border border-border-default rounded-lg text-sm text-text-primary text-center font-mono focus:outline-none focus:border-brand-primary"
                        />
                      </div>

                      {/* Unit Cost Input */}
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-text-tertiary">Costo:</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={line.unitCostInput}
                            onChange={(e) =>
                              handleUpdateLine(line.id, {
                                unitCostInput: Math.max(0, parseInt(e.target.value, 10) || 0),
                              })
                            }
                            className="w-24 pl-5 pr-2 py-1 bg-surface border border-border-default rounded-lg text-sm text-text-primary text-right font-mono focus:outline-none focus:border-brand-primary"
                          />
                        </div>
                      </div>

                      {/* Line Subtotal */}
                      <div className="w-24 text-right">
                        <span className="font-bold text-text-primary text-sm font-mono">
                          ${line.lineTotal.toLocaleString('es-CL')}
                        </span>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(line.id)}
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-danger-500 hover:bg-danger-500/10 transition-colors"
                        aria-label="Eliminar producto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Order Summary & Totals */}
        <div className="space-y-6">
          <Card className="p-5 space-y-4 sticky top-6">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-500" />
              Resumen Económico
            </h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between text-text-secondary">
                <span>Subtotal ({lines.length} líneas)</span>
                <span className="font-mono font-medium text-text-primary">
                  ${subtotal.toLocaleString('es-CL')}
                </span>
              </div>

              <div className="flex items-center justify-between text-text-secondary">
                <span>Descuento global</span>
                <div className="relative w-28">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={globalDiscount}
                    onChange={(e) => setGlobalDiscount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full pl-5 pr-2 py-1 bg-surface-secondary border border-border-default rounded-lg text-xs text-text-primary text-right font-mono focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border-default flex items-center justify-between">
                <span className="font-bold text-text-primary text-base">Total Orden</span>
                <span className="font-black text-xl text-emerald-500 font-mono">
                  ${total.toLocaleString('es-CL')}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-border-default space-y-2.5">
              <Button
                variant="primary"
                size="lg"
                onClick={() => handleSubmit('ORDERED')}
                disabled={isSubmitting || lines.length === 0}
                className="w-full"
              >
                <CheckCircle2 size={16} />
                <span>{isSubmitting ? 'Procesando...' : 'Guardar y enviar orden'}</span>
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => handleSubmit('DRAFT')}
                disabled={isSubmitting || lines.length === 0}
                className="w-full"
              >
                <span>Guardar como borrador</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
};
