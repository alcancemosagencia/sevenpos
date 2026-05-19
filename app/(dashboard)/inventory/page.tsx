import { InventoryClient } from "@/features/backoffice/inventory-client";
import { getCurrentBranchForUser } from "@/features/branches/branch-context";
import { decimalToNumber } from "@/features/pos/format";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

export default async function InventoryPage() {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) return null;
  const branch = await getCurrentBranchForUser(tenant.businessId, tenant.currentUser.id);

  const products = await prisma.product.findMany({
    where: { businessId: tenant.businessId },
    include: {
      category: true,
      branchInventory: {
        where: { branchId: branch.id },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <InventoryClient
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        categoryName: product.category?.name ?? null,
        stock: decimalToNumber(product.branchInventory[0]?.stock ?? product.stock),
        lowStockAlert: decimalToNumber(product.branchInventory[0]?.lowStockAlert ?? product.lowStockAlert),
      }))}
    />
  );
}
