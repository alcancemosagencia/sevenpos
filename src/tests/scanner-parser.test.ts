import { describe, it, expect, vi } from 'vitest';
import { KeyboardWedgeScanner, ScanResult } from '../infrastructure/hardware/scanner/KeyboardWedgeScanner';

describe('KeyboardWedgeScanner Hardware Spike (AG-03 Core)', () => {
  it('parses simulated scanner burst and notifies listeners', () => {
    const scanner = new KeyboardWedgeScanner();
    const mockListener = vi.fn();

    const unsubscribe = scanner.onScan(mockListener);
    const result: ScanResult = scanner.simulateScan('7701234567894');

    expect(result.barcode).toBe('7701234567894');
    expect(result.charCount).toBe(13);
    expect(result.method).toBe('SIMULATOR');

    expect(mockListener).toHaveBeenCalledTimes(1);
    expect(mockListener).toHaveBeenCalledWith(result);

    unsubscribe();
  });

  it('unsubscribes listener cleanly', () => {
    const scanner = new KeyboardWedgeScanner();
    const mockListener = vi.fn();

    const unsubscribe = scanner.onScan(mockListener);
    unsubscribe();

    scanner.simulateScan('123456');
    expect(mockListener).not.toHaveBeenCalled();
  });
});
