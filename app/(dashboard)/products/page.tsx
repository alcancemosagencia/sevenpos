import { decimalToNumber } from "@/features/pos/format";
import { ProductManager } from "@/features/products/product-manager";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

export default async function ProductsPage() {
  const tenant = await requireTenantContext();

  if (!tenant.businessId) {
    return null;
  }

  const products = await prisma.product.findMany({
    where: { businessId: tenant.businessId },
    include: { category: true },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    take: 500,
  });
  const categories = await prisma.category.findMany({
    where: { businessId: tenant.businessId },
    orderBy: { name: "asc" },
  });

  return (
      <ProductManager
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          imageUrl: product.imageUrl,
          categoryId: product.categoryId,
          categoryName: product.category?.name ?? null,
          priceUsd: decimalToNumber(product.priceUsd),
          priceBs: decimalToNumber(product.priceBs),
          stock: product.stock,
          lowStockAlert: product.lowStockAlert,
          sku: product.sku,
          barcode: product.barcode,
          isActive: product.isActive,
          isPublic: product.isPublic,
          allowVariablePrice: product.allowVariablePrice,
          soldByWeight: product.soldByWeight,
          unit: product.unit,
        }))}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
      />
  );
}
