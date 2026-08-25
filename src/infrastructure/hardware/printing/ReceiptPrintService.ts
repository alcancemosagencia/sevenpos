import { ReceiptDTO } from '../../../domain/sales/Receipt';
import { PrintResult } from './PrintPort';
import { logger } from '../../logging/Logger';

export function formatReceiptText(receipt: ReceiptDTO, format: '80mm' | '58mm' = '80mm'): string {
  const is80mm = format === '80mm';
  const width = is80mm ? 42 : 32;
  const divider = '-'.repeat(width);
  const doubleDivider = '='.repeat(width);

  const center = (str?: string | null) => {
    const s = str || '';
    if (s.length >= width) return s.slice(0, width);
    const leftPad = Math.floor((width - s.length) / 2);
    return ' '.repeat(leftPad) + s;
  };

  const justify = (left?: string | null, right?: string | null) => {
    const l = left || '';
    const r = right || '';
    const totalLen = l.length + r.length;
    if (totalLen >= width) {
      const availableLeft = width - r.length - 1;
      return l.slice(0, Math.max(0, availableLeft)) + ' ' + r;
    }
    const spaces = width - totalLen;
    return l + ' '.repeat(spaces) + r;
  };

  const lines: string[] = [];

  // Header
  lines.push(doubleDivider);
  lines.push(center((receipt.businessName || 'SEVENPOS').toUpperCase()));
  if (receipt.businessFiscalId) lines.push(center(`RUT/ID: ${receipt.businessFiscalId}`));
  if (receipt.businessAddress) lines.push(center(receipt.businessAddress));
  if (receipt.businessPhone) lines.push(center(`Tel: ${receipt.businessPhone}`));
  lines.push(center('COMPROBANTE DE VENTA'));
  lines.push(center(`#${receipt.saleNumber || ''}`));
  lines.push(divider);

  // Meta
  lines.push(justify('Fecha:', receipt.dateFormatted || ''));
  lines.push(justify('Cajero:', receipt.cashierName || ''));
  lines.push(justify('Cliente:', receipt.customerName || 'Consumidor final'));
  lines.push(divider);

  // Items
  if (receipt.items && receipt.items.length > 0) {
    lines.push(justify('DESCRIPCION / CANT.', 'TOTAL'));
    lines.push(divider);

    for (const item of receipt.items) {
      const itemDesc = item.presentationName
        ? `${item.displayName} (${item.presentationName})`
        : item.displayName;
      lines.push(itemDesc);
      const qtyLine = `  ${item.quantityFormatted} x ${item.unitPriceFormatted}`;
      lines.push(justify(qtyLine, item.lineTotalFormatted));
      if (item.discountFormatted) {
        lines.push(justify('  Descuento:', `-${item.discountFormatted}`));
      }
    }
    lines.push(divider);
  }

  // Totals
  lines.push(justify('Subtotal:', receipt.subtotalFormatted || '$0'));
  if (receipt.discountFormatted) {
    lines.push(justify('Descuento:', `-${receipt.discountFormatted}`));
  }
  if (receipt.taxFormatted) {
    lines.push(justify('Impuestos:', receipt.taxFormatted));
  }
  lines.push(justify('TOTAL:', receipt.totalFormatted || '$0'));
  lines.push(divider);

  // Payments
  if (receipt.payments && receipt.payments.length > 0) {
    lines.push('FORMA DE PAGO:');
    for (const payment of receipt.payments) {
      lines.push(justify(`  ${payment.methodName}:`, payment.amountFormatted));
      if (payment.receivedFormatted) {
        lines.push(justify('    Recibido:', payment.receivedFormatted));
      }
      if (payment.changeFormatted) {
        lines.push(justify('    Vuelto:', payment.changeFormatted));
      }
    }
    lines.push(divider);
  }

  // Footer
  if (receipt.note) {
    lines.push(`Nota: ${receipt.note}`);
  }
  lines.push(center('!Gracias por su compra!'));
  lines.push(center('SevenPOS - Sistema de Punto de Venta'));
  lines.push(doubleDivider);

  return lines.join('\n');
}

