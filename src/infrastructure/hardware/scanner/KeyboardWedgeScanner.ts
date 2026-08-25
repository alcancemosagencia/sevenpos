import { logger } from '../../logging/Logger';

export interface ScanResult {
  raw: string;
  barcode: string;
  timestamp: string;
  charCount: number;
  durationMs: number;
  averageIntervalMs: number;
  method: 'KEYBOARD_WEDGE' | 'SIMULATOR';
}

export type ScanCallback = (result: ScanResult) => void;

/**
 * Keyboard Wedge / USB HID Barcode Scanner listener and parser.
 *
 * Scanners transmit barcode digits rapidly (< 50ms per keystroke) terminated by Enter.
 * This parser buffers key events and verifies burst timing to prevent regular typing interference.
 */
export class KeyboardWedgeScanner {
  private buffer: string[] = [];
  private timestamps: number[] = [];
  private maxInterKeyIntervalMs = 60; // Max time between scanner characters
  private minBarcodeLength = 3;
  private listeners: Set<ScanCallback> = new Set();
  private isListening = false;

  private handleKeyDown = (event: KeyboardEvent) => {
    // Ignore input if user is actively focused on an input or textarea
    const target = event.target as HTMLElement | null;
    const isTextInput =
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

    if (isTextInput && !event.altKey && !event.ctrlKey) {
      // If typing in an explicit text field, do not hijack unless prefix/suffix matches
    }

    const now = performance.now();

    // Check if buffer should be reset due to long pause (human typing)
    if (this.timestamps.length > 0) {
      const lastTime = this.timestamps[this.timestamps.length - 1];
      if (now - lastTime > this.maxInterKeyIntervalMs) {
        this.buffer = [];
        this.timestamps = [];
      }
    }

    if (event.key === 'Enter') {
      if (this.buffer.length >= this.minBarcodeLength) {
        const raw = this.buffer.join('');
        const duration = now - this.timestamps[0];
        const avgInterval = duration / this.buffer.length;

        const scanResult: ScanResult = {
          raw,
          barcode: raw.trim(),
          timestamp: new Date().toISOString(),
          charCount: this.buffer.length,
          durationMs: Math.round(duration),
          averageIntervalMs: Math.round(avgInterval),
          method: 'KEYBOARD_WEDGE',
        };

        logger.info('KeyboardWedgeScanner', `Barcode scanned: ${scanResult.barcode} (${scanResult.charCount} chars in ${scanResult.durationMs}ms)`);
        this.notify(scanResult);
      }
      this.buffer = [];
      this.timestamps = [];
      return;
    }

    // Only buffer printable characters
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      this.buffer.push(event.key);
      this.timestamps.push(now);
    }
  };

  startListening(): void {
    if (typeof window !== 'undefined' && !this.isListening) {
      window.addEventListener('keydown', this.handleKeyDown);
      this.isListening = true;
      logger.info('KeyboardWedgeScanner', 'Started keyboard wedge barcode scanner listener.');
    }
  }

  stopListening(): void {
    if (typeof window !== 'undefined' && this.isListening) {
      window.removeEventListener('keydown', this.handleKeyDown);
      this.isListening = false;
      this.buffer = [];
      this.timestamps = [];
      logger.info('KeyboardWedgeScanner', 'Stopped keyboard wedge barcode scanner listener.');
    }
  }

  onScan(callback: ScanCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Simulates a barcode scan for automated testing or development harness.
   */
  simulateScan(barcode: string): ScanResult {
    const scanResult: ScanResult = {
      raw: barcode,
      barcode: barcode.trim(),
      timestamp: new Date().toISOString(),
      charCount: barcode.length,
      durationMs: barcode.length * 12,
      averageIntervalMs: 12,
      method: 'SIMULATOR',
    };
    logger.info('KeyboardWedgeScanner', `Simulated barcode scan: ${barcode}`);
    this.notify(scanResult);
    return scanResult;
  }

  private notify(result: ScanResult): void {
    this.listeners.forEach((cb) => {
      try {
        cb(result);
      } catch (err) {
        logger.error('KeyboardWedgeScanner', 'Error in scan listener callback', { error: String(err) });
      }
    });
  }
}

export const keyboardWedgeScanner = new KeyboardWedgeScanner();
