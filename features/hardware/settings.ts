import { prisma } from "@/lib/prisma";

export type HardwareSettings = {
  ticketSize: "58" | "80";
  autoPrint: boolean;
  cashPrinterName: string | null;
  kitchenPrinterName: string | null;
  openDrawerOnCash: boolean;
  copies: number;
  ticketLogoUrl: string | null;
  ticketFooter: string;
  scannerEnabled: boolean;
  customerDisplay: boolean;
  kioskMode: boolean;
  advancedHardware: boolean;
};

export async function getHardwareSettings(businessId: string): Promise<HardwareSettings> {
  const settings = await prisma.businessHardwareSettings.upsert({
    where: { businessId },
    create: { businessId },
    update: {},
  });

  return {
    ticketSize: settings.ticketSize === "80" ? "80" : "58",
    autoPrint: settings.autoPrint,
    cashPrinterName: settings.cashPrinterName,
    kitchenPrinterName: settings.kitchenPrinterName,
    openDrawerOnCash: settings.openDrawerOnCash,
    copies: settings.copies,
    ticketLogoUrl: settings.ticketLogoUrl,
    ticketFooter: settings.ticketFooter,
    scannerEnabled: settings.scannerEnabled,
    customerDisplay: settings.customerDisplay,
    kioskMode: settings.kioskMode,
    advancedHardware: settings.advancedHardware,
  };
}
