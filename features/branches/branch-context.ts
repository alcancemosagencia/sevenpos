import { prisma } from "@/lib/prisma";

export async function getOrCreateMainBranch(businessId: string, defaults?: {
  businessName?: string;
  currency?: string;
  exchangeRate?: string | number;
}) {
  const existing = await prisma.branch.findFirst({
    where: {
      businessId,
      isActive: true,
    },
    orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
  });

  if (existing) return existing;

  return prisma.branch.create({
    data: {
      businessId,
      name: defaults?.businessName ? `${defaults.businessName} Principal` : "Sucursal Principal",
      slug: "principal",
      currency: defaults?.currency ?? "USD",
      exchangeRate: (defaults?.exchangeRate ?? 1).toString(),
      isMain: true,
      isActive: true,
    },
  });
}

export async function getCurrentBranchForUser(businessId: string, userId: string) {
  const userBranch = await prisma.userBranch.findFirst({
    where: {
      userId,
      branch: {
        businessId,
        isActive: true,
      },
    },
    include: {
      branch: true,
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  if (userBranch) return userBranch.branch;

  const branch = await getOrCreateMainBranch(businessId);

  await prisma.userBranch.upsert({
    where: {
      userId_branchId: {
        userId,
        branchId: branch.id,
      },
    },
    create: {
      userId,
      branchId: branch.id,
      isDefault: true,
    },
    update: {
      isDefault: true,
    },
  });

  return branch;
}

export async function ensureBranchInventoryFromProducts(businessId: string, branchId: string) {
  const products = await prisma.product.findMany({
    where: { businessId },
    select: { id: true, stock: true, lowStockAlert: true },
  });

  if (products.length === 0) return;

  const existing = await prisma.branchInventory.findMany({
    where: { businessId, branchId, productId: { in: products.map((product) => product.id) } },
    select: { productId: true },
  });
  const existingProductIds = new Set(existing.map((item) => item.productId));
  const missingProducts = products.filter((product) => !existingProductIds.has(product.id));

  if (missingProducts.length === 0) return;

  await prisma.branchInventory.createMany({
    data: missingProducts.map((product) => ({
        businessId,
        branchId,
        productId: product.id,
        stock: product.stock.toString(),
        lowStockAlert: product.lowStockAlert.toString(),
    })),
    skipDuplicates: true,
  });
}
