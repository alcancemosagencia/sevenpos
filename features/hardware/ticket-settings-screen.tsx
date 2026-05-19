import { Cpu, Monitor, Printer, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateHardwareSettingsAction } from "@/features/hardware/actions";
import { getHardwareSettings } from "@/features/hardware/settings";
import { ReceiptTemplate } from "@/features/receipts/receipt-template";
import { requireTenantContext } from "@/lib/tenant";

export async function TicketSettingsScreen() {
  const tenant = await requireTenantContext();
  if (!tenant.businessId || !tenant.currentBusiness) return null;
  const settings = await getHardwareSettings(tenant.businessId);

  const previewReceipt = {
    id: "preview-ticket",
    businessName: tenant.currentBusiness.name,
    businessPhone: tenant.currentBusiness.phone,
    businessEmail: tenant.currentBusiness.email,
    businessAddress: tenant.currentBusiness.address ?? "Sucursal principal",
    businessTaxId: "RIF/RUT",
    branchName: "Caja principal",
    cashierName: tenant.currentUser.fullName ?? tenant.currentUser.email,
    createdAt: new Date(),
    exchangeRate: Number(tenant.currentBusiness.exchangeRate.toString()),
    subtotalUsd: 3.2,
    taxUsd: 0,
    discountUsd: 0,
    totalUsd: 3.2,
    totalBs: 3.2 * Number(tenant.currentBusiness.exchangeRate.toString()),
    payment: { method: "Efectivo USD", receivedUsd: 5, changeUsd: 1.8 },
    items: [
      { name: "Coca Cola LATA", quantity: 1, unitPriceUsd: 1.2, subtotalUsd: 1.2 },
      { name: "Cafe molido", quantity: 1, unitPriceUsd: 2, subtotalUsd: 2 },
    ],
    footer: settings.ticketFooter,
    logoUrl: settings.ticketLogoUrl,
    qrValue: tenant.currentBusiness.id,
  };

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Configuración</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">Ticket</h1>
          <p className="mt-1 text-sm text-muted-foreground">Impresion, recibos, scanner, display cliente y modo kiosk.</p>
        </div>

        <form action={updateHardwareSettingsAction} className="space-y-4">
          <Card className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <Printer className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Impresion termica</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                Tamano ticket
                <select name="ticketSize" defaultValue={settings.ticketSize} className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-medium text-foreground">
                  <option value="58">58mm</option>
                  <option value="80">80mm</option>
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                Copias
                <Input name="copies" type="number" min="1" max="4" defaultValue={settings.copies} className="h-10" />
              </label>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                Impresora caja
                <Input name="cashPrinterName" defaultValue={settings.cashPrinterName ?? ""} placeholder="EPSON TM-T20 / LAN 192.168..." className="h-10" />
              </label>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                Impresora cocina
                <Input name="kitchenPrinterName" defaultValue={settings.kitchenPrinterName ?? ""} placeholder="Kitchen printer" className="h-10" />
              </label>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground sm:col-span-2">
                Logo ticket URL
                <Input name="ticketLogoUrl" defaultValue={settings.ticketLogoUrl ?? ""} placeholder="https://..." className="h-10" />
              </label>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground sm:col-span-2">
                Footer ticket
                <Input name="ticketFooter" defaultValue={settings.ticketFooter} className="h-10" />
              </label>
            </div>
          </Card>

          <Card className="grid gap-2 p-4 sm:grid-cols-2">
            {[
              ["autoPrint", "Auto imprimir al cobrar", settings.autoPrint],
              ["openDrawerOnCash", "Abrir gaveta en efectivo", settings.openDrawerOnCash],
              ["scannerEnabled", "Scanner activo", settings.scannerEnabled],
              ["customerDisplay", "Customer display", settings.customerDisplay],
              ["kioskMode", "Modo kiosk POS", settings.kioskMode],
              ["advancedHardware", "ESC/POS avanzado", settings.advancedHardware],
            ].map(([name, label, checked]) => (
              <label key={String(name)} className="flex min-h-11 items-center justify-between rounded-lg border bg-background px-3 text-sm font-semibold">
                <span>{label}</span>
                <input name={String(name)} type="checkbox" defaultChecked={Boolean(checked)} className="size-4 accent-primary" />
              </label>
            ))}
          </Card>

          <Card className="grid gap-2 p-4 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/55 p-3">
              <ScanLine className="mb-2 size-4 text-primary" />
              <p className="text-sm font-semibold">Scanner</p>
              <p className="text-xs text-muted-foreground">USB/Bluetooth y Cámara preparados.</p>
            </div>
            <div className="rounded-lg bg-muted/55 p-3">
              <Monitor className="mb-2 size-4 text-primary" />
              <p className="text-sm font-semibold">Display cliente</p>
              <p className="text-xs text-muted-foreground">Sincronizado local, websocket-ready.</p>
            </div>
            <div className="rounded-lg bg-muted/55 p-3">
              <Cpu className="mb-2 size-4 text-primary" />
              <p className="text-sm font-semibold">ESC/POS</p>
              <p className="text-xs text-muted-foreground">Comandos drawer/kitchen listos para adapter.</p>
            </div>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="h-11 w-full sm:w-auto">Guardar ticket</Button>
            <Button type="button" variant="outline" className="h-11 w-full sm:w-auto">
              Imprimir prueba
            </Button>
          </div>
        </form>
      </div>

      <Card className="h-fit bg-[hsl(220_18%_92%)] p-4">
        <p className="mb-3 text-sm font-semibold">Preview ticket</p>
        <div className="rounded-lg bg-white p-4 shadow-inner">
          <ReceiptTemplate receipt={previewReceipt} size={settings.ticketSize} />
        </div>
      </Card>
    </section>
  );
}
