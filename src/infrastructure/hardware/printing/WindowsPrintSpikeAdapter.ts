import { PrintPort, PrintResult } from './PrintPort';
import { ReceiptDTO } from '../../../domain/sales/Receipt';
import { ReceiptPrintService } from './ReceiptPrintService';
import { logger } from '../../logging/Logger';

export class WindowsPrintSpikeAdapter implements PrintPort {
  async printTestPage(format: '80mm' | '58mm' = '80mm'): Promise<PrintResult> {
    const timestamp = new Date().toLocaleString();
    const is80mm = format === '80mm';
    const widthChar = is80mm ? 32 : 24;
    const divider = '-'.repeat(widthChar);
    const doubleDivider = '='.repeat(widthChar);

    const payload = [
      doubleDivider,
      '           SEVENPOS           ',
      '     PRUEBA DE IMPRESIÓN      ',
      doubleDivider,
      `Fecha: ${timestamp}`,
      'Sistema: Windows Desktop',
      `Formato Objetivo: ${format}`,
      divider,
      'SevenPOS Technical Core',
      'Tauri 2 + SQLite Local-First',
      divider,
      '   GRACIAS POR SU COMPRA      ',
      doubleDivider,
    ].join('\n');

    logger.info('WindowsPrintSpikeAdapter', `Generated technical test print for format: ${format}`);

    // If running in browser/webview with window.print available
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      try {
        const printWindow = window.open('', '_blank', 'width=350,height=500');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>SevenPOS - Prueba de Impresión</title>
                <style>
                  body {
                    font-family: 'Courier New', monospace;
                    font-size: ${is80mm ? '12px' : '10px'};
                    width: ${is80mm ? '80mm' : '58mm'};
                    margin: 0;
                    padding: 10px;
                    white-space: pre-wrap;
                  }
                </style>
              </head>
              <body>${payload}</body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          printWindow.close();

          return {
            success: true,
            targetFormat: format,
            driver: 'SYSTEM_DIALOG',
            timestamp: new Date().toISOString(),
            outputPayload: payload,
          };
        }
      } catch (err) {
        logger.warn('WindowsPrintSpikeAdapter', 'System print window invocation bypassed or blocked', { error: String(err) });
      }
    }

    return {
      success: true,
      targetFormat: format,
      driver: 'MOCK_PRINTER',
      timestamp: new Date().toISOString(),
      outputPayload: payload,
    };
  }

  async printReceipt(receipt: ReceiptDTO, format: '80mm' | '58mm' = '80mm'): Promise<PrintResult> {
    return ReceiptPrintService.printReceipt(receipt, format);
  }
}

export const windowsPrintSpikeAdapter = new WindowsPrintSpikeAdapter();
