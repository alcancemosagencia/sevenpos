import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { decimalToNumber, money } from "@/features/pos/format";
import { AutoPrint, PrintReceiptButton } from "@/features/receipts/receipt-actions";
import { ReceiptTemplate } from "@/features/receipts/receipt-template";
import type { ReceiptData } from "@/features/receipts/types";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

const paymentLabels = {
  CASH_USD: "Efectivo USD",
  CASH_BS: "Efectivo Bs",
  MOBILE_PAYMENT: "Pago movil",
  BANK_TRANSFER: "Transferencia",
};

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ saleId: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { saleId } = await params;
  const query = await searchParams;
  const tenant = await requireTenantContext();

  if (!tenant.businessId) return null;

  const sale = await prisma.sale.findFirst({
    where: {
      id: saleId,
      businessId: tenant.businessId,
    },
    include: {
      business: true,
      cashier: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!sale) {
    notFound();
  }

  const exchangeRate = decimalToNumber(sale.business.exchangeRate);
  const totalUsd = sale.currency === "USD" ? decimalToNumber(sale.total) : decimalToNumber(sale.total) / exchangeRate;
  const subtotalUsd = sale.currency === "USD" ? decimalToNumber(sale.subtotal) : decimalToNumber(sale.subtotal) / exchangeRate;
  const taxUsd = sale.currency === "USD" ? decimalToNumber(sale.taxTotal) : decimalToNumber(sale.taxTotal) / exchangeRate;
  const tipUsd = sale.currency === "USD" ? decimalToNumber(sale.tipTotal) : decimalToNumber(sale.tipTotal) / exchangeRate;
  const receipt: ReceiptData = {
    id: sale.id,
    businessName: sale.business.name,
    businessPhone: sale.business.phone,
    businessEmail: sale.business.email,
    cashierName: sale.cashier.fullName ?? sale.cashier.email,
    createdAt: sale.createdAt,
    exchangeRate,
    subtotalUsd,
    taxUsd,
    tipUsd,
    totalUsd,
    totalBs: totalUsd * exchangeRate,
    payment: {
      method: paymentLabels[sale.paymentMethod],
    },
    items: sale.items.map((item) => {
      const unitPrice = decimalToNumber(item.unitPrice);
      const unitPriceUsd = sale.currency === "USD" ? unitPrice : unitPrice / exchangeRate;

      return {
        name: item.product.name,
        quantity: item.quantity,
        unitPriceUsd,
        subtotalUsd: unitPriceUsd * item.quantity,
      };
    }),
  };

  return (
    <section className="mx-auto w-full max-w-xl space-y-3">
      <AutoPrint enabled={query.print === "1"} />
      <div className="no-print flex items-center justify-between gap-3">
        <Button asChild variant="ghost" className="px-2">
          <Link href="/reports">
            <ArrowLeft className="size-4" />
            Reportes
          </Link>
        </Button>
        <PrintReceiptButton label="Imprimir / PDF" />
      </div>

      <div className="no-print rounded-lg border bg-card p-4 shadow-[0_8px_24px_hsl(220_20%_10%/0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Ticket</p>
        <h1 className="mt-1 text-xl font-semibold">{money(receipt.totalUsd, "USD")}</h1>
        <p className="text-sm text-muted-foreground">
          Bs {receipt.totalBs.toFixed(2)} - {receipt.payment.method}
        </p>
      </div>

      <div className="receipt-print-area">
        <ReceiptTemplate receipt={receipt} size="58" />
      </div>
      <div className="no-print rounded-lg border bg-white p-4 shadow-[0_8px_24px_hsl(220_20%_10%/0.06)]">
        <ReceiptTemplate receipt={receipt} size="58" />
      </div>
    </section>
  );
}
