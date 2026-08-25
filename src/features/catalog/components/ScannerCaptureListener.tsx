import React, { useEffect, useRef } from 'react';

interface ScannerCaptureListenerProps {
  onScan: (barcode: string) => void;
  isEnabled?: boolean;
}

export const ScannerCaptureListener: React.FC<ScannerCaptureListenerProps> = ({
  onScan,
  isEnabled = true,
}) => {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ignore if active element is an editable input or textarea (allow native typing)
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // If user presses Enter
      if (e.key === 'Enter') {
        if (bufferRef.current.length >= 4) {
          const scannedCode = bufferRef.current.trim();
          bufferRef.current = '';
          if (!isInput) {
            e.preventDefault();
            onScan(scannedCode);
          }
        } else {
          bufferRef.current = '';
        }
        return;
      }

      // If key is a printable character
      if (e.key.length === 1) {
        // Keyboard wedge scanners type extremely fast (< 40ms between keys)
        // Human typing is usually > 80ms
        if (timeDiff > 70 && bufferRef.current.length > 0) {
          // Reset buffer if delay indicates human keystrokes
          bufferRef.current = '';
        }

        bufferRef.current += e.key;

        // Auto-clear buffer after 300ms if not completed with Enter
        setTimeout(() => {
          if (Date.now() - lastKeyTimeRef.current > 250) {
            bufferRef.current = '';
          }
        }, 300);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan, isEnabled]);

  return null;
};
