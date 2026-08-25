import { useEffect, useRef } from 'react';
import { Product } from '../../../domain/catalog/Product';
import { ProductPresentation } from '../../../domain/catalog/ProductPresentation';
import { InventoryMovementRepository } from '../../../domain/inventory/repositories/InventoryMovementRepository';

interface UsePosScannerProps {
  businessId: string;
  products: Product[];
  presentations: ProductPresentation[];
  movementRepo: InventoryMovementRepository;
  onBarcodeMatched: (product: Product, presentation?: ProductPresentation | null, availableStock?: number) => void;
  onScanError: (message: string) => void;
  enabled?: boolean;
}

export function usePosScanner({
  businessId,
  products,
  presentations,
  movementRepo,
  onBarcodeMatched,
  onScanError,
  enabled = true,
}: UsePosScannerProps) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if typing inside input, textarea or contenteditable element
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Scanners type rapidly (usually < 50ms between strokes)
      if (timeDiff > 80 && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim();
        bufferRef.current = '';

        if (barcode.length >= 3) {
          e.preventDefault();

          // 1. Check exact match in presentations
          const presMatch = presentations.find((p) => p.barcode === barcode || p.sku === barcode);
          if (presMatch) {
            const parentProd = products.find((p) => p.id === presMatch.productId);
            if (parentProd) {
              const currentStock = await movementRepo.getCurrentStock(parentProd.id, businessId);
              if (currentStock <= 0) {
                onScanError(`"${parentProd.name} · ${presMatch.name}" no tiene existencias disponibles.`);
                return;
              }
              onBarcodeMatched(parentProd, presMatch, currentStock);
              return;
            }
          }

          // 2. Check exact match in base products
          const prodMatch = products.find((p) => p.barcode === barcode || p.sku === barcode);
          if (prodMatch) {
            const currentStock = await movementRepo.getCurrentStock(prodMatch.id, businessId);
            if (currentStock <= 0) {
              onScanError(`"${prodMatch.name}" no tiene existencias disponibles.`);
              return;
            }
            onBarcodeMatched(prodMatch, null, currentStock);
            return;
          }

          onScanError(`No encontramos ningún producto con el código "${barcode}".`);
        }
        return;
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, businessId, products, presentations, movementRepo, onBarcodeMatched, onScanError]);
}
