import { NextResponse } from "next/server";
import { createPreSaleAction } from "@/features/presales/actions";
import { requireTenantContext } from "@/lib/tenant";

type OfflinePreSalePayload = {
  notes?: string;
  items?: Array<{ productId?: string; quantity?: number }>;
};

export async function POST(request: Request) {
  try {
    await requireTenantContext();
    const payload = (await request.json()) as OfflinePreSalePayload;
    const items = (payload.items ?? [])
      .map((item) => ({
        productId: String(item.productId ?? ""),
        quantity: Math.max(0.001, Number(item.quantity ?? 0)),
      }))
      .filter((item) => item.productId && Number.isFinite(item.quantity));

    if (items.length === 0) {
      return NextResponse.json({ ok: false, error: "Preventa offline incompleta." }, { status: 400 });
    }

    const formData = new FormData();
    formData.set("items", JSON.stringify(items));
    formData.set("notes", payload.notes ?? "");

    const code = await createPreSaleAction(formData);
    return NextResponse.json({ ok: true, code });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "No pudimos sincronizar la preventa." },
      { status: 409 },
    );
  }
}
