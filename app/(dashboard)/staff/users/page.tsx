import { StaffUsersClient } from "@/features/staff/staff-users-client";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

export default async function StaffUsersPage() {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) return null;

  const users = await prisma.user.findMany({
    where: { businessId: tenant.businessId },
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
    select: {
      id: true,
      clerkUserId: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastAccessAt: true,
      branches: { select: { isDefault: true, branch: { select: { id: true, name: true } } }, orderBy: { isDefault: "desc" } },
      accessRoles: { select: { role: { select: { id: true, name: true, slug: true } } } },
    },
  });

  const branches = await prisma.branch.findMany({
    where: { businessId: tenant.businessId, isActive: true },
    orderBy: [{ isMain: "desc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  const roles = await prisma.accessRole.findMany({
    where: { businessId: tenant.businessId },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true },
  });

  return (
    <StaffUsersClient
      users={users.map((user) => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
        lastAccessAt: user.lastAccessAt?.toISOString() ?? null,
      }))}
      branches={branches}
      roles={roles}
    />
  );
}
