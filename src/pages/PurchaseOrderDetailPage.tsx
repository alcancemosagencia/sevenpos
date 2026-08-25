import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building2,
  DollarSign,
  Package,
  PackageCheck,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { PageContainer } from '../components/shell/PageContainer';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ReceiveGoodsModal } from '../features/purchases/components/ReceiveGoodsModal';
import {
  PurchaseOrderWithDetails,
  PurchaseOrderStatus,
} from '../domain/purchases/PurchaseOrder';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { GetPurchaseOrderDetail } from '../application/purchases/GetPurchaseOrderDetail';
import { SubmitPurchaseOrder, CancelPurchaseOrder } from '../application/purchases/SubmitPurchaseOrder';
import { QUANTITY_SCALE } from '../domain/common/quantity/Quantity';

interface PurchaseOrderDetailPageProps {
  orderId: string;
  onBack: () => void;
  onNavigateToInventory?: () => void;
}

export const PurchaseOrderDetailPage: React.FC<PurchaseOrderDetailPageProps> = ({
  orderId,
  onBack,
  onNavigateToInventory,
}) => {
  const businessId = 'primary-business';

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<PurchaseOrderWithDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const orderRepo = repositoryFactory.getPurchaseOrderRepository();
        const getDetailUseCase = new GetPurchaseOrderDetail(orderRepo);
        const data = await getDetailUseCase.execute(businessId, orderId);
        if (isMounted) {
          if (!data) {
            setError('Orden de compra no encontrada.');
          } else {
            setOrder(data);
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error al cargar detalle de la orden.');
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [businessId, orderId, refreshTrigger]);

  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSubmitOrder = async () => {
    if (!order) return;
    setIsActionLoading(true);
    setActionError(null);
    try {
      const orderRepo = repositoryFactory.getPurchaseOrderRepository();
      const supplierRepo = repositoryFactory.getSupplierRepository();
      const submitUseCase = new SubmitPurchaseOrder(orderRepo, supplierRepo);
      await submitUseCase.execute(businessId, order.id);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al enviar orden.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmCancelOrder = async () => {
    if (!order) return;
    setIsActionLoading(true);
    setActionError(null);
    try {
      const orderRepo = repositoryFactory.getPurchaseOrderRepository();
      const cancelUseCase = new CancelPurchaseOrder(orderRepo);
      await cancelUseCase.execute(businessId, order.id);
      setIsCancelConfirmOpen(false);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al cancelar la orden.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelOrder = () => {
    setIsCancelConfirmOpen(true);
  };

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-text-tertiary border border-border-default">
            <Clock size={13} /> Borrador
          </span>
        );
      case 'ORDERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
            <Truck size={13} /> Enviada / Por recibir
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <PackageCheck size={13} /> Parcialmente recibida
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 size={13} /> Recibida
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-danger-500/10 text-danger-500 border border-danger-500/20">
            <XCircle size={13} /> Cancelada
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <PageContainer maxWidth="default">
        <div className="p-12 text-center text-text-secondary">
          Cargando detalle de la orden de compra...
        </div>
      </PageContainer>
    );
  }

  if (error || !order) {
    return (
      <PageContainer maxWidth="default">
        <div className="space-y-4">
          <Button variant="secondary" size="sm" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>Volver a órdenes</span>
          </Button>
          <div className="p-6 bg-danger-500/10 border border-danger-500/20 rounded-2xl text-danger-500">
            {error || 'Orden no encontrada.'}
          </div>
        </div>
      </PageContainer>
    );
  }

  const hasPendingItems = order.items.some((it) => it.pendingQuantity > 0);

  return (
    <PageContainer maxWidth="default">
      {/* Top Toolbar */}
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
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-text-primary font-mono">{order.orderNumber}</h1>
            {getStatusBadge(order.status)}
          </div>
        </div>

        {/* Primary Action by Status */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {order.status === 'DRAFT' && (
            <>
              <Button
                variant="secondary"
                size="md"
                onClick={handleCancelOrder}
                disabled={isActionLoading}
                className="hover:text-danger-500"
              >
                <span>Cancelar</span>
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSubmitOrder}
                disabled={isActionLoading}
              >
                <CheckCircle2 size={16} />
                <span>Marcar como enviada</span>
              </Button>
            </>
          )}

          {order.status === 'ORDERED' && (
            <>
              <Button
                variant="secondary"
                size="md"
                onClick={handleCancelOrder}
                disabled={isActionLoading}
                className="hover:text-danger-500"
              >
                <span>Cancelar</span>
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsReceiveModalOpen(true)}
              >
                <PackageCheck size={16} />
                <span>Recibir mercadería</span>
              </Button>
            </>
          )}

          {order.status === 'PARTIALLY_RECEIVED' && hasPendingItems && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsReceiveModalOpen(true)}
            >
              <PackageCheck size={16} />
              <span>Recibir saldo pendiente</span>
            </Button>
          )}

          {order.status === 'RECEIVED' && onNavigateToInventory && (
            <Button
              variant="secondary"
              size="md"
              onClick={onNavigateToInventory}
            >
              <Package size={16} />
              <span>Ver en inventario</span>
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="mb-6 p-4 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-sm font-medium flex items-center justify-between">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-status-danger hover:underline text-xs"
          >
            Descartar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Order Information & Products List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier & Header Info Card */}
          <Card className="p-5 space-y-4">
            <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Building2 size={16} className="text-brand-primary" />
              Información de la Orden y Proveedor
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-text-tertiary">Proveedor</p>
                <p className="font-bold text-text-primary text-base">{order.supplier.name}</p>
                {order.supplier.taxId && (
                  <p className="text-xs font-mono text-text-secondary">{order.supplier.taxId}</p>
                )}
                {order.supplier.contactName && (
                  <p className="text-xs text-text-secondary mt-1">
                    Contacto: {order.supplier.contactName}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <div>
                  <span className="text-xs text-text-tertiary">Fecha de emisión: </span>
                  <span className="text-text-primary text-xs font-mono">
                    {new Date(order.createdAt).toLocaleDateString('es-CL')}
                  </span>
                </div>
                {order.expectedDate && (
                  <div>
                    <span className="text-xs text-text-tertiary">Fecha esperada: </span>
                    <span className="text-brand-primary text-xs font-semibold font-mono">
                      {order.expectedDate}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-xs text-text-tertiary">Creada por: </span>
                  <span className="text-text-secondary text-xs">{order.createdByNameSnapshot}</span>
                </div>
              </div>
            </div>

            {order.note && (
              <div className="p-3 bg-surface-secondary/40 border border-border-subtle rounded-xl text-xs text-text-secondary">
                <span className="font-semibold text-text-primary">Nota: </span>
                {order.note}
              </div>
            )}
          </Card>

          {/* Ordered Products Table */}
          <Card className="p-5 space-y-4">
            <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Package size={16} className="text-brand-primary" />
              Productos Solicitados ({order.items.length})
            </h2>

            <div className="border border-border-default rounded-xl overflow-hidden divide-y divide-border-subtle">
              {order.items.map((item) => {
                const orderedQty = item.orderedQuantity / QUANTITY_SCALE;
                const receivedQty = item.receivedQuantity / QUANTITY_SCALE;
                const pendingQty = item.pendingQuantity / QUANTITY_SCALE;
                const isLineComplete = pendingQty === 0;

                return (
                  <div
                    key={item.id}
                    className="p-4 bg-surface-secondary/20 hover:bg-surface-secondary/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-text-primary text-sm truncate">
                          {item.productNameSnapshot}
                        </h4>
                        {item.presentationNameSnapshot && (
                          <span className="px-2 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary text-xs font-semibold">
                            {item.presentationNameSnapshot} (x{item.presentationFactor})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        Base: {item.baseUnit} • Costo unitario:{' '}
                        <span className="font-mono text-text-secondary font-semibold">
                          ${item.unitCost.toLocaleString('es-CL')}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap justify-between sm:justify-end text-right text-xs">
                      <div>
                        <p className="text-text-tertiary">Pedido</p>
                        <p className="font-bold text-text-primary font-mono text-sm">
                          {orderedQty.toLocaleString('es-CL')}
                        </p>
                      </div>

                      <div>
                        <p className="text-text-tertiary">Recibido</p>
                        <p
                          className={`font-bold font-mono text-sm ${
                            receivedQty > 0 ? 'text-emerald-500' : 'text-text-tertiary'
                          }`}
                        >
                          {receivedQty.toLocaleString('es-CL')}
                        </p>
                      </div>

                      <div>
                        <p className="text-text-tertiary">Pendiente</p>
                        <p
                          className={`font-bold font-mono text-sm ${
                            isLineComplete ? 'text-text-tertiary' : 'text-amber-500'
                          }`}
                        >
                          {pendingQty.toLocaleString('es-CL')}
                        </p>
                      </div>

                      <div className="w-24 text-right">
                        <p className="text-text-tertiary">Total Línea</p>
                        <p className="font-bold text-text-primary font-mono text-sm">
                          ${item.lineTotal.toLocaleString('es-CL')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Physical Receipts History */}
          {order.receipts.length > 0 && (
            <Card className="p-5 space-y-4">
              <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <PackageCheck size={16} className="text-emerald-500" />
                Historial de Recepciones Físicas ({order.receipts.length})
              </h2>

              <div className="space-y-3">
                {order.receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="p-4 bg-surface-secondary/40 border border-border-default rounded-xl space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold font-mono text-sm text-text-primary">
                          {receipt.receiptNumber}
                        </span>
                        <span className="text-xs text-text-tertiary">
                          {new Date(receipt.receivedAt).toLocaleString('es-CL')}
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary">
                        Recibido por: <span className="font-medium text-text-primary">{receipt.receivedByNameSnapshot}</span>
                      </div>
                    </div>

                    {receipt.note && (
                      <p className="text-xs text-text-secondary italic">
                        &quot;{receipt.note}&quot;
                      </p>
                    )}

                    <div className="space-y-1 text-xs">
                      {receipt.items.map((ri) => {
                        const qty = ri.receivedQuantity / QUANTITY_SCALE;
                        const baseQty = ri.baseQuantity / QUANTITY_SCALE;
                        return (
                          <div
                            key={ri.id}
                            className="flex items-center justify-between text-text-secondary py-1 border-b border-border-subtle/50 last:border-0"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-text-primary">
                                +{qty.toLocaleString('es-CL')} unid.
                              </span>
                              <span className="text-text-tertiary">
                                (+{baseQty.toLocaleString('es-CL')} base)
                              </span>
                              {ri.lotCodeSnapshot && (
                                <span className="px-1.5 py-0.5 rounded bg-surface border border-border-default text-text-secondary font-mono text-[11px]">
                                  Lote: {ri.lotCodeSnapshot}
                                </span>
                              )}
                              {ri.expirationDateSnapshot && (
                                <span className="text-text-tertiary text-[11px]">
                                  Vence: {ri.expirationDateSnapshot}
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-text-primary font-semibold">
                              ${ri.lineCostTotal.toLocaleString('es-CL')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Order Financial Summary */}
        <div className="space-y-6">
          <Card className="p-5 space-y-4 sticky top-6">
            <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-500" />
              Resumen Económico
            </h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between text-text-secondary">
                <span>Subtotal</span>
                <span className="font-mono font-medium text-text-primary">
                  ${order.subtotal.toLocaleString('es-CL')}
                </span>
              </div>

              {order.discountTotal > 0 && (
                <div className="flex items-center justify-between text-text-secondary">
                  <span>Descuento</span>
                  <span className="font-mono font-medium text-danger-500">
                    -${order.discountTotal.toLocaleString('es-CL')}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-border-default flex items-center justify-between">
                <span className="font-bold text-text-primary text-base">Total Orden</span>
                <span className="font-black text-xl text-emerald-500 font-mono">
                  ${order.total.toLocaleString('es-CL')}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-border-default space-y-2 text-xs text-text-tertiary">
              <p>
                • Moneda: <span className="font-semibold text-text-secondary">{order.currencyCode}</span>
              </p>
              <p>
                • Trazabilidad: <span className="font-mono text-text-secondary">{order.id}</span>
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Receive Goods Modal */}
      {isReceiveModalOpen && (
        <ReceiveGoodsModal
          isOpen={isReceiveModalOpen}
          onClose={() => setIsReceiveModalOpen(false)}
          order={order}
          onSuccess={async () => setRefreshTrigger((prev) => prev + 1)}
        />
      )}

      {/* Cancel Order Confirm Modal */}
      <ConfirmModal
        isOpen={isCancelConfirmOpen}
        title="¿Cancelar orden de compra?"
        description="Esta acción cancelará la orden de compra definitivamente. No se registrará el ingreso de mercadería a inventario."
        confirmLabel="Sí, cancelar orden"
        cancelLabel="Volver"
        variant="danger"
        isLoading={isActionLoading}
        onConfirm={handleConfirmCancelOrder}
        onClose={() => setIsCancelConfirmOpen(false)}
      />
    </PageContainer>
  );
};
