import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowDownUp,
  Plus,
  Activity,
  X,
  Search,
} from 'lucide-react';
import { PageContainer } from '../components/shell/PageContainer';
import { PageHeader } from '../components/shell/PageHeader';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { FilterToolbar } from '../components/ui/FilterToolbar';
import { EmptyState } from '../components/ui/EmptyState';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { ListMovements, MovementWithProduct } from '../application/inventory/ListMovements';
import { useCountry } from '../context/CountryContext';
import { formatQuantity } from '../domain/common/quantity/Quantity';
import { BaseUnitCode } from '../domain/common/unit/BaseUnit';
import { AddInventoryModal } from '../features/inventory/components/AddInventoryModal';
import { AdjustInventoryModal } from '../features/inventory/components/AdjustInventoryModal';

interface MovementsPageProps {
  onBackToInventory?: () => void;
  initialProductId?: string | null;
}

const MOVEMENT_TYPE_OPTIONS = [
  { value: 'all', label: 'Todos los tipos de movimiento' },
  { value: 'ENTRY', label: 'Entradas' },
  { value: 'OPENING', label: 'Aperturas iniciales' },
  { value: 'WASTE', label: 'Mermas y pérdidas' },
  { value: 'ADJUSTMENT_IN', label: 'Ajustes positivos (+)' },
  { value: 'ADJUSTMENT_OUT', label: 'Ajustes negativos (-)' },
];

