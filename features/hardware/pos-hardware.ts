import type { ReceiptData } from "@/features/receipts/types";

export type PosPrinterTransport = "browser-print" | "usb-escpos" | "bluetooth-escpos" | "android-bridge";

export type PosPrinterDevice = {
  id: string;
  name: string;
  transport: PosPrinterTransport;
  paperWidth: "58mm" | "80mm";
};

export type PrintJob = {
  receipt: ReceiptData;
  device?: PosPrinterDevice;
};

export async function printWithBrowser() {
  if (typeof window !== "undefined") {
    window.print();
  }
}

export async function prepareEscPosPrintJob(job: PrintJob) {
  void job;

  return {
    supported: false,
    reason: "ESC/POS directo queda preparado para una integracion USB/Bluetooth futura.",
  };
}
