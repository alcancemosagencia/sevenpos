import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  DollarSign,
  PackageCheck,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
} from 'lucide-react';
import { PageContainer } from '../components/shell/PageContainer';
import { PageHeader } from '../components/shell/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { EmptyState } from '../components/ui/EmptyState';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from '../domain/purchases/PurchaseOrder';
import { Supplier } from '../domain/purchases/Supplier';
import { PurchaseKPIMetrics } from '../domain/purchases/repositories/PurchaseQueryRepository';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { ListPurchaseOrders } from '../application/purchases/ListPurchaseOrders';
import { ListSuppliers } from '../application/purchases/ListSuppliers';

interface PurchasesOrdersPageProps {
  onNavigateToNewOrder: () => void;
  onNavigateToOrderDetail: (orderId: string) => void;
}

export const PurchasesOrdersPage: React.FC<PurchasesOrdersPageProps> = ({
  onNavigateToNewOrder,
  onNavigateToOrderDetail,
}) => {
  const businessId = 'primary-business';

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [metrics, setMetrics] = useState<PurchaseKPIMetrics>({
    openOrdersCount: 0,
    pendingReceiptsCount: 0,
    receivedThisMonthCount: 0,
    purchasesTotalThisMonth: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const orderRepo = repositoryFactory.getPurchaseOrderRepository();
        const queryRepo = repositoryFactory.getPurchaseQueryRepository();
        const supplierRepo = repositoryFactory.getSupplierRepository();

        const [ordersList, kpiData, suppliersList] = await Promise.all([
          new ListPurchaseOrders(orderRepo).execute(businessId),
          queryRepo.getKPIMetrics(businessId),
          new ListSuppliers(supplierRepo).execute(businessId, true),
        ]);

        if (isMounted) {
          setOrders(ordersList);
          setMetrics(kpiData);
          setSuppliers(suppliersList);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error al cargar órdenes de compra.');
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [businessId]);

  const getSupplierName = (supplierId: string) => {
    const s = suppliers.find((sup) => sup.id === supplierId);
    return s ? s.name : 'Proveedor desconocido';
  };

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/10 text-text-tertiary border border-border-default">
            <Clock size={12} /> Borrador
          </span>
        );
      case 'ORDERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
            <Truck size={12} /> Por recibir
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <PackageCheck size={12} /> Parcial
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 size={12} /> Recibida
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-danger-500/10 text-danger-500 border border-danger-500/20">
            <XCircle size={12} /> Cancelada
          </span>
        );
      default:
        return null;
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (selectedStatus !== 'all' && o.status !== selectedStatus) return false;
    if (selectedSupplierId !== 'all' && o.supplierId !== selectedSupplierId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = o.orderNumber.toLowerCase().includes(q);
      const matchSupplier = getSupplierName(o.supplierId).toLowerCase().includes(q);
      const matchNote = o.note?.toLowerCase().includes(q) || false;
      return matchNumber || matchSupplier || matchNote;
    }
    return true;
  });

  return (
    <PageContainer maxWidth="default">
      <PageHeader
        title="Órdenes de Compra"
        subtitle="Administra tus pedidos a proveedores, recepciones físicas y trazabilidad de costos."
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={onNavigateToNewOrder}
          >
            <Plus size={16} />
            <span>Nueva orden de compra</span>
          </Button>
        }
      />

      {/* KPI Cards (Max 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Órdenes Abiertas
            </p>
            <p className="text-2xl font-bold text-text-primary">{metrics.openOrdersCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
            <ClipboardList size={20} />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Por Recibir
            </p>
            <p className="text-2xl font-bold text-amber-500">{metrics.pendingReceiptsCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Truck size={20} />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Recibidas Este Mes
            </p>
            <p className="text-2xl font-bold text-emerald-500">{metrics.receivedThisMonthCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <PackageCheck size={20} />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Compras del Mes
            </p>
            <p className="text-2xl font-bold text-text-primary font-mono">
              ${metrics.purchasesTotalThisMonth.toLocaleString('es-CL')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <DollarSign size={20} />
          </div>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por N° de orden, proveedor o nota..."
            className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-border-default rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-44">
            <Select
              value={selectedStatus}
              onChange={(val) => setSelectedStatus(val)}
              options={[
                { value: 'all', label: 'Todos los estados' },
                { value: 'DRAFT', label: 'Borrador' },
                { value: 'ORDERED', label: 'Por recibir' },
                { value: 'PARTIALLY_RECEIVED', label: 'Parcialmente recibida' },
                { value: 'RECEIVED', label: 'Recibida' },
                { value: 'CANCELLED', label: 'Cancelada' },
              ]}
              placeholder="Estado..."
            />
          </div>

          <div className="w-48">
            <Select
              value={selectedSupplierId}
              onChange={(val) => setSelectedSupplierId(val)}
              options={[
                { value: 'all', label: 'Todos los proveedores' },
                ...suppliers.map((s) => ({ value: s.id, label: s.name })),
              ]}
              placeholder="Proveedor..."
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-12 text-center text-text-secondary">
          Cargando órdenes de compra...
        </div>
      ) : error ? (
        <div className="p-4 bg-danger-500/10 border border-danger-500/20 rounded-2xl text-danger-500 text-sm">
          {error}
        </div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={24} />}
          title={searchQuery || selectedStatus !== 'all' ? 'No se encontraron órdenes' : 'Aún no tienes órdenes de compra'}
          description={
            searchQuery || selectedStatus !== 'all'
              ? 'Intenta con otros filtros o términos de búsqueda.'
              : 'Crea tu primera orden de compra para abastecer tu inventario de forma controlada.'
          }
          action={
            <Button
              variant="primary"
              size="md"
              onClick={onNavigateToNewOrder}
            >
              <Plus size={16} />
              <span>Nueva orden de compra</span>
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-surface border border-border-strong rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border-default bg-surface-secondary/40 text-text-tertiary text-xs uppercase font-semibold">
                  <th className="py-3.5 px-4">Orden</th>
                  <th className="py-3.5 px-4">Proveedor</th>
                  <th className="py-3.5 px-4">Fecha Emisión</th>
                  <th className="py-3.5 px-4">Fecha Esperada</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-right">Total</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => onNavigateToOrderDetail(order.id)}
                    className="hover:bg-surface-secondary/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-text-primary text-sm">
                      {order.orderNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-text-primary">
                        {getSupplierName(order.supplierId)}
                      </div>
                      {order.note && (
                        <div className="text-xs text-text-tertiary truncate max-w-xs">
                          {order.note}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-text-secondary">
                      {new Date(order.createdAt).toLocaleDateString('es-CL')}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-text-secondary">
                      {order.expectedDate || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">{getStatusBadge(order.status)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-text-primary">
                      ${order.total.toLocaleString('es-CL')}
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onNavigateToOrderDetail(order.id)}
                        aria-label={`Ver orden ${order.orderNumber}`}
                      >
                        <Eye size={14} />
                        <span>Detalle</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredOrders.map((order) => (
              <Card
                key={order.id}
                onClick={() => onNavigateToOrderDetail(order.id)}
                className="p-4 space-y-3 cursor-pointer hover:border-brand-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-text-primary text-base">
                      {order.orderNumber}
                    </span>
                    <h4 className="font-semibold text-text-secondary text-sm mt-0.5">
                      {getSupplierName(order.supplierId)}
                    </h4>
                  </div>
                  <div>{getStatusBadge(order.status)}</div>
                </div>

                <div className="flex items-center justify-between text-xs text-text-tertiary pt-2 border-t border-border-subtle">
                  <span>{new Date(order.createdAt).toLocaleDateString('es-CL')}</span>
                  <span className="font-mono font-bold text-sm text-text-primary">
                    ${order.total.toLocaleString('es-CL')}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
};
