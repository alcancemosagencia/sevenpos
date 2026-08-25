import React, { useState, useRef } from 'react';
import { X, Check, Tag } from 'lucide-react';
import { Category } from '../../../domain/catalog/Category';
import { Button } from '../../../components/ui/Button';

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (categoryData: { name: string; description?: string | null; color?: string | null }) => Promise<{ success: boolean; category?: Category; error?: string }>;
  initialCategory?: Category | null;
}

const COLOR_SWATCHES = [
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Índigo', value: '#6366f1' },
  { label: 'Verde', value: '#10b981' },
  { label: 'Esmeralda', value: '#059669' },
  { label: 'Ámbar', value: '#f59e0b' },
  { label: 'Rojo', value: '#ef4444' },
  { label: 'Rosa', value: '#ec4899' },
  { label: 'Púrpura', value: '#8b5cf6' },
  { label: 'Turquesa', value: '#14b8a6' },
  { label: 'Gris', value: '#64748b' },
];

const CategoryFormInner: React.FC<{
  onClose: () => void;
  onSave: CreateCategoryModalProps['onSave'];
  initialCategory?: Category | null;
}> = ({ onClose, onSave, initialCategory }) => {
  const [name, setName] = useState(() => initialCategory?.name || '');
  const [description, setDescription] = useState(() => initialCategory?.description || '');
  const [color, setColor] = useState(() => initialCategory?.color || COLOR_SWATCHES[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('El nombre de la categoría es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await onSave({
      name: name.trim(),
      description: description.trim() || null,
      color,
    });

    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'Error al guardar la categoría.');
    }
  };

  return (
    <div
      className="w-full max-w-md bg-surface border border-border-strong rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Modal Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-default bg-surface-secondary/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
            <Tag size={18} />
          </div>
          <h3 className="font-bold text-text-primary text-base">
            {initialCategory ? 'Editar categoría' : 'Nueva categoría'}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Modal Body */}
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-lg bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
            Nombre <span className="text-red-400">*</span>
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Bebidas, Lácteos, Snacks..."
            className="w-full px-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm focus:outline-none focus:border-brand-primary transition-colors"
            maxLength={100}
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
            Descripción <span className="text-text-tertiary font-normal">(Opcional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción breve de los productos en esta categoría..."
            rows={2}
            className="w-full px-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm focus:outline-none focus:border-brand-primary transition-colors resize-none"
          />
        </div>

        {/* Color selector */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Color identificador
          </label>
          <div className="flex flex-wrap gap-2.5">
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch.value}
                type="button"
                onClick={() => setColor(swatch.value)}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                  color === swatch.value ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-surface' : 'hover:scale-105 opacity-80'
                }`}
                style={{ backgroundColor: swatch.value }}
                title={swatch.label}
              >
                {color === swatch.value && <Check size={14} className="text-white drop-shadow-sm" />}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-default">
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
            {initialCategory ? 'Guardar cambios' : 'Crear categoría'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCategory,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm dark:bg-black/80 animate-in fade-in duration-150">
      <CategoryFormInner
        key={initialCategory?.id || 'new-category'}
        onClose={onClose}
        onSave={onSave}
        initialCategory={initialCategory}
      />
    </div>
  );
};
