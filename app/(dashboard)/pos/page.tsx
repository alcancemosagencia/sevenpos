import { redirect } from "next/navigation";
import { getOpenCashSessionSummary } from "@/features/cash/queries";
import { ensureBranchInventoryFromProducts, getCurrentBranchForUser } from "@/features/branches/branch-context";
import { getHardwareSettings } from "@/features/hardware/settings";
import { decimalToNumber } from "@/features/pos/format";
import { PosClient } from "@/features/pos/pos-client";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PosPage() {
  const tenant = await requireTenantContext();

  if (!tenant.businessId || !tenant.currentBusiness) {
    redirect("/onboarding");
  }

  const branch = await getCurrentBranchForUser(tenant.businessId, tenant.currentUser.id);
  await ensureBranchInventoryFromProducts(tenant.businessId, branch.id);

  const products = await prisma.product.findMany({
    where: {
      businessId: tenant.businessId,
      isActive: true,
    },
    include: {
      category: true,
      branchInventory: {
        where: { branchId: branch.id },
        take: 1,
      },
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    take: 300,
  });
  const categories = await prisma.category.findMany({
    where: {
      businessId: tenant.businessId,
    },
    orderBy: { name: "asc" },
  });
  const cashSession = await getOpenCashSessionSummary(tenant.businessId, branch.id);
  const taxSettings = await prisma.businessTaxSettings.findUnique({
    where: { businessId: tenant.businessId },
    select: {
      taxesEnabled: true,
      ivaRate: true,
      customTaxRate: true,
      customTaxName: true,
      tipsEnabled: true,
      tipRate: true,
      tipMode: true,
    },
  });
  const preSales = await prisma.preSale.findMany({
    where: {
      businessId: tenant.businessId,
      branchId: branch.id,
      status: "OPEN",
      expiresAt: { gt: new Date() },
    },
    include: {
      createdBy: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  const hardwareSettings = await getHardwareSettings(tenant.businessId);

  if (!cashSession) {
    redirect("/cash/open");
  }

  return (
    <PosClient
      businessId={tenant.businessId}
      businessName={tenant.currentBusiness.name}
      businessPhone={tenant.currentBusiness.phone}
      businessEmail={tenant.currentBusiness.email}
      exchangeRate={decimalToNumber(tenant.currentBusiness.exchangeRate)}
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        categoryId: product.categoryId,
        categoryName: product.category?.name ?? null,
        priceUsd: decimalToNumber(product.priceUsd),
        priceBs: decimalToNumber(product.priceBs),
        stock: Math.trunc(decimalToNumber(product.branchInventory[0]?.stock ?? { toString: () => product.stock.toString() })),
        lowStockAlert: Math.trunc(decimalToNumber(product.branchInventory[0]?.lowStockAlert ?? { toString: () => product.lowStockAlert.toString() })),
        sku: product.sku,
        barcode: product.barcode,
        allowVariablePrice: product.allowVariablePrice,
        soldByWeight: product.soldByWeight,
        unit: product.unit,
        isPublic: product.isPublic,
        isActive: product.isActive,
      }))}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
      }))}
      preSales={preSales.map((preSale) => ({
        id: preSale.id,
        code: preSale.code,
        totalUsd: decimalToNumber(preSale.totalUsd),
        createdBy: preSale.createdBy.fullName ?? preSale.createdBy.email,
        items: preSale.items.map((item) => ({
          productId: item.productId,
          quantity: decimalToNumber(item.quantity),
        })),
      }))}
      cashSession={cashSession}
      cashierName={tenant.currentUser.fullName ?? tenant.currentUser.email}
      branchName={branch.name}
      hardwareSettings={hardwareSettings}
      taxSettings={taxSettings ? {
        taxesEnabled: taxSettings.taxesEnabled,
        taxRate: decimalToNumber(taxSettings.ivaRate) + decimalToNumber(taxSettings.customTaxRate),
        customTaxName: taxSettings.customTaxName,
        tipsEnabled: taxSettings.tipsEnabled,
        tipRate: decimalToNumber(taxSettings.tipRate),
        tipMode: taxSettings.tipMode,
      } : null}
    />
  );
}
