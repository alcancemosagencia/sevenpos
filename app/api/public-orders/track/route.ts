import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessSlug = searchParams.get("slug");
  const phone = (searchParams.get("phone") ?? "").replace(/\D/g, "");
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);

  if (!businessSlug || (ids.length === 0 && !phone)) {
    return NextResponse.json({ ok: true, orders: [] });
  }

  const orders = await prisma.publicOrder.findMany({
    where: {
      ...(ids.length ? { id: { in: ids } } : {}),
      ...(ids.length === 0 && phone ? { customerPhone: { contains: phone } } : {}),
      business: { slug: businessSlug },
    },
    select: {
      id: true,
      code: true,
      status: true,
      total: true,
      createdAt: true,
      updatedAt: true,
      fulfillmentMethod: true,
      paymentMethod: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    ok: true,
    orders: orders.map((order) => ({
      id: order.id,
      code: order.code,
      status: order.status,
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      fulfillmentMethod: order.fulfillmentMethod,
      paymentMethod: order.paymentMethod,
    })),
  });
}
