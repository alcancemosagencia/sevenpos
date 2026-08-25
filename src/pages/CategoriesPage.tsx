import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Tag,
  Search,
  Edit2,
  Power,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { ListCategories } from '../application/catalog/category/ListCategories';
import { CreateCategory } from '../application/catalog/category/CreateCategory';
import { UpdateCategory } from '../application/catalog/category/UpdateCategory';
import { DeactivateCategory } from '../application/catalog/category/DeactivateCategory';
import { Category } from '../domain/catalog/Category';
import { CreateCategoryModal } from '../features/catalog/components/CreateCategoryModal';
import { Select, SelectOption } from '../components/ui/Select';
import { FilterToolbar } from '../components/ui/FilterToolbar';
import { PageContainer } from '../components/shell/PageContainer';
import { PageHeader } from '../components/shell/PageHeader';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';

interface CategoryWithCount extends Category {
  productCount: number;
}

export const CategoriesPage: React.FC = () => {
  const businessId = 'primary-business';

  const categoryRepo = repositoryFactory.getCategoryRepository();
  const productRepo = repositoryFactory.getProductRepository();

  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    let isMounted = true;
    const listCategoriesUseCase = new ListCategories(categoryRepo);

    async function loadData() {
      try {
        const list = await listCategoriesUseCase.execute(businessId);
        const withCounts: CategoryWithCount[] = await Promise.all(
          list.map(async (cat) => {
            const count = await productRepo.countByCategory(cat.id, businessId);
            return { ...cat, productCount: count };
          })
        );
        if (isMounted) {
          setCategories(withCounts);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setErrorMessage('No pudimos cargar las categorías.');
          setIsLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [businessId, refreshTrigger, categoryRepo, productRepo]);

  const handleSaveCategory = async (data: { name: string; description?: string | null; color?: string | null }) => {
    if (selectedCategory) {
      const updateCategoryUseCase = new UpdateCategory(categoryRepo);
      const res = await updateCategoryUseCase.execute({
        id: selectedCategory.id,
        businessId,
        ...data,
      });
      if (res.success) {
        showToast('Categoría actualizada con éxito');
        setRefreshTrigger((r) => r + 1);
      }
      return res;
    } else {
      const createCategoryUseCase = new CreateCategory(categoryRepo);
      const res = await createCategoryUseCase.execute({
        businessId,
        ...data,
      });
      if (res.success) {
        showToast('Categoría creada con éxito');
        setRefreshTrigger((r) => r + 1);
      }
      return res;
    }
  };

  const handleToggleStatus = async (category: CategoryWithCount) => {
    try {
      if (category.active) {
        const deactivateCategoryUseCase = new DeactivateCategory(categoryRepo);
        await deactivateCategoryUseCase.execute(category.id, businessId);
        showToast('Categoría desactivada');
      } else {
        const updateCategoryUseCase = new UpdateCategory(categoryRepo);
        await updateCategoryUseCase.execute({
          id: category.id,
          businessId,
          name: category.name,
          active: true,
        });
        showToast('Categoría activada');
      }
      setRefreshTrigger((r) => r + 1);
    } catch {
      showToast('Error al actualizar el estado de la categoría');
    }
  };

  // Filtered list by query and status
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const term = query.trim().toLowerCase();
      const matchesQuery =
        !term ||
        c.name.toLowerCase().includes(term) ||
        (c.description && c.description.toLowerCase().includes(term));

      if (!matchesQuery) return false;

      if (statusFilter === 'active') return c.active;
      if (statusFilter === 'inactive') return !c.active;
      return true;
    });
  }, [categories, query, statusFilter]);

  const statusOptions: SelectOption[] = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'active', label: 'Solo activas' },
    { value: 'inactive', label: 'Solo inactivas' },
  ];

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  return (
    <PageContainer>
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-2.5 bg-surface border border-brand-primary text-text-primary text-xs font-semibold rounded-xl shadow-xl animate-in slide-in-from-top-3 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Modal */}
      <CreateCategoryModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedCategory(null);
        }}
        onSave={handleSaveCategory}
        initialCategory={selectedCategory}
      />

      {/* Header */}
      <PageHeader
        title="Categorías"
        subtitle="Organiza los productos de tu catálogo por departamentos o familias."
        actions={
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <IconButton
              variant="secondary"
              size="md"
              onClick={() => setRefreshTrigger((r) => r + 1)}
              disabled={isLoading}
              ariaLabel="Recargar categorías"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </IconButton>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setSelectedCategory(null);
                setShowModal(true);
              }}
              leftIcon={<Plus size={16} />}
              className="w-full sm:w-auto"
            >
              Nueva categoría
            </Button>
          </div>
        }
      />

      {/* Search & Filters Bar */}
      <FilterToolbar className="mb-4">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o descripción..."
            className="w-full pl-10 pr-8 py-2.5 bg-surface border border-border-default rounded-xl text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-brand-primary transition-colors shadow-xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-tertiary hover:text-text-primary rounded cursor-pointer"
              title="Limpiar búsqueda"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={(val) => setStatusFilter(val as 'all' | 'active' | 'inactive')}
          className="min-w-[150px]"
        />
      </FilterToolbar>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2.5">
          <AlertCircle size={18} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="p-6 bg-surface-primary border border-border-default rounded-2xl shadow-sm space-y-4 animate-pulse">
          <div className="h-6 bg-surface-secondary rounded-lg w-1/4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-surface-secondary/60 rounded-xl" />
            ))}
          </div>
        </div>
      ) : filteredCategories.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center bg-surface-primary border border-border-default rounded-2xl shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface-secondary text-text-tertiary mx-auto flex items-center justify-center">
            <Tag size={24} />
          </div>
          <h3 className="text-base font-bold text-text-primary">
            {query || statusFilter !== 'all' ? 'No se encontraron categorías' : 'No hay categorías creadas'}
          </h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            {query || statusFilter !== 'all'
              ? 'Prueba modificando los filtros o el término de búsqueda.'
              : 'Las categorías te ayudan a agrupar tus productos y generar reportes organizados.'}
          </p>
          {query || statusFilter !== 'all' ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setStatusFilter('all');
              }}
              className="px-4 py-2 bg-surface-secondary hover:bg-surface-tertiary text-text-primary text-xs font-semibold rounded-xl border border-border-default transition-colors cursor-pointer"
            >
              Restablecer filtros
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory(null);
                setShowModal(true);
              }}
              className="px-4 py-2 bg-brand-primary hover:bg-brand-hover text-white text-xs font-semibold rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>Crear primera categoría</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table (HeroUI Table styling: hidden on mobile <768px) */}
          <div className="hidden md:block bg-surface-primary border border-border-default rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border-default/80 bg-surface-secondary/50 text-text-secondary text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-5">Nombre</th>
                    <th className="py-3 px-4 text-center">Productos</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4">Creada</th>
                    <th className="py-3 px-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default/50">
                  {filteredCategories.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-surface-hover/70 transition-colors group"
                    >
                      {/* Nombre with Color Dot & Description */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: c.color || '#3B82F6' }}
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-text-primary block truncate">
                              {c.name}
                            </span>
                            {c.description && (
                              <span className="text-xs text-text-tertiary block truncate max-w-md">
                                {c.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Productos Counter */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-secondary text-text-secondary border border-border-default/60">
                          {c.productCount} {c.productCount === 1 ? 'producto' : 'productos'}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 text-center">
                        {c.active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-secondary text-text-tertiary border border-border-default">
                            Inactiva
                          </span>
                        )}
                      </td>

                      {/* Creada */}
                      <td className="py-3.5 px-4 text-text-secondary text-xs">
                        {formatDate(c.createdAt)}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory(c);
                              setShowModal(true);
                            }}
                            className="p-1.5 text-text-secondary hover:text-brand-primary hover:bg-surface-secondary rounded-lg transition-colors cursor-pointer"
                            title="Editar categoría"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(c)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              c.active
                                ? 'text-text-secondary hover:text-amber-400 hover:bg-amber-400/10'
                                : 'text-text-tertiary hover:text-emerald-400 hover:bg-emerald-400/10'
                            }`}
                            title={c.active ? 'Desactivar categoría' : 'Activar categoría'}
                          >
                            <Power size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards List (<768px) */}
          <div className="md:hidden space-y-2.5">
            {filteredCategories.map((c) => (
              <div
                key={c.id}
                className="p-4 bg-surface-primary border border-border-default rounded-xl shadow-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: c.color || '#3B82F6' }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary text-sm truncate">
                        {c.name}
                      </span>
                      {c.active ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Activa
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-secondary text-text-tertiary border border-border-default">
                          Inactiva
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-text-tertiary">
                      <span>{c.productCount} {c.productCount === 1 ? 'producto' : 'productos'}</span>
                      {c.description && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[120px]">{c.description}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(c);
                      setShowModal(true);
                    }}
                    className="p-2 text-text-secondary hover:text-brand-primary rounded-lg hover:bg-surface-secondary transition-colors cursor-pointer"
                    title="Editar categoría"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(c)}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      c.active
                        ? 'text-text-secondary hover:text-amber-400 hover:bg-amber-400/10'
                        : 'text-text-tertiary hover:text-emerald-400 hover:bg-emerald-400/10'
                    }`}
                    title={c.active ? 'Desactivar categoría' : 'Activar categoría'}
                  >
                    <Power size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
};
