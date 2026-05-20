import { NextResponse } from "next/server";
import { performCheckout } from "@/features/pos/checkout-service";
import { requireTenantContext } from "@/lib/tenant";
import type { PaymentMethod } from "@/features/pos/types";

type OfflineSalePayload = {
  businessId?: string;
  paymentMethod?: PaymentMethod;
  currency?: "USD" | "BS";
  cashReceivedUsd?: number;
  cashReceivedBs?: number;
  preSaleId?: string | null;
  items?: Array<{ productId?: string; quantity?: number }>;
};

export async function POST(request: Request) {
  try {
    const tenant = await requireTenantContext();
    const payload = (await request.json()) as OfflineSalePayload;

    if (!tenant.businessId || payload.businessId !== tenant.businessId) {
      return NextResponse.json({ ok: false, error: "La venta offline no pertenece a este negocio." }, { status: 403 });
    }

    const items = (payload.items ?? [])
      .map((item) => ({
        productId: String(item.productId ?? ""),
        quantity: Math.max(0.001, Number(item.quantity ?? 0)),
      }))
      .filter((item) => item.productId && Number.isFinite(item.quantity));

    if (items.length === 0 || !payload.paymentMethod || !payload.currency) {
      return NextResponse.json({ ok: false, error: "Venta offline incompleta." }, { status: 400 });
    }

    const result = await performCheckout({
      paymentMethod: payload.paymentMethod,
      currency: payload.currency,
      cashReceivedUsd: payload.cashReceivedUsd,
      cashReceivedBs: payload.cashReceivedBs,
      preSaleId: payload.preSaleId ?? null,
      items,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error ?? "Conflicto al sincronizar venta." }, { status: 409 });
    }

    return NextResponse.json({ ok: true, saleId: result.saleId });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "No pudimos sincronizar la venta." },
      { status: 500 },
    );
  }
}