export function generateReceiptFragmentHtml(receipt: ReceiptDTO, format: '80mm' | '58mm' = '80mm'): string {
  const is58mm = format === '58mm';
  const widthPx = is58mm ? '260px' : '320px';

  return `
<div class="sevenpos-thermal-receipt" style="font-family: 'Courier New', Courier, monospace; font-size: ${is58mm ? '10px' : '11px'}; line-height: 1.3; color: #000000; background: #ffffff; padding: 8px; width: ${widthPx}; margin: 0 auto; box-sizing: border-box;">
  <div style="text-align: center;">
    <div style="font-weight: bold; font-size: 1.2em; text-transform: uppercase;">${escapeHtml(receipt.businessName || 'SEVENPOS')}</div>
    ${receipt.businessFiscalId ? `<div>RUT/ID: ${escapeHtml(receipt.businessFiscalId)}</div>` : ''}
    ${receipt.businessAddress ? `<div>${escapeHtml(receipt.businessAddress)}</div>` : ''}
    ${receipt.businessPhone ? `<div>Tel: ${escapeHtml(receipt.businessPhone)}</div>` : ''}
    <div style="font-weight: bold; margin-top: 6px;">COMPROBANTE DE VENTA</div>
    <div style="font-weight: bold;">#${escapeHtml(receipt.saleNumber || '')}</div>
  </div>

  <div style="border-bottom: 1px dashed #000000; margin: 6px 0;"></div>

  <div>
    <div style="display: flex; justify-content: space-between;"><span>Fecha:</span><span style="font-weight: bold;">${escapeHtml(receipt.dateFormatted || '')}</span></div>
    <div style="display: flex; justify-content: space-between;"><span>Cajero:</span><span style="font-weight: bold;">${escapeHtml(receipt.cashierName || '')}</span></div>
    <div style="display: flex; justify-content: space-between;"><span>Cliente:</span><span style="font-weight: bold;">${escapeHtml(receipt.customerName || 'Consumidor final')}</span></div>
  </div>

  <div style="border-bottom: 1px dashed #000000; margin: 6px 0;"></div>

  ${
    receipt.items && receipt.items.length > 0
      ? `
  <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 0.9em; margin-bottom: 4px;">
    <span>DESCRIPCIÓN / CANT.</span>
    <span>TOTAL</span>
  </div>

  ${receipt.items
    .map(
      (it) => `
    <div style="margin-bottom: 4px;">
      <div style="display: flex; justify-content: space-between; font-weight: bold;">
        <span>${escapeHtml(it.displayName)}${it.presentationName ? ` (${escapeHtml(it.presentationName)})` : ''}</span>
        <span>${escapeHtml(it.lineTotalFormatted)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 0.9em; color: #333333;">
        <span>${escapeHtml(it.quantityFormatted)} × ${escapeHtml(it.unitPriceFormatted)}</span>
        ${it.discountFormatted ? `<span style="color: #047857; font-weight: bold;">Desc: -${escapeHtml(it.discountFormatted)}</span>` : ''}
      </div>
    </div>
  `
    )
    .join('')}

  <div style="border-bottom: 1px dashed #000000; margin: 6px 0;"></div>
  `
      : ''
  }

  <div>
    <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span style="font-weight: bold;">${escapeHtml(receipt.subtotalFormatted || '$0')}</span></div>
    ${receipt.discountFormatted ? `<div style="display: flex; justify-content: space-between; color: #047857; font-weight: bold;"><span>Descuento:</span><span>-${escapeHtml(receipt.discountFormatted)}</span></div>` : ''}
    ${receipt.taxFormatted ? `<div style="display: flex; justify-content: space-between;"><span>Impuestos:</span><span style="font-weight: bold;">${escapeHtml(receipt.taxFormatted)}</span></div>` : ''}
    <div style="display: flex; justify-content: space-between; font-size: 1.2em; font-weight: bold; margin-top: 4px; padding-top: 4px; border-top: 1px solid #000000;"><span>TOTAL:</span><span>${escapeHtml(receipt.totalFormatted || '$0')}</span></div>
  </div>

  <div style="border-bottom: 1px dashed #000000; margin: 6px 0;"></div>

  ${
    receipt.payments && receipt.payments.length > 0
      ? `
  <div>
    <div style="font-weight: bold; font-size: 0.9em; margin-bottom: 2px;">FORMA DE PAGO:</div>
    ${receipt.payments
      .map(
        (p) => `
      <div>
        <div style="display: flex; justify-content: space-between;"><span>${escapeHtml(p.methodName)}:</span><span style="font-weight: bold;">${escapeHtml(p.amountFormatted)}</span></div>
        ${p.receivedFormatted ? `<div style="display: flex; justify-content: space-between; padding-left: 8px; font-size: 0.9em;"><span>Recibido:</span><span>${escapeHtml(p.receivedFormatted)}</span></div>` : ''}
        ${p.changeFormatted ? `<div style="display: flex; justify-content: space-between; padding-left: 8px; font-size: 0.9em; font-weight: bold; color: #047857;"><span>Vuelto:</span><span>${escapeHtml(p.changeFormatted)}</span></div>` : ''}
      </div>
    `
      )
      .join('')}
  </div>

  <div style="border-bottom: 1px dashed #000000; margin: 6px 0;"></div>
  `
      : ''
  }

  <div style="text-align: center; font-size: 0.9em; margin-top: 6px;">
    ${receipt.note ? `<div style="font-style: italic; margin-bottom: 4px;">Nota: ${escapeHtml(receipt.note)}</div>` : ''}
    <div style="font-weight: bold;">¡Gracias por su compra!</div>
    <div>SevenPOS · Sistema de Punto de Venta</div>
  </div>
</div>
  `.trim();
}

