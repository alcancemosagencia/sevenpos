import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Plus,
  ArrowDownUp,
  Trash2,
  Calendar,
  Layers,
  Activity,
  Package,
  AlertTriangle,
  Coins,
  Wallet,
} from 'lucide-react';
import { PageContainer } from '../components/shell/PageContainer';
import { PageHeader } from '../components/shell/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { GetProductStock, ProductInventoryDetail } from '../application/inventory/GetProductStock';
import { useCountry } from '../context/CountryContext';
import { formatQuantity } from '../domain/common/quantity/Quantity';
import { AddInventoryModal } from '../features/inventory/components/AddInventoryModal';
import { AdjustInventoryModal } from '../features/inventory/components/AdjustInventoryModal';
import { WasteModal } from '../features/inventory/components/WasteModal';

interface ProductInventoryDetailPageProps {
  productId: string;
  onBack: () => void;
}

export const ProductInventoryDetailPage: React.FC<ProductInventoryDetailPageProps> = ({
  productId,
  onBack,
}) => {
  const businessId = 'primary-business';
  const { formatMoney } = useCountry();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ProductInventoryDetail | null>(null);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [wasteModalOpen, setWasteModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const productRepo = repositoryFactory.getProductRepository();
      const categoryRepo = repositoryFactory.getCategoryRepository();
      const movementRepo = repositoryFactory.getInventoryMovementRepository();
      const lotRepo = repositoryFactory.getInventoryLotRepository();

      const getStock = new GetProductStock(productRepo, categoryRepo, movementRepo, lotRepo);
      const res = await getStock.execute(productId, businessId);
      setDetail(res);
    } catch (err) {
      console.error('Error loading product inventory detail:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId, productId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  if (loading || !detail) {
    return (
      <PageContainer>
        <div className="py-16 text-center text-text-tertiary text-sm flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
          <span>Cargando detalle de existencias...</span>
        </div>
      </PageContainer>
    );
  }

  const { product, currentStock, minimumStock, status, costState, lots, unallocatedStock, recentMovements } = detail;
  const baseUnit = product.baseUnit;

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title={product.name}
        subtitle="Detalle de existencias, desglose por lotes y auditoría de movimientos."
        actions={
          <div className="flex items-center gap-2 sm:gap-2.5">
            <Button
              variant="ghost"
              size="md"
              leftIcon={<ArrowLeft size={16} />}
              onClick={onBack}
              className="text-text-secondary hover:text-text-primary"
            >
              <span>Volver</span>
            </Button>

            <Button
              variant="secondary"
              size="md"
              leftIcon={<ArrowDownUp size={16} />}
              onClick={() => setAdjustModalOpen(true)}
            >
              <span>Ajustar</span>
            </Button>

            <Button
              variant="secondary"
              size="md"
              leftIcon={<Trash2 size={16} />}
              onClick={() => setWasteModalOpen(true)}
              className="text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30"
            >
              <span>Merma</span>
            </Button>

            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus size={16} />}
              onClick={() => setAddModalOpen(true)}
            >
              <span>Agregar inventario</span>
            </Button>
          </div>
        }
      />

      {/* 4 SevenPOS Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4 my-5">
        {/* 1. Stock Actual */}
        <Card variant="default" padding="sm" className="p-3.5 sm:p-4 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-[var(--radius-button)] bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                <Package size={16} strokeWidth={2} />
              </div>
              <span className="text-xs sm:text-sm font-medium text-text-secondary">
                Stock actual
              </span>
            </div>
            {status === 'AVAILABLE' && (
              <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Disponible
              </span>
            )}
            {status === 'LOW_STOCK' && (
              <span className="text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Bajo
              </span>
            )}
            {status === 'OUT_OF_STOCK' && (
              <span className="text-[11px] font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                Agotado
              </span>
            )}
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary font-mono">
              {formatQuantity(currentStock, baseUnit)}
            </p>
          </div>
        </Card>

        {/* 2. Stock Mínimo */}
        <Card variant="default" padding="sm" className="p-3.5 sm:p-4 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-[var(--radius-button)] bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <AlertTriangle size={16} strokeWidth={2} />
              </div>
              <span className="text-xs sm:text-sm font-medium text-text-secondary">
                Stock mínimo
              </span>
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-text-secondary font-mono">
              {minimumStock !== null && minimumStock !== undefined
                ? formatQuantity(minimumStock, baseUnit)
                : 'Sin límite'}
            </p>
          </div>
        </Card>

        {/* 3. Costo Unitario */}
        <Card variant="default" padding="sm" className="p-3.5 sm:p-4 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-[var(--radius-button)] bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                <Coins size={16} strokeWidth={2} />
              </div>
              <span className="text-xs sm:text-sm font-medium text-text-secondary">
                Costo unitario
              </span>
            </div>
            <span className="text-[11px] font-semibold text-text-tertiary">
              {costState.costQuality === 'REAL' ? 'Costo promedio' : 'Referencial'}
            </span>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary font-mono">
              {costState.averageUnitCost ? formatMoney(costState.averageUnitCost) : '—'}
            </p>
          </div>
        </Card>

        {/* 4. Valoración Total */}
        <Card variant="default" padding="sm" className="p-3.5 sm:p-4 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-[var(--radius-button)] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                <Wallet size={16} strokeWidth={2} />
              </div>
              <span className="text-xs sm:text-sm font-medium text-text-secondary">
                Valoración total
              </span>
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-500 font-mono">
              {costState.inventoryValue ? formatMoney(costState.inventoryValue) : formatMoney(0)}
            </p>
          </div>
        </Card>
      </div>

      {/* Lot Distribution Section */}
      <Card variant="default" padding="md" className="p-4 sm:p-5 space-y-4 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-brand-primary" />
            <h3 className="text-sm font-bold text-text-primary">Distribución por lotes y vencimiento</h3>
          </div>
          <span className="text-xs font-mono text-text-secondary">
            Total reconciliado: <strong className="text-text-primary">{formatQuantity(currentStock, baseUnit)}</strong>
          </span>
        </div>

        {lots.length === 0 ? (
          <div className="py-5 px-4 rounded-xl bg-surface-secondary/40 border border-border-default text-xs text-text-secondary text-center">
            Este producto no posee lotes específicos. Todas las existencias corresponden a <strong>Stock General</strong> ({formatQuantity(currentStock, baseUnit)}).
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border-default">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-default/80 bg-surface-secondary/50 text-text-secondary text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-4">Código de lote</th>
                  <th className="py-2.5 px-4">Fecha de vencimiento</th>
                  <th className="py-2.5 px-4 text-center">Estado del lote</th>
                  <th className="py-2.5 px-4 text-right">Stock en lote</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/50">
                {lots.map((l) => (
                  <tr key={l.id} className="hover:bg-surface-hover/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-text-primary">
                      {l.lotCode || 'Lote sin código'}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {l.expirationDate ? (
                        <span className="flex items-center gap-1.5 font-mono text-xs">
                          <Calendar size={13} className="text-text-tertiary" /> {l.expirationDate}
                        </span>
                      ) : (
                        <span className="text-text-tertiary italic">Sin fecha</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {l.status === 'ACTIVE' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Activo
                        </span>
                      )}
                      {l.status === 'EXPIRED' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                          Vencido
                        </span>
                      )}
                      {l.status === 'DEPLETED' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-secondary text-text-tertiary border border-border-default">
                          Agotado
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-text-primary text-sm">
                      {formatQuantity(l.currentStock, baseUnit)}
                    </td>
                  </tr>
                ))}

                {/* Unallocated stock row */}
                {unallocatedStock > 0 && (
                  <tr className="bg-surface-secondary/20">
                    <td className="py-3 px-4 italic text-text-secondary font-medium" colSpan={3}>
                      Existencias sin lote asignado (Stock general)
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-text-secondary text-sm">
                      {formatQuantity(unallocatedStock, baseUnit)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Recent Movements Section */}
      <Card variant="default" padding="md" className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-brand-primary" />
          <h3 className="text-sm font-bold text-text-primary">Historial de movimientos</h3>
        </div>

        {recentMovements.length === 0 ? (
          <div className="py-8 text-center text-xs text-text-tertiary">
            Sin movimientos registrados para este producto.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border-default">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-default/80 bg-surface-secondary/50 text-text-secondary text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-4">Fecha</th>
                  <th className="py-2.5 px-4">Tipo</th>
                  <th className="py-2.5 px-4 text-right">Cantidad</th>
                  <th className="py-2.5 px-4 text-right">Costo unitario</th>
                  <th className="py-2.5 px-4">Motivo / Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/50">
                {recentMovements.map((m) => {
                  const isPositive = m.quantityDelta > 0;
                  return (
                    <tr key={m.id} className="hover:bg-surface-hover/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-text-secondary whitespace-nowrap">
                        {new Date(m.occurredAt).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-bold text-xs whitespace-nowrap">
                        {m.movementType === 'OPENING' && <span className="text-brand-primary">Apertura</span>}
                        {m.movementType === 'ENTRY' && <span className="text-emerald-500">+ Entrada</span>}
                        {m.movementType === 'WASTE' && <span className="text-rose-500">- Merma</span>}
                        {m.movementType === 'ADJUSTMENT_IN' && <span className="text-emerald-500">+ Ajuste</span>}
                        {m.movementType === 'ADJUSTMENT_OUT' && <span className="text-amber-500">- Ajuste</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm whitespace-nowrap">
                        <span className={isPositive ? 'text-emerald-500' : 'text-rose-500'}>
                          {isPositive ? '+' : ''}{formatQuantity(m.quantityDelta, baseUnit)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-text-secondary whitespace-nowrap">
                        {m.unitCost ? formatMoney(m.unitCost) : '—'}
                      </td>
                      <td className="py-3 px-4 text-text-secondary text-xs">
                        {m.note || m.reasonCode || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modals */}
      <AddInventoryModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={loadData}
        initialProduct={product}
        initialStock={currentStock}
      />

      <AdjustInventoryModal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        onSuccess={loadData}
        initialProduct={product}
        initialStock={currentStock}
      />

      <WasteModal
        isOpen={wasteModalOpen}
        onClose={() => setWasteModalOpen(false)}
        onSuccess={loadData}
        initialProduct={product}
        initialStock={currentStock}
      />
    </PageContainer>
  );
};
