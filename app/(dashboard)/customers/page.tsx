import { ClientsClient } from "@/features/backoffice/clients-client";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

export default async function CustomersPage() {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) return null;

  const customers = await prisma.customer.findMany({
    where: { businessId: tenant.businessId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ClientsClient
      customers={customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        createdAt: customer.createdAt.toISOString(),
      }))}
    />
  );
}
