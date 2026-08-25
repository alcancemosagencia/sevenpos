import React, { useState, useRef } from 'react';
import { X, Layers, AlertCircle } from 'lucide-react';
import { ProductPresentation } from '../../../domain/catalog/ProductPresentation';
import { CurrencyCode } from '../../../types/country';
import { parseMoneyInput, formatMoney, toMajorUnits } from '../../../domain/common/money/Money';

interface PresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description?: string | null;
    unitFactor: number;
    salePrice: number;
    sku?: string | null;
    barcode?: string | null;
  }) => Promise<{ success: boolean; presentation?: ProductPresentation; error?: string }>;
  initialPresentation?: ProductPresentation | null;
  baseProductName: string;
  baseProductPrice: number;
  baseUnitLabel: string;
  currency: CurrencyCode;
}

const PresentationFormInner: React.FC<{
  onClose: () => void;
  onSave: PresentationModalProps['onSave'];
  initialPresentation?: ProductPresentation | null;
  baseProductName: string;
  baseProductPrice: number;
  baseUnitLabel: string;
  currency: CurrencyCode;
}> = ({
  onClose,
  onSave,
  initialPresentation,
  baseProductName,
  baseProductPrice,
  baseUnitLabel,
  currency,
}) => {
  const [name, setName] = useState(() => initialPresentation?.name || '');
  const [description, setDescription] = useState(() => initialPresentation?.description || '');
  const [unitFactor, setUnitFactor] = useState<number>(() => initialPresentation?.unitFactor || 6);
  const [priceInput, setPriceInput] = useState(() => {
    if (initialPresentation) {
      return String(toMajorUnits(initialPresentation.salePrice, currency));
    }
    const suggested = baseProductPrice * 6;
    return String(toMajorUnits(suggested, currency));
  });
  const [sku, setSku] = useState(() => initialPresentation?.sku || '');
  const [barcode, setBarcode] = useState(() => initialPresentation?.barcode || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('El nombre de la presentación es obligatorio.');
      return;
    }
    if (!unitFactor || unitFactor <= 0 || !Number.isInteger(unitFactor)) {
      setErrorMessage('El factor de conversión debe ser un número entero mayor a 0 (ej. 6, 12, 24).');
      return;
    }

    const parsedPrice = parseMoneyInput(priceInput, currency);
    if (parsedPrice === null || parsedPrice < 0) {
      setErrorMessage('El precio de venta debe ser un número válido igual o mayor a cero.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await onSave({
      name: name.trim(),
      description: description.trim() || null,
      unitFactor,
      salePrice: parsedPrice,
      sku: sku.trim() || null,
      barcode: barcode.trim() || null,
    });

    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'Error al guardar la presentación.');
    }
  };

  const parsedMinor = parseMoneyInput(priceInput, currency);

  return (
    <div
      className="w-full max-w-lg bg-surface border border-border-strong rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Modal Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-default bg-surface-secondary/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="font-bold text-text-primary text-base">
              {initialPresentation ? 'Editar presentación' : 'Nueva presentación'}
            </h3>
            <p className="text-xs text-text-tertiary">
              Producto base: <span className="text-text-secondary font-medium">{baseProductName}</span>
            </p>
          </div>
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
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
            Nombre de la presentación <span className="text-red-400">*</span>
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Pack x6, Caja x24, Display x12..."
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
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej. Formato ahorro para comercio..."
            className="w-full px-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm focus:outline-none focus:border-brand-primary transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Unit Factor */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Factor de conversión <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                step={1}
                value={unitFactor}
                onChange={(e) => setUnitFactor(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>
            <p className="text-[11px] text-text-tertiary mt-1">
              Equivale a <strong className="text-text-secondary">{unitFactor || 1}</strong> {baseUnitLabel} del producto base.
            </p>
          </div>

          {/* Sale Price */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Precio de venta ({currency}) <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm font-semibold focus:outline-none focus:border-brand-primary transition-colors"
            />
            {parsedMinor !== null && (
              <p className="text-[11px] text-text-tertiary mt-1">
                Vista: <span className="text-emerald-400 font-semibold">{formatMoney(parsedMinor, currency)}</span>
              </p>
            )}
          </div>
        </div>

        {/* SKU and Barcode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              SKU presentación <span className="text-text-tertiary font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Ej. PACK6-COCA"
              className="w-full px-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm font-mono focus:outline-none focus:border-brand-primary transition-colors uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Código de barras <span className="text-text-tertiary font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Ej. 780123456789"
              className="w-full px-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-sm font-mono focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>
        </div>

        <div className="p-3 bg-surface-secondary/60 rounded-xl border border-border-default flex items-start gap-2.5 text-xs text-text-secondary">
          <AlertCircle size={16} className="text-text-tertiary shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Las presentaciones permiten vender packs o bultos con precio propio. En el POS descontarán automáticamente la cantidad correspondiente del inventario base.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-default">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-surface-secondary hover:bg-surface-tertiary text-text-secondary text-xs font-semibold rounded-xl border border-border-default transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-brand-primary hover:bg-brand-hover text-white text-xs font-semibold rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Guardando...' : initialPresentation ? 'Guardar cambios' : 'Agregar presentación'}
          </button>
        </div>
      </form>
    </div>
  );
};

export const PresentationModal: React.FC<PresentationModalProps> = (props) => {
  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm dark:bg-black/80 animate-in fade-in duration-150">
      <PresentationFormInner
        key={props.initialPresentation?.id || 'new-presentation'}
        {...props}
      />
    </div>
  );
};
