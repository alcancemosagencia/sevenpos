import { getCurrentBranchForUser } from "@/features/branches/branch-context";
import { PreSalesClient } from "@/features/presales/pre-sales-client";
import { decimalToNumber } from "@/features/pos/format";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

export default async function PreSalesPage() {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) return null;

  const branch = await getCurrentBranchForUser(tenant.businessId, tenant.currentUser.id);
  const products = await prisma.product.findMany({
    where: { businessId: tenant.businessId, isActive: true },
    include: {
      category: true,
      branchInventory: {
        where: { branchId: branch.id },
        take: 1,
      },
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    take: 200,
  });
  const categories = await prisma.category.findMany({
    where: { businessId: tenant.businessId },
    orderBy: { name: "asc" },
  });
  const preSales = await prisma.preSale.findMany({
    where: { businessId: tenant.businessId, branchId: branch.id, status: "OPEN" },
    include: { createdBy: true, items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <PreSalesClient
      branchName={branch.name}
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
      categories={categories.map((category) => ({ id: category.id, name: category.name }))}
      openPreSales={preSales.map((preSale) => ({
        id: preSale.id,
        code: preSale.code,
        totalUsd: decimalToNumber(preSale.totalUsd),
        itemCount: preSale.items.reduce((sum, item) => sum + decimalToNumber(item.quantity), 0),
        createdBy: preSale.createdBy.fullName ?? preSale.createdBy.email,
        notes: preSale.notes,
        items: preSale.items.map((item) => ({
          id: item.id,
          name: item.product.name,
          quantity: decimalToNumber(item.quantity),
          subtotalUsd: decimalToNumber(item.subtotalUsd),
        })),
      }))}
    />
  );
}
