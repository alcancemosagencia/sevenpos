import { NextResponse } from "next/server";
import type { PublicOrderStatus } from "@prisma/client";
import { publicOrderStatuses } from "@/features/orders/types";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { requireTenantContext } from "@/lib/tenant";

type StatusRequest = {
  orderId?: string;
  status?: PublicOrderStatus;
};

export async function POST(request: Request) {
  const tenant = await requireTenantContext();

  if (!tenant.businessId || !can(tenant.currentUser.role, "sales:view")) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  const payload = (await request.json()) as StatusRequest;
  const orderId = typeof payload.orderId === "string" ? payload.orderId : "";
  const status = payload.status;

  if (!orderId || !status || !publicOrderStatuses.includes(status)) {
    return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  }

  const updated = await prisma.publicOrder.updateMany({
    where: {
      id: orderId,
      businessId: tenant.businessId,
    },
    data: { status },
  });

  if (updated.count === 0) {
    return NextResponse.json({ ok: false, error: "Pedido no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, status });
}
