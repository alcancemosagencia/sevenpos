import React, { useState, useEffect } from 'react';
import { ReceiptDTO } from '../../../domain/sales/Receipt';
import { ReceiptDocument } from '../../sales/components/ReceiptDocument';
import { generateReceiptFragmentHtml } from '../../../infrastructure/hardware/printing/ReceiptPrintService';
import { windowsPrintSpikeAdapter } from '../../../infrastructure/hardware/printing/WindowsPrintSpikeAdapter';
import { Button } from '../../../components/ui/Button';
import { CheckCircle2, Printer, X, PlusCircle, AlertCircle } from 'lucide-react';

interface PosReceiptModalProps {
  isOpen: boolean;
  receipt: ReceiptDTO | null;
  onClose: () => void;
  onNewSale: () => void;
}

export const PosReceiptModal: React.FC<PosReceiptModalProps> = ({
  isOpen,
  receipt,
  onClose,
  onNewSale,
}) => {
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && receipt && typeof document !== 'undefined') {
      const printRoot = document.getElementById('sevenpos-print-root');
      if (printRoot) {
        printRoot.setAttribute('data-format', '80mm');
        printRoot.innerHTML = generateReceiptFragmentHtml(receipt, '80mm');
      }
    }
  }, [isOpen, receipt]);

  if (!isOpen || !receipt) return null;

  const handlePrint = async () => {
    setPrintStatus('Enviando a impresión...');
    setPrintError(null);

    try {
      const res = await windowsPrintSpikeAdapter.printReceipt(receipt, '80mm');
      if (!res.success) {
        setPrintError('La venta fue registrada, pero no se pudo imprimir.');
      }
    } catch {
      setPrintError('La venta fue registrada, pero no se pudo imprimir.');
    } finally {
      setPrintStatus(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm dark:bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-border-strong rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header with success banner (Screen UI only) */}
        <div className="p-4 bg-status-success/10 border-b border-status-success/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-status-success text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-status-success">Venta completada</h2>
              <p className="text-xs text-text-secondary">Comprobante de venta #{receipt.saleNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary p-1.5 rounded-lg hover:bg-surface-secondary transition-colors cursor-pointer"
            aria-label="Cerrar comprobante"
          >
            <X size={18} />
          </button>
        </div>

        {/* Visual Receipt Preview */}
        <div className="p-6 overflow-y-auto bg-surface-secondary/40 flex justify-center flex-1">
          <ReceiptDocument receipt={receipt} format="80mm" isPrintMode={false} />
        </div>

        {/* Error message if printing fails (Sale remains fully valid) */}
        {printError && (
          <div className="px-6 py-2 bg-status-warning/10 border-t border-status-warning/20 text-status-warning text-xs flex items-center gap-2 shrink-0">
            <AlertCircle size={14} className="shrink-0" />
            <span>{printError}</span>
          </div>
        )}

        {/* Footer Actions (Screen UI only) */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border-default bg-surface shrink-0">
          <Button
            variant="secondary"
            leftIcon={<Printer size={16} />}
            onClick={handlePrint}
            disabled={Boolean(printStatus)}
          >
            {printStatus || 'Imprimir comprobante'}
          </Button>
          <Button variant="primary" leftIcon={<PlusCircle size={16} />} onClick={onNewSale}>
            Nueva venta
          </Button>
        </div>
      </div>
    </div>
  );
};
