import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  ArrowDownUp,
  Package,
  AlertTriangle,
  Boxes,
  Activity,
  Search,
  X,
} from 'lucide-react';
import { PageContainer } from '../components/shell/PageContainer';
import { PageHeader } from '../components/shell/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { FilterToolbar } from '../components/ui/FilterToolbar';
import { EmptyState } from '../components/ui/EmptyState';
import { InventoryTable } from '../features/inventory/components/InventoryTable';
import { AddInventoryModal } from '../features/inventory/components/AddInventoryModal';
import { AdjustInventoryModal } from '../features/inventory/components/AdjustInventoryModal';
import { WasteModal } from '../features/inventory/components/WasteModal';
import {
  InventoryProductRow,
  InventoryKPIMetrics,
} from '../domain/inventory/repositories/InventoryQueryRepository';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { ListInventoryStock } from '../application/inventory/ListInventoryStock';
import { Category } from '../domain/catalog/Category';

interface InventoryPageProps {
  onNavigateToCatalog?: () => void;
  onNavigateToMovements?: () => void;
  onNavigateToProductDetail?: (productId: string) => void;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({
  onNavigateToCatalog,
  onNavigateToMovements,
  onNavigateToProductDetail,
}) => {
  const businessId = 'primary-business';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<InventoryProductRow[]>([]);
  const [metrics, setMetrics] = useState<InventoryKPIMetrics>({
    totalProductsWithStock: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalMovementsToday: 0,
    estimatedTotalInventoryValue: 0,
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'available' | 'low_stock' | 'out_of_stock'>('all');
  const [categories, setCategories] = useState<Category[]>([]);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [wasteModalOpen, setWasteModalOpen] = useState(false);
  const [modalTargetRow, setModalTargetRow] = useState<InventoryProductRow | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryRepo = repositoryFactory.getInventoryQueryRepository();
      const catRepo = repositoryFactory.getCategoryRepository();

      const [stockResult, cats] = await Promise.all([
        new ListInventoryStock(queryRepo).execute({
          businessId,
          query: searchQuery,
          categoryId: selectedCategory,
          status: selectedStatus,
          limit: 100,
        }),
        catRepo.list(businessId, true),
      ]);

      setRows(stockResult.rows);
      setMetrics(stockResult.metrics);
      setCategories(cats);
    } catch (err) {
      console.error('Error loading inventory:', err);
      setError('No pudimos cargar el inventario correctamente.');
    } finally {
      setLoading(false);
    }
  }, [businessId, searchQuery, selectedCategory, selectedStatus]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleOpenAddModal = (row?: InventoryProductRow) => {
    setModalTargetRow(row || null);
    setAddModalOpen(true);
  };

  const handleOpenAdjustModal = (row?: InventoryProductRow) => {
    setModalTargetRow(row || null);
    setAdjustModalOpen(true);
  };

  const handleOpenWasteModal = (row: InventoryProductRow) => {
    setModalTargetRow(row);
    setWasteModalOpen(true);
  };

  const handleViewDetail = (row: InventoryProductRow) => {
    if (onNavigateToProductDetail) {
      onNavigateToProductDetail(row.product.id);
    }
  };

  return (
    <PageContainer>
      {/* Header matching SevenPOS PageHeader */}
      <PageHeader
        title="Inventario"
        subtitle="Controla existencias, entradas, ajustes y movimientos de tus productos."
        actions={
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="md"
              leftIcon={<ArrowDownUp size={16} />}
              onClick={() => handleOpenAdjustModal()}
              className="w-full sm:w-auto"
            >
              Ajustar inventario
            </Button>

            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus size={16} />}
              onClick={() => handleOpenAddModal()}
              className="w-full sm:w-auto"
            >
              Agregar inventario
            </Button>
          </div>
        }
      />

      {/* KPI Cards Grid matching SevenPOS Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {/* 1. Con existencias */}
        <Card variant="default" padding="sm" className="p-3.5 sm:p-4 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-[var(--radius-button)] bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                <Package size={16} strokeWidth={2} />
              </div>
              <span className="text-xs sm:text-sm font-medium text-text-secondary">
                Con existencias
              </span>
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
              {metrics.totalProductsWithStock}
            </p>
          </div>
        </Card>

        {/* 2. Stock bajo */}
        <Card variant="default" padding="sm" className="p-3.5 sm:p-4 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-[var(--radius-button)] bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <AlertTriangle size={16} strokeWidth={2} />
              </div>
              <span className="text-xs sm:text-sm font-medium text-text-secondary">
                Stock bajo
              </span>
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-amber-500">
              {metrics.lowStockCount}
            </p>
          </div>
        </Card>

        {/* 3. Sin existencias */}
        <Card variant="default" padding="sm" className="p-3.5 sm:p-4 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-[var(--radius-button)] bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                <Boxes size={16} strokeWidth={2} />
              </div>
              <span className="text-xs sm:text-sm font-medium text-text-secondary">
                Sin existencias
              </span>
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
              {metrics.outOfStockCount}
            </p>
          </div>
        </Card>

        {/* 4. Movimientos hoy */}
        <Card
          variant="interactive"
          padding="sm"
          onClick={onNavigateToMovements}
          className="p-3.5 sm:p-4 flex flex-col justify-between gap-2.5 group"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-[var(--radius-button)] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                <Activity size={16} strokeWidth={2} />
              </div>
              <span className="text-xs sm:text-sm font-medium text-text-secondary truncate">
                Movimientos hoy
              </span>
            </div>
            <span className="text-xs text-brand-primary font-medium group-hover:underline">
              Ver historial →
            </span>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
              {metrics.totalMovementsToday}
            </p>
          </div>
        </Card>
      </div>

      {/* Toolbar: Search + Category + Status filter */}
      <FilterToolbar className="mb-4">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por producto, SKU o código de barras..."
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

        {/* Category filter */}
        <Select
          value={selectedCategory}
          onChange={(val) => setSelectedCategory(val)}
          options={[
            { value: 'all', label: 'Todas las categorías' },
            ...categories.map((c) => ({
              value: c.id,
              label: c.name,
              color: c.color || '#10b981',
            })),
          ]}
          className="min-w-[180px]"
        />

        {/* Status filter */}
        <Select
          value={selectedStatus}
          onChange={(val) => setSelectedStatus(val as 'all' | 'available' | 'low_stock' | 'out_of_stock')}
          options={[
            { value: 'all', label: 'Todos los estados' },
            { value: 'available', label: 'Disponible' },
            { value: 'low_stock', label: 'Stock bajo' },
            { value: 'out_of_stock', label: 'Sin stock' },
          ]}
          className="min-w-[160px]"
        />
      </FilterToolbar>

      {/* Error state */}
      {error && (
        <div className="p-4 mb-4 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => loadData()}>
            Reintentar
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && rows.length === 0 ? (
        <EmptyState
          icon={<Package size={24} />}
          title={searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all' ? 'No se encontraron existencias' : 'No hay productos con inventario registrado'}
          description={
            searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'
              ? 'Prueba modificando los filtros de búsqueda o categoría.'
              : 'Empieza registrando una entrada de inventario o creando productos en tu catálogo.'
          }
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={16} />}
                onClick={() => handleOpenAddModal()}
              >
                Agregar inventario
              </Button>
              {onNavigateToCatalog && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onNavigateToCatalog}
                >
                  Ver catálogo
                </Button>
              )}
            </div>
          }
        />
      ) : (
        /* Inventory Table */
        <InventoryTable
          rows={rows}
          loading={loading}
          onAddStock={handleOpenAddModal}
          onAdjustStock={handleOpenAdjustModal}
          onWasteStock={handleOpenWasteModal}
          onViewDetail={handleViewDetail}
        />
      )}

      {/* Modals */}
      <AddInventoryModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={loadData}
        initialProduct={modalTargetRow ? modalTargetRow.product : null}
        initialStock={modalTargetRow ? modalTargetRow.currentStock : 0}
      />

      <AdjustInventoryModal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        onSuccess={loadData}
        initialProduct={modalTargetRow ? modalTargetRow.product : null}
        initialStock={modalTargetRow ? modalTargetRow.currentStock : 0}
      />

      {modalTargetRow && (
        <WasteModal
          isOpen={wasteModalOpen}
          onClose={() => {
            setWasteModalOpen(false);
            setModalTargetRow(null);
          }}
          onSuccess={loadData}
          initialProduct={modalTargetRow.product}
          initialStock={modalTargetRow.currentStock}
        />
      )}
    </PageContainer>
  );
};
