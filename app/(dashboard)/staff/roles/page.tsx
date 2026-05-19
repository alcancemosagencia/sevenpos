import { StaffRolesClient } from "@/features/staff/staff-roles-client";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

export default async function StaffRolesPage() {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) return null;

  const roles = await prisma.accessRole.findMany({
    where: { businessId: tenant.businessId },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isSystem: true,
      permissions: { select: { section: true, action: true } },
      _count: { select: { users: true } },
    },
  });

  return (
    <StaffRolesClient
      roles={roles.map((role) => ({
        id: role.id,
        name: role.name,
        slug: role.slug,
        description: role.description,
        isSystem: role.isSystem,
        usersCount: role._count.users,
        permissions: role.permissions,
      }))}
    />
  );
}
