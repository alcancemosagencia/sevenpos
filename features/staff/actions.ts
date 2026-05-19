"use server";

import { revalidatePath } from "next/cache";
import { aclActions, aclSections } from "@/features/staff/acl";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { slugify } from "@/lib/slug";
import type { Role } from "@/types/auth";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireStaffManager() {
  const tenant = await requireTenantContext();
  if (!tenant.businessId || !can(tenant.currentUser.role, "staff:manage")) {
    throw new Error("No tienes permiso para gestionar personal.");
  }
  if (!tenant.hasFeature("usuarios") && !tenant.hasFeature("roles")) {
    throw new Error("Tu plan no incluye gestión de personal.");
  }
  return { ...tenant, businessId: tenant.businessId };
}

const appRoles: Role[] = ["OWNER", "ADMIN", "MANAGER", "CASHIER", "VENTA_APOYO", "BODEGA", "COCINA"];

function appRole(value: string): Role {
  return appRoles.includes(value as Role) ? (value as Role) : "CASHIER";
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function staffRevalidate() {
  revalidatePath("/staff");
  revalidatePath("/staff/users");
  revalidatePath("/staff/roles");
  revalidatePath("/staff/activity");
}

export async function saveAccessRoleAction(formData: FormData) {
  const tenant = await requireStaffManager();
  const roleId = text(formData, "roleId");
  const name = text(formData, "name");
  const slug = slugify(text(formData, "slug") || name);
  if (!name || !slug) return;

  const selected = new Set(formData.getAll("permission").filter((value): value is string => typeof value === "string"));
  const role = roleId
    ? await prisma.accessRole.update({
        where: { id: roleId, businessId: tenant.businessId },
        data: { name, slug, description: text(formData, "description") || null },
      })
    : await prisma.accessRole.upsert({
        where: { businessId_slug: { businessId: tenant.businessId, slug } },
        create: { businessId: tenant.businessId, name, slug, description: text(formData, "description") || null },
        update: { name, description: text(formData, "description") || null },
      });

  await prisma.accessPermission.deleteMany({ where: { roleId: role.id } });
  const permissions = Array.from(selected)
    .map((permission) => {
      const [section, action] = permission.split(":");
      if (!aclSections.includes(section as never) || !aclActions.includes(action as never)) return null;
      return { roleId: role.id, section, action };
    })
    .filter((permission): permission is { roleId: string; section: string; action: string } => Boolean(permission));

  if (permissions.length) {
    await prisma.accessPermission.createMany({ data: permissions, skipDuplicates: true });
  }

  staffRevalidate();
  return { ok: true, message: "Rol guardado" };
}

export async function duplicateAccessRoleAction(formData: FormData) {
  const tenant = await requireStaffManager();
  const roleId = text(formData, "roleId");
  if (!roleId) return { ok: false, error: "Rol requerido." };

  const role = await prisma.accessRole.findFirst({
    where: { id: roleId, businessId: tenant.businessId },
    include: { permissions: true },
  });

  if (!role) return { ok: false, error: "Rol no encontrado." };

  const baseSlug = slugify(`${role.slug}-copy`);
  const copy = await prisma.accessRole.create({
    data: {
      businessId: tenant.businessId,
      name: `${role.name} copia`,
      slug: `${baseSlug}-${Date.now().toString().slice(-4)}`,
      description: role.description,
    },
  });

  if (role.permissions.length) {
    await prisma.accessPermission.createMany({
      data: role.permissions.map((permission) => ({
        roleId: copy.id,
        section: permission.section,
        action: permission.action,
      })),
      skipDuplicates: true,
    });
  }

  staffRevalidate();
  return { ok: true, message: "Rol duplicado" };
}

export async function deleteAccessRoleAction(formData: FormData) {
  const tenant = await requireStaffManager();
  const roleId = text(formData, "roleId");
  if (!roleId) return { ok: false, error: "Rol requerido." };

  const role = await prisma.accessRole.findFirst({
    where: { id: roleId, businessId: tenant.businessId },
    select: { id: true, isSystem: true, _count: { select: { users: true } } },
  });

  if (!role) return { ok: false, error: "Rol no encontrado." };
  if (role.isSystem) return { ok: false, error: "No puedes eliminar un rol de sistema." };
  if (role._count.users > 0) return { ok: false, error: "Este rol tiene usuarios asignados." };

  await prisma.accessRole.delete({ where: { id: role.id } });
  staffRevalidate();
  return { ok: true, message: "Rol eliminado" };
}

export async function assignUserAccessRoleAction(formData: FormData) {
  const tenant = await requireStaffManager();
  const userId = text(formData, "userId");
  const roleId = text(formData, "roleId");
  if (!userId || !roleId) return;

  const user = await prisma.user.findFirst({ where: { id: userId, businessId: tenant.businessId }, select: { id: true } });
  const role = await prisma.accessRole.findFirst({ where: { id: roleId, businessId: tenant.businessId }, select: { id: true } });
  if (!user || !role) return;

  await prisma.userAccessRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    create: { userId, roleId },
    update: {},
  });

  staffRevalidate();
}