export function generateReceiptHtml(receipt: ReceiptDTO, format: '80mm' | '58mm' = '80mm'): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante de Venta #${escapeHtml(receipt.saleNumber || '')}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @media print {
      body { width: 100%; padding: 0; margin: 0; }
      @page { margin: 0; size: auto; }
    }
  </style>
</head>
<body style="background: #ffffff; margin: 0; padding: 0;">
  ${generateReceiptFragmentHtml(receipt, format)}
</body>
</html>
  `.trim();
}

function escapeHtml(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class ReceiptPrintService {
  static async printReceipt(receipt: ReceiptDTO, format: '80mm' | '58mm' = '80mm'): Promise<PrintResult> {
    const payload = formatReceiptText(receipt, format);
    logger.info('ReceiptPrintService', `Printing receipt #${receipt.saleNumber} (${format})`);

    if (typeof window !== 'undefined') {
      try {
        const printRoot = document.getElementById('sevenpos-print-root');
        if (printRoot) {
          printRoot.setAttribute('data-format', format);
          printRoot.innerHTML = generateReceiptFragmentHtml(receipt, format);
          window.print();
          return {
            success: true,
            targetFormat: format,
            driver: 'SYSTEM_DIALOG',
            timestamp: new Date().toISOString(),
            outputPayload: payload,
          };
        }

        let printIframe = document.getElementById('sevenpos-hidden-print-frame') as HTMLIFrameElement | null;
        if (!printIframe) {
          printIframe = document.createElement('iframe');
          printIframe.id = 'sevenpos-hidden-print-frame';
          printIframe.style.position = 'fixed';
          printIframe.style.right = '0';
          printIframe.style.bottom = '0';
          printIframe.style.width = '0';
          printIframe.style.height = '0';
          printIframe.style.border = '0';
          document.body.appendChild(printIframe);
        }

        const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(generateReceiptHtml(receipt, format));
          iframeDoc.close();

          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();

          return {
            success: true,
            targetFormat: format,
            driver: 'SYSTEM_DIALOG',
            timestamp: new Date().toISOString(),
            outputPayload: payload,
          };
        }
      } catch (err) {
        logger.warn('ReceiptPrintService', 'Print invocation failed, falling back to mock result', { error: String(err) });
        return {
          success: false,
          targetFormat: format,
          driver: 'SYSTEM_DIALOG',
          timestamp: new Date().toISOString(),
          error: err instanceof Error ? err.message : String(err),
          outputPayload: payload,
        };
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
}
