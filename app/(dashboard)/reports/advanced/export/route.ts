import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import type { PaymentMethod } from "@prisma/client";
import { decimalToNumber, money } from "@/features/pos/format";
import { toCsv } from "@/features/reports/export";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

function escapeHtml(value: unknown) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function parseDateRange(params: URLSearchParams) {
  const from = params.get("from") ? new Date(String(params.get("from"))) : new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
  const to = params.get("to") ? new Date(String(params.get("to"))) : new Date();
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export async function GET(request: Request) {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) return new NextResponse("Unauthorized", { status: 401 });

  const params = new URL(request.url).searchParams;
  const format = params.get("format") ?? "csv";
  const { from, to } = parseDateRange(params);
  const branchId = params.get("branchId") === "ALL" ? undefined : params.get("branchId") || undefined;
  const cashierId = params.get("cashierId") === "ALL" ? undefined : params.get("cashierId") || undefined;
  const paymentMethod = params.get("paymentMethod") === "ALL" ? undefined : params.get("paymentMethod") || undefined;

  const saleWhere = {
    businessId: tenant.businessId,
    createdAt: { gte: from, lte: to },
    ...(branchId ? { branchId } : {}),
    ...(cashierId ? { cashierId } : {}),
    ...(paymentMethod ? { paymentMethod: paymentMethod as PaymentMethod } : {}),
  };

  const sales = await prisma.sale.findMany({
    where: saleWhere,
    take: 3000,
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      paymentMethod: true,
      total: true,
      subtotal: true,
      branch: { select: { name: true } },
      cashier: { select: { fullName: true, email: true } },
      _count: { select: { items: true } },
    },
  });

  const products = await prisma.product.findMany({
    where: { businessId: tenant.businessId },
    take: 3000,
    select: { name: true, sku: true, barcode: true, stock: true, lowStockAlert: true, priceUsd: true, isActive: true, isPublic: true, category: { select: { name: true } } },
  });

  const categories = await prisma.category.findMany({
    where: { businessId: tenant.businessId },
    select: { name: true, _count: { select: { products: true } } },
  });

  const inventory = await prisma.branchInventory.findMany({
    where: { businessId: tenant.businessId, ...(branchId ? { branchId } : {}) },
    take: 3000,
    select: { stock: true, lowStockAlert: true, branch: { select: { name: true } }, product: { select: { name: true, sku: true } } },
  });

  const customers = await prisma.customer.findMany({
    where: { businessId: tenant.businessId },
    take: 3000,
    select: { name: true, phone: true, email: true, createdAt: true },
  });

  const cashMovements = await prisma.cashMovement.findMany({
    where: { businessId: tenant.businessId, createdAt: { gte: from, lte: to }, ...(branchId ? { branchId } : {}) },
    take: 3000,
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, type: true, amountUsd: true, amountBs: true, note: true, branch: { select: { name: true } }, createdBy: { select: { email: true } } },
  });

  const salesRows = sales.map((sale) => ({
    fecha: sale.createdAt.toISOString(),
    sucursal: sale.branch?.name ?? "",
    cajero: sale.cashier.fullName ?? sale.cashier.email,
    Método: sale.paymentMethod,
    items: sale._count.items,
    subtotal_usd: decimalToNumber(sale.subtotal),
    total_usd: decimalToNumber(sale.total),
  }));

  const csvHeaders = ["fecha", "sucursal", "cajero", "Método", "items", "subtotal_usd", "total_usd"];
  const csvRows = salesRows.map((row) => csvHeaders.map((key) => row[key as keyof typeof row]));

  if (format === "excel") {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(salesRows), "Ventas");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(products.map((product) => ({
      nombre: product.name,
      sku: product.sku,
      barcode: product.barcode,
      categoría: product.category?.name ?? "",
      precio_usd: decimalToNumber(product.priceUsd),
      stock: product.stock,
      alerta_bajo_stock: product.lowStockAlert,
      activo: product.isActive ? "si" : "no",
      tienda_online: product.isPublic ? "si" : "no",
    }))), "Productos");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(categories.map((category) => ({ categoría: category.name, productos: category._count.products }))), "categorías");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(inventory.map((item) => ({
      sucursal: item.branch.name,
      producto: item.product.name,
      sku: item.product.sku,
      stock: decimalToNumber(item.stock),
      alerta: decimalToNumber(item.lowStockAlert),
    }))), "Inventario");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(customers.map((customer) => ({
      nombre: customer.name,
      Teléfono: customer.phone,
      email: customer.email,
      creado: customer.createdAt.toISOString(),
    }))), "Clientes");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(cashMovements.map((movement) => ({
      fecha: movement.createdAt.toISOString(),
      sucursal: movement.branch?.name ?? "",
      tipo: movement.type,
      usd: decimalToNumber(movement.amountUsd),
      bs: decimalToNumber(movement.amountBs),
      nota: movement.note,
      operador: movement.createdBy.email,
    }))), "Caja");

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="sevenpos-report-${Date.now()}.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    const totalSales = sales.reduce((sum, sale) => sum + decimalToNumber(sale.total), 0);
    const htmlRows = salesRows
      .slice(0, 120)
      .map((row) => `<tr>${csvHeaders.map((header) => `<td>${escapeHtml(row[header as keyof typeof row])}</td>`).join("")}</tr>`)
      .join("");

    return new NextResponse(`<!doctype html><html><head><meta charset="utf-8"><title>SevenPOS Reporte</title><style>
      body{font-family:Inter,Arial,sans-serif;margin:0;background:#f5f7fb;color:#0f172a}
      .page{max-width:960px;margin:0 auto;padding:32px}
      .brand{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #dbe3ef;padding-bottom:18px;margin-bottom:18px}
      .logo{font-weight:900;color:#1357ff;letter-spacing:.08em}
      h1{font-size:26px;margin:8px 0 4px} p{color:#64748b}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0}
      .card{background:white;border:1px solid #dbe3ef;border-radius:8px;padding:14px}
      .label{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#64748b;font-weight:800}.value{font-size:22px;font-weight:900;margin-top:6px}
      table{width:100%;border-collapse:collapse;background:white;border:1px solid #dbe3ef;border-radius:8px;overflow:hidden}th,td{border-bottom:1px solid #e6edf5;padding:9px;text-align:left;font-size:12px}th{color:#64748b;text-transform:uppercase;font-size:10px;letter-spacing:.1em}
      @media print{body{background:white}.page{padding:0}@page{margin:14mm}}
    </style></head><body><main class="page"><section class="brand"><div><div class="logo">SEVENPOS</div><h1>Reporte ejecutivo</h1><p>${escapeHtml(tenant.currentBusiness?.name ?? "Negocio")} Â· ${from.toLocaleDateString("es-CL")} - ${to.toLocaleDateString("es-CL")}</p></div><strong>${new Date().toLocaleString("es-CL")}</strong></section><section class="grid"><div class="card"><div class="label">Ventas</div><div class="value">${money(totalSales, "USD")}</div></div><div class="card"><div class="label">Transacciones</div><div class="value">${sales.length}</div></div><div class="card"><div class="label">Ticket promedio</div><div class="value">${money(sales.length ? totalSales / sales.length : 0, "USD")}</div></div></section><table><thead><tr>${csvHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${htmlRows}</tbody></table><script>window.print()</script></main></body></html>`, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse(toCsv(csvHeaders, csvRows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="sevenpos-report-${Date.now()}.csv"`,
    },
  });
}
