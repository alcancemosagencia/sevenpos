import React from 'react';
import { ReceiptDTO } from '../../../domain/sales/Receipt';

export interface ReceiptDocumentProps {
  receipt: ReceiptDTO;
  format?: '80mm' | '58mm';
  /**
   * If true, applies pure print styling without card shadows or interactive background.
   */
  isPrintMode?: boolean;
}

export const ReceiptDocument: React.FC<ReceiptDocumentProps> = ({
  receipt,
  format = '80mm',
  isPrintMode = false,
}) => {
  const is58mm = format === '58mm';

  return (
    <div
      className={`font-mono text-text-primary leading-tight flex flex-col gap-2.5 select-text ${
        isPrintMode
          ? 'w-full bg-white text-black p-2 text-[10px]'
          : `${is58mm ? 'max-w-[260px]' : 'max-w-[320px]'} w-full bg-surface p-5 rounded-xl border border-border-default shadow-xs text-[11px]`
      }`}
      data-testid="receipt-document"
    >
      {/* Header / Business Info */}
      <div className="text-center flex flex-col gap-0.5 pb-2.5 border-b border-dashed border-border-default">
        <h3 className="font-bold text-sm tracking-tight uppercase font-sans text-text-primary">
          {receipt.businessName}
        </h3>
        {receipt.businessFiscalId && (
          <p className="text-text-tertiary">RUT/ID: {receipt.businessFiscalId}</p>
        )}
        {receipt.businessAddress && (
          <p className="text-text-tertiary">{receipt.businessAddress}</p>
        )}
        {receipt.businessPhone && (
          <p className="text-text-tertiary">Tel: {receipt.businessPhone}</p>
        )}
        <p className="font-bold text-xs mt-1 font-sans text-text-primary">
          COMPROBANTE DE VENTA
        </p>
        <p className="font-bold text-text-primary">#{receipt.saleNumber}</p>
      </div>

      {/* Meta Info */}
      <div className="flex flex-col gap-0.5 text-text-secondary text-[10px] pb-2 border-b border-dashed border-border-default">
        <div className="flex justify-between">
          <span>Fecha:</span>
          <span className="font-bold text-text-primary">{receipt.dateFormatted}</span>
        </div>
        <div className="flex justify-between">
          <span>Cajero:</span>
          <span className="font-bold text-text-primary">{receipt.cashierName}</span>
        </div>
        <div className="flex justify-between">
          <span>Cliente:</span>
          <span className="font-bold text-text-primary">{receipt.customerName}</span>
        </div>
      </div>

      {/* Itemized Lines */}
      <div className="flex flex-col gap-2 pb-2.5 border-b border-dashed border-border-default">
        <div className="flex justify-between text-[10px] font-bold text-text-tertiary border-b border-border-default/40 pb-1">
          <span>DESCRIPCIÓN / CANT.</span>
          <span>TOTAL</span>
        </div>

        {receipt.items.map((it, idx) => (
          <div key={idx} className="flex flex-col gap-0.5" data-testid="receipt-item-row">
            <div className="flex justify-between font-bold">
              <span className="truncate pr-2">{it.displayName}</span>
              <span className="shrink-0">{it.lineTotalFormatted}</span>
            </div>
            <div className="flex justify-between text-[10px] text-text-tertiary">
              <span>
                {it.quantityFormatted} × {it.unitPriceFormatted}
                {it.presentationName ? ` (${it.presentationName})` : ''}
              </span>
              {it.discountFormatted && (
                <span className="text-status-success">Desc: {it.discountFormatted}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="flex flex-col gap-1 text-[11px] pb-2.5 border-b border-dashed border-border-default">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span className="font-bold">{receipt.subtotalFormatted}</span>
        </div>
        {receipt.discountFormatted && (
          <div className="flex justify-between text-status-success">
            <span>Descuento:</span>
            <span className="font-bold">- {receipt.discountFormatted}</span>
          </div>
        )}
        {receipt.taxFormatted && (
          <div className="flex justify-between">
            <span>Impuestos:</span>
            <span className="font-bold">{receipt.taxFormatted}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold text-text-primary pt-1 border-t border-border-default">
          <span>TOTAL:</span>
          <span>{receipt.totalFormatted}</span>
        </div>
      </div>

      {/* Payments */}
      <div className="flex flex-col gap-1 text-[10px] pb-2 border-b border-dashed border-border-default">
        <span className="font-bold text-text-tertiary">FORMA DE PAGO:</span>
        {receipt.payments.map((p, idx) => (
          <div key={idx} className="flex flex-col gap-0.5">
            <div className="flex justify-between">
              <span>{p.methodName}:</span>
              <span className="font-bold">{p.amountFormatted}</span>
            </div>
            {p.receivedFormatted && (
              <div className="flex justify-between text-text-tertiary pl-2">
                <span>Recibido:</span>
                <span>{p.receivedFormatted}</span>
              </div>
            )}
            {p.changeFormatted && (
              <div className="flex justify-between text-status-success pl-2 font-bold">
                <span>Vuelto / Cambio:</span>
                <span>{p.changeFormatted}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer / Thank you */}
      <div className="text-center text-[10px] text-text-tertiary pt-1 flex flex-col gap-1">
        {receipt.note && <p className="italic">Nota: {receipt.note}</p>}
        <p className="font-bold text-text-secondary">¡Gracias por su compra!</p>
        <p>SevenPOS · Sistema de Punto de Venta</p>
      </div>
    </div>
  );
};
