import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useCountry } from '../../../context/CountryContext';
import { formatMoney } from '../../../domain/common/money/Money';
import { CurrencyCode } from '../../../types/country';
import { PosCartItem } from './PosCartItem';
import { PosDiscountModal } from './PosDiscountModal';
import { PosClearCartConfirmModal } from './PosClearCartConfirmModal';
import { PosCustomerSelectorModal } from './PosCustomerSelectorModal';
import { PosQuickCreateCustomerModal } from './PosQuickCreateCustomerModal';
import { Button } from '../../../components/ui/Button';
import {
  ShoppingCart,
  User,
  Tag,
  FileText,
  Trash2,
  Lock,
  ChevronDown,
  X,
} from 'lucide-react';

interface PosCartPanelProps {
  onOpenCheckout: () => void;
  isCashOpen?: boolean;
  onOpenCash?: () => void;
}

export const PosCartPanel: React.FC<PosCartPanelProps> = ({
  onOpenCheckout,
  isCashOpen = true,
  onOpenCash,
}) => {
  const { country } = useCountry();
  const currency = country.primaryCurrency.code as CurrencyCode;

  const {
    items,
    subtotal,
    globalDiscount,
    discountTotal,
    total,
    itemCount,
    note,
    customerId,
    customerName,
    setCustomer,
    setNote,
    setGlobalDiscount,
    incrementQuantity,
    decrementQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isNoteInputOpen, setIsNoteInputOpen] = useState(false);
  const [isCustomerSelectorOpen, setIsCustomerSelectorOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);

  const hasItems = items.length > 0;

  return (
    <div className="flex flex-col h-full bg-surface border border-border-default rounded-2xl shadow-xs overflow-hidden">
      {/* 1. Header & Customer Selector */}
      <div className="flex items-center justify-between p-3.5 border-b border-border-default bg-surface-secondary/40">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0">
            <User size={16} />
          </div>
          <button
            type="button"
            onClick={() => setIsCustomerSelectorOpen(true)}
            className="flex items-center gap-1.5 min-w-0 text-left hover:bg-surface/80 p-1 rounded-lg transition-colors cursor-pointer"
            title="Cambiar cliente asociado a la venta"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-text-primary truncate">
                  {customerName || 'Consumidor final'}
                </span>
                <ChevronDown size={13} className="text-text-tertiary shrink-0" />
              </div>
              <span className="text-[10px] text-text-tertiary">
                {customerId ? 'Cliente registrado' : 'Click para asignar cliente'}
              </span>
            </div>
          </button>

          {customerId && (
            <button
              type="button"
              onClick={() => setCustomer(null, 'Consumidor final')}
              className="p-1 text-text-tertiary hover:text-text-primary hover:bg-surface rounded-md transition-colors"
              title="Quitar cliente y volver a Consumidor final"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {hasItems && (
          <button
            type="button"
            onClick={() => setIsClearConfirmOpen(true)}
            className="p-1.5 text-text-tertiary hover:text-status-danger hover:bg-status-danger/10 rounded-lg transition-colors ml-2 shrink-0 cursor-pointer"
            title="Vaciar carrito"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* 2. Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
        {!hasItems ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-text-tertiary select-none">
            <div className="w-12 h-12 rounded-2xl bg-surface-secondary flex items-center justify-center mb-3">
              <ShoppingCart size={24} className="opacity-40" />
            </div>
            <p className="text-sm font-semibold text-text-secondary">El carrito está vacío</p>
            <p className="text-xs text-text-tertiary mt-1">
              Seleccione productos del catálogo para agregarlos a la venta actual.
            </p>
          </div>
        ) : (
          items.map((line) => (
            <PosCartItem
              key={line.lineId}
              item={line}
              onIncrement={() => incrementQuantity(line.lineId)}
              onDecrement={() => decrementQuantity(line.lineId)}
              onRemove={() => removeItem(line.lineId)}
            />
          ))
        )}
      </div>

      {/* 3. Notes Banner (if any) */}
      {note && (
        <div className="px-3.5 py-1.5 bg-brand-primary/5 border-t border-brand-primary/10 flex items-center justify-between text-xs">
          <span className="text-text-secondary truncate flex items-center gap-1.5">
            <FileText size={13} className="text-brand-primary shrink-0" />
            <span className="truncate">{note}</span>
          </span>
          <button
            type="button"
            onClick={() => setIsNoteInputOpen(true)}
            className="text-[10px] text-brand-primary font-semibold hover:underline shrink-0 ml-2 cursor-pointer"
          >
            Editar
          </button>
        </div>
      )}

      {/* 4. Totals and Actions Section */}
      <div className="p-3.5 border-t border-border-default bg-surface-secondary/40 space-y-3">
        {/* Subtotal, Discounts */}
        <div className="space-y-1.5 text-xs text-text-secondary">
          <div className="flex items-center justify-between">
            <span>Subtotal ({itemCount} {itemCount === 1 ? 'ítem' : 'ítems'})</span>
            <span className="font-semibold text-text-primary">{formatMoney(subtotal, currency)}</span>
          </div>

          {discountTotal > 0 && (
            <div className="flex items-center justify-between text-status-success">
              <span className="flex items-center gap-1">
                <Tag size={13} />
                Descuento aplicado
              </span>
              <span className="font-semibold">-{formatMoney(discountTotal, currency)}</span>
            </div>
          )}

          {/* Additional controls: Add Discount / Add Note */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsDiscountModalOpen(true)}
              className={`text-[11px] font-medium px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                globalDiscount
                  ? 'bg-status-success/10 border-status-success/30 text-status-success font-semibold'
                  : 'bg-surface border-border-default text-text-secondary hover:text-text-primary'
              }`}
            >
              <Tag size={12} />
              {globalDiscount ? 'Descuento aplicado' : '+ Descuento'}
            </button>

            <button
              type="button"
              onClick={() => setIsNoteInputOpen(true)}
              className={`text-[11px] font-medium px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                note
                  ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary font-semibold'
                  : 'bg-surface border-border-default text-text-secondary hover:text-text-primary'
              }`}
            >
              <FileText size={12} />
              {note ? 'Nota agregada' : '+ Nota'}
            </button>
          </div>
        </div>

        {/* Grand Total */}
        <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Total a cobrar</span>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
              {formatMoney(total, currency)}
            </p>
          </div>

          {/* Checkout CTA */}
          <Button
            variant="brand"
            size="lg"
            onClick={onOpenCheckout}
            disabled={!hasItems || !isCashOpen}
            className="font-bold px-6 shadow-sm"
          >
            Cobrar
          </Button>
        </div>

        {!isCashOpen && (
          <div className="p-2 rounded-xl bg-status-warning/10 border border-status-warning/30 flex items-center justify-between text-xs">
            <span className="text-text-secondary flex items-center gap-1.5 font-medium">
              <Lock size={13} className="text-status-warning shrink-0" />
              Caja cerrada
            </span>
            {onOpenCash && (
              <button
                type="button"
                onClick={onOpenCash}
                className="text-xs font-bold text-brand-primary hover:underline cursor-pointer"
              >
                Abrir caja
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <PosDiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        initialType={globalDiscount?.type}
        initialValue={globalDiscount?.value}
        subtotal={subtotal}
        onApplyDiscount={setGlobalDiscount}
      />

      <PosClearCartConfirmModal
        isOpen={isClearConfirmOpen}
        itemCount={itemCount}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirmClear={() => {
          clearCart();
          setIsClearConfirmOpen(false);
        }}
      />

      <PosCustomerSelectorModal
        isOpen={isCustomerSelectorOpen}
        onClose={() => setIsCustomerSelectorOpen(false)}
        selectedCustomerId={customerId}
        onSelectCustomer={setCustomer}
        onOpenQuickCreate={() => setIsQuickCreateOpen(true)}
      />

      <PosQuickCreateCustomerModal
        isOpen={isQuickCreateOpen}
        onClose={() => setIsQuickCreateOpen(false)}
        onCustomerCreated={(newId, newName) => {
          setCustomer(newId, newName);
        }}
      />

      {/* Note input prompt modal */}
      {isNoteInputOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface border border-border-default rounded-2xl p-4 space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-text-primary">Nota de la venta</h3>
            <textarea
              defaultValue={note}
              id="pos-sale-note-textarea"
              placeholder="Ej. Entregar con bolsa, factura pendiente..."
              className="w-full p-2.5 bg-surface-secondary border border-border-default rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-primary resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsNoteInputOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const el = document.getElementById('pos-sale-note-textarea') as HTMLTextAreaElement;
                  if (el) setNote(el.value.trim());
                  setIsNoteInputOpen(false);
                }}
              >
                Guardar nota
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
