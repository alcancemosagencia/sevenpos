import { ReceiptDTO } from '../../../domain/sales/Receipt';

export interface PrintResult {
  success: boolean;
  targetFormat: '80mm' | '58mm';
  driver: 'WINDOWS_SPOOLER' | 'SYSTEM_DIALOG' | 'MOCK_PRINTER';
  timestamp: string;
  outputPayload?: string;
  error?: string;
}

export interface PrintPort {
  printTestPage(format?: '80mm' | '58mm'): Promise<PrintResult>;
  printReceipt(receipt: ReceiptDTO, format?: '80mm' | '58mm'): Promise<PrintResult>;
}