export async function removeUserAccessRoleAction(formData: FormData) {
  const tenant = await requireStaffManager();
  const userId = text(formData, "userId");
  const roleId = text(formData, "roleId");
  if (!userId || !roleId) return;

  const role = await prisma.accessRole.findFirst({ where: { id: roleId, businessId: tenant.businessId }, select: { id: true } });
  if (!role) return;

  await prisma.userAccessRole.deleteMany({ where: { userId, roleId } });
  staffRevalidate();
}

export async function saveStaffUserAction(formData: FormData) {
  const tenant = await requireStaffManager();
  const userId = text(formData, "userId");
  const fullName = text(formData, "fullName");
  const email = text(formData, "email").toLowerCase();
  const role = appRole(text(formData, "appRole"));
  const branchId = text(formData, "branchId");
  const accessRoleId = text(formData, "accessRoleId");
  const isActive = bool(formData, "isActive");

  if (!fullName || !email) return { ok: false, error: "Nombre y correo son obligatorios." };

  const branch = branchId
    ? await prisma.branch.findFirst({ where: { id: branchId, businessId: tenant.businessId }, select: { id: true } })
    : null;
  const accessRole = accessRoleId
    ? await prisma.accessRole.findFirst({ where: { id: accessRoleId, businessId: tenant.businessId }, select: { id: true } })
    : null;

  const existingOwner = userId
    ? await prisma.user.findFirst({ where: { id: userId, businessId: tenant.businessId }, select: { id: true, role: true } })
    : null;

  const safeRole = existingOwner?.role === "OWNER" ? "OWNER" : role;
  const safeIsActive = existingOwner?.role === "OWNER" ? true : isActive;

  const user = userId
    ? await prisma.user.update({
        where: { id: userId, businessId: tenant.businessId },
        data: { fullName, email, role: safeRole, isActive: safeIsActive },
        select: { id: true },
      })
    : await prisma.user.create({
        data: {
          clerkUserId: `pending:${tenant.businessId}:${email}`,
          businessId: tenant.businessId,
          fullName,
          email,
          role: safeRole,
          isActive: safeIsActive,
        },
        select: { id: true },
      });

  await prisma.userBranch.deleteMany({ where: { userId: user.id } });
  if (branch) {
    await prisma.userBranch.create({
      data: { userId: user.id, branchId: branch.id, isDefault: true },
    });
  }

  await prisma.userAccessRole.deleteMany({ where: { userId: user.id } });
  if (accessRole) {
    await prisma.userAccessRole.create({
      data: { userId: user.id, roleId: accessRole.id },
    });
  }

  staffRevalidate();
  return { ok: true, message: userId ? "Usuario actualizado" : "Usuario creado" };
}

export async function setStaffUserStatusAction(formData: FormData) {
  const tenant = await requireStaffManager();
  const userId = text(formData, "userId");
  const isActive = bool(formData, "isActive");
  if (!userId) return { ok: false, error: "Usuario requerido." };
  if (userId === tenant.currentUser.id) return { ok: false, error: "No puedes suspender tu propio usuario." };

  const user = await prisma.user.findFirst({ where: { id: userId, businessId: tenant.businessId }, select: { id: true, role: true } });
  if (!user) return { ok: false, error: "Usuario no encontrado." };
  if (user.role === "OWNER") return { ok: false, error: "No puedes suspender al dueño principal." };

  await prisma.user.update({ where: { id: user.id }, data: { isActive } });
  staffRevalidate();
  return { ok: true, message: isActive ? "Usuario activado" : "Usuario suspendido" };
}

export async function deleteStaffUserAction(formData: FormData) {
  const tenant = await requireStaffManager();
  const userId = text(formData, "userId");
  if (!userId) return { ok: false, error: "Usuario requerido." };
  if (userId === tenant.currentUser.id) return { ok: false, error: "No puedes eliminar tu propio usuario." };

  const user = await prisma.user.findFirst({ where: { id: userId, businessId: tenant.businessId }, select: { id: true, role: true } });
  if (!user) return { ok: false, error: "Usuario no encontrado." };
  if (user.role === "OWNER") return { ok: false, error: "No puedes eliminar al dueño principal." };

  await prisma.user.delete({ where: { id: user.id } });
  staffRevalidate();
  return { ok: true, message: "Usuario eliminado" };
}