export const MovementsPage: React.FC<MovementsPageProps> = ({
  initialProductId = null,
}) => {
  const businessId = 'primary-business';
  const { formatMoney } = useCountry();

  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<MovementWithProduct[]>([]);
  const [totalMovements, setTotalMovements] = useState(0);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);

  const loadMovements = useCallback(async () => {
    setLoading(true);
    try {
      const movementRepo = repositoryFactory.getInventoryMovementRepository();
      const productRepo = repositoryFactory.getProductRepository();

      const listMovements = new ListMovements(movementRepo, productRepo);
      const result = await listMovements.execute({
        businessId,
        productId: initialProductId || undefined,
        movementType: selectedType,
        limit: 100,
      });

      setMovements(result.movements);
      setTotalMovements(result.total);
    } catch (err) {
      console.error('Error loading movements:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId, initialProductId, selectedType]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMovements();
  }, [loadMovements]);

  const getMovementChip = (type: MovementWithProduct['movementType']) => {
    switch (type) {
      case 'OPENING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
            Apertura inicial
          </span>
        );
      case 'ENTRY':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            + Entrada
          </span>
        );
      case 'WASTE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
            - Merma
          </span>
        );
      case 'ADJUSTMENT_IN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            + Ajuste
          </span>
        );
      case 'ADJUSTMENT_OUT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            - Ajuste
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-secondary text-text-secondary border border-border-default">
            {type}
          </span>
        );
    }
  };

  const getReasonLabel = (reason?: string | null) => {
    switch (reason) {
      case 'PHYSICAL_COUNT':
        return 'Conteo físico';
      case 'DAMAGED':
        return 'Mercadería dañada';
      case 'EXPIRED':
        return 'Producto vencido';
      case 'LOST':
        return 'Pérdida / extravío';
      case 'INTERNAL_USE':
        return 'Consumo interno';
      case 'DATA_CORRECTION':
        return 'Corrección de error';
      case 'OTHER':
        return 'Otro';
      default:
        return 'Operación estándar';
    }
  };

  const filteredMovements = movements.filter((m) => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    return (
      m.productName.toLowerCase().includes(term) ||
      (m.productSku && m.productSku.toLowerCase().includes(term)) ||
      (m.note && m.note.toLowerCase().includes(term)) ||
      (m.referenceId && m.referenceId.toLowerCase().includes(term))
    );
  });

  return (
    <PageContainer>
      {/* Header without redundant "Volver a Existencias" */}
      <PageHeader
        title="Movimientos de inventario"
        subtitle="Consulta todas las entradas, ajustes y mermas registradas en tu inventario."
        actions={
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="md"
              leftIcon={<ArrowDownUp size={16} />}
              onClick={() => setAdjustModalOpen(true)}
              className="w-full sm:w-auto"
            >
              Ajustar inventario
            </Button>

            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus size={16} />}
              onClick={() => setAddModalOpen(true)}
              className="w-full sm:w-auto"
            >
              Agregar inventario
            </Button>
          </div>
        }
      />

      {/* Toolbar: Search & Movement Type Filter */}
      <FilterToolbar className="mb-4">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por producto o motivo..."
            className="w-full pl-10 pr-8 py-2.5 bg-surface border border-border-default rounded-xl text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-brand-primary transition-colors shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-tertiary hover:text-text-primary rounded cursor-pointer"
              title="Limpiar búsqueda"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-text-secondary whitespace-nowrap">
            <Activity size={16} className="text-brand-primary" />
            <span>Total: <strong>{totalMovements}</strong> operaciones</span>
          </div>

          <Select
            value={selectedType}
            onChange={(val) => setSelectedType(val)}
            options={MOVEMENT_TYPE_OPTIONS}
            className="min-w-[200px]"
          />
        </div>
      </FilterToolbar>

      {/* Table or Empty State */}
      {loading ? (
        <div className="py-16 text-center text-text-tertiary text-sm flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
          <span>Cargando movimientos...</span>
        </div>
      ) : filteredMovements.length === 0 ? (
        <EmptyState
          icon={<Activity size={24} />}
          title="Sin movimientos registrados"
          description={
            selectedType !== 'all' || searchQuery
              ? 'No hay registros que coincidan con los filtros seleccionados.'
              : 'Las operaciones de entradas, compras, mermas y ajustes se registrarán automáticamente aquí.'
          }
          action={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={() => setAddModalOpen(true)}
            >
              Agregar inventario
            </Button>
          }
        />
      ) : (
        <div className="bg-surface border border-border-default rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border-default/80 bg-surface-secondary/50 text-text-secondary text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-5">Fecha y hora</th>
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4 text-center">Tipo</th>
                  <th className="py-3 px-4 text-right">Cantidad</th>
                  <th className="py-3 px-4 text-right">Costo unitario</th>
                  <th className="py-3 px-4 text-right">Costo total</th>
                  <th className="py-3 px-5">Motivo y notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/50">
                {filteredMovements.map((m) => {
                  const isPositive = m.quantityDelta > 0;
                  const baseUnit = m.productBaseUnit as BaseUnitCode;

                  return (
                    <tr key={m.id} className="hover:bg-surface-hover/70 transition-colors">
                      {/* Date & Time */}
                      <td className="py-3.5 px-5 font-mono text-xs text-text-secondary whitespace-nowrap">
                        {new Date(m.occurredAt).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Product */}
                      <td className="py-3.5 px-4">
                        <div className="min-w-0 max-w-xs">
                          <span className="font-semibold text-text-primary block truncate">
                            {m.productName}
                          </span>
                          <div className="text-xs text-text-tertiary font-mono flex items-center gap-2 mt-0.5">
                            {m.productSku && <span>SKU: {m.productSku}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Movement Type Badge */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {getMovementChip(m.movementType)}
                      </td>

                      {/* Quantity Delta */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm whitespace-nowrap">
                        <span className={isPositive ? 'text-emerald-500' : 'text-rose-500'}>
                          {isPositive ? '+' : ''}{formatQuantity(m.quantityDelta, baseUnit)}
                        </span>
                      </td>

                      {/* Unit Cost */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-text-secondary whitespace-nowrap">
                        {m.unitCost ? formatMoney(m.unitCost) : '—'}
                      </td>

                      {/* Total Cost */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-xs text-text-primary whitespace-nowrap">
                        {m.totalCost ? formatMoney(m.totalCost) : '—'}
                      </td>

                      {/* Reason & Notes */}
                      <td className="py-3.5 px-5 text-xs text-text-secondary">
                        <div className="flex flex-col">
                          <span className="font-medium text-text-primary">
                            {getReasonLabel(m.reasonCode)}
                          </span>
                          {m.note && (
                            <span className="text-text-tertiary italic text-xs truncate max-w-md">
                              {m.note}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddInventoryModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={loadMovements}
      />

      <AdjustInventoryModal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        onSuccess={loadMovements}
      />
    </PageContainer>
  );
};
