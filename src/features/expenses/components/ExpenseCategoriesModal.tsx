import React, { useState } from 'react';
import { ExpenseCategory } from '../../../domain/expenses/ExpenseCategory';
import { CreateExpenseCategory } from '../../../application/expenses/CreateExpenseCategory';
import { UpdateExpenseCategory } from '../../../application/expenses/UpdateExpenseCategory';
import { repositoryFactory } from '../../../infrastructure/repositories/RepositoryFactory';
import { Button } from '../../../components/ui/Button';
import { X, Plus, Edit2, Check, AlertCircle, Power } from 'lucide-react';

interface ExpenseCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ExpenseCategory[];
  onCategoriesUpdated: () => void;
}

export const ExpenseCategoriesModal: React.FC<ExpenseCategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoriesUpdated,
}) => {
  const businessId = 'primary-business';

  // Form to create category
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Edit category in-line
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    setSubmitting(true);

    try {
      const categoryRepo = repositoryFactory.getExpenseCategoryRepository();
      const useCase = new CreateExpenseCategory(categoryRepo);
      await useCase.execute(businessId, {
        name: newName.trim(),
        description: newDescription.trim() || null,
      });

      setNewName('');
      setNewDescription('');
      setIsCreating(false);
      onCategoriesUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear la categoría.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (cat: ExpenseCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDescription(cat.description || '');
    setError(null);
  };

  const handleSaveEdit = async (cat: ExpenseCategory) => {
    if (!editName.trim()) return;
    setError(null);
    setSubmitting(true);

    try {
      const categoryRepo = repositoryFactory.getExpenseCategoryRepository();
      const useCase = new UpdateExpenseCategory(categoryRepo);
      await useCase.execute(businessId, cat.id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
      });

      setEditingId(null);
      onCategoriesUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la categoría.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (cat: ExpenseCategory) => {
    setError(null);
    try {
      const categoryRepo = repositoryFactory.getExpenseCategoryRepository();
      const useCase = new UpdateExpenseCategory(categoryRepo);
      await useCase.execute(businessId, cat.id, {
        active: !cat.active,
      });
      onCategoriesUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al modificar el estado de la categoría.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-surface border border-border-default rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-categories-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-surface-secondary/30">
          <div>
            <h3 id="modal-categories-title" className="text-lg font-bold text-text-primary">
              Categorías de Gastos
            </h3>
            <p className="text-xs text-text-tertiary">
              Administra y personaliza los rubros de egresos de tu negocio
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-status-danger/10 border border-status-danger/20 flex items-start gap-2.5 text-xs text-status-danger font-medium">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* New Category Collapsible Form */}
          {isCreating ? (
            <form onSubmit={handleCreate} className="p-4 rounded-xl bg-surface-secondary/40 border border-border-default space-y-3">
              <div className="font-semibold text-sm text-text-primary">Nueva Categoría</div>
              <div className="space-y-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nombre de la categoría *"
                  required
                  autoFocus
                  className="w-full px-3 py-2 bg-surface border border-border-default rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                />
              </div>
              <div className="space-y-1">
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Descripción (opcional)"
                  className="w-full px-3 py-2 bg-surface border border-border-default rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreating(false);
                    setError(null);
                  }}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Crear categoría'}
                </Button>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5"
            >
              <Plus size={16} />
              <span>+ Nueva categoría de gasto</span>
            </Button>
          )}

          {/* Categories List */}
          <div className="divide-y divide-border-default/50 border border-border-default rounded-xl overflow-hidden bg-surface">
            {categories.map((cat) => {
              const isEditing = editingId === cat.id;

              return (
                <div
                  key={cat.id}
                  className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                    !cat.active ? 'opacity-60 bg-surface-secondary/20' : 'hover:bg-surface-secondary/20'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex-1 flex flex-col gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2.5 py-1.5 bg-surface border border-brand-primary rounded-lg text-sm text-text-primary font-medium"
                      />
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Descripción..."
                        className="px-2.5 py-1 bg-surface border border-border-default rounded-lg text-xs text-text-secondary"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-text-primary truncate">
                          {cat.name}
                        </span>
                        {!cat.active && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">
                            Inactiva
                          </span>
                        )}
                        {cat.systemKey && (
                          <span className="px-1.5 py-0.2 text-[9px] font-mono text-text-tertiary bg-surface-secondary rounded">
                            base
                          </span>
                        )}
                      </div>
                      {cat.description && (
                        <p className="text-xs text-text-tertiary mt-0.5 truncate">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Category Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg text-text-tertiary hover:bg-surface-secondary"
                        >
                          <X size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(cat)}
                          className="p-1.5 rounded-lg text-brand-primary hover:bg-brand-primary/10"
                        >
                          <Check size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-secondary"
                          title="Editar nombre / descripción"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(cat)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            cat.active
                              ? 'text-status-success hover:text-status-danger hover:bg-status-danger/10'
                              : 'text-text-tertiary hover:text-status-success hover:bg-status-success/10'
                          }`}
                          title={cat.active ? 'Desactivar categoría' : 'Activar categoría'}
                        >
                          <Power size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border-default bg-surface-secondary/20 flex justify-end">
          <Button variant="secondary" size="md" onClick={onClose}>
            Listo
          </Button>
        </div>
      </div>
    </div>
  );
};
