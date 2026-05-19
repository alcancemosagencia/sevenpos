"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { MoreHorizontal, Plus, Search, UserRound } from "lucide-react";
import { AppModal } from "@/components/shared/app-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deleteStaffUserAction, saveStaffUserAction, setStaffUserStatusAction } from "@/features/staff/actions";
import type { Role } from "@/types/auth";

type StaffBranch = { id: string; name: string };
type StaffAccessRole = { id: string; name: string; slug: string };
type StaffUser = {
  id: string;
  clerkUserId: string;
  fullName: string | null;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  lastAccessAt: string | null;
  branches: Array<{ branch: StaffBranch; isDefault: boolean }>;
  accessRoles: Array<{ role: StaffAccessRole }>;
};

const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: "Super admin",
  OWNER: "Dueño",
  ADMIN: "Administrador",
  MANAGER: "Manager",
  CASHIER: "Cajero",
  VENTA_APOYO: "Preventa",
  BODEGA: "Inventario",
  COCINA: "Cocina/KDS",
};

const businessRoles: Role[] = ["OWNER", "ADMIN", "MANAGER", "CASHIER", "VENTA_APOYO", "BODEGA", "COCINA"];

function initials(user: StaffUser) {
  return (user.fullName ?? user.email)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function dateLabel(value: string | null) {
  if (!value) return "Sin acceso";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function StaffUsersClient({
  users,
  branches,
  roles,
}: {
  users: StaffUser[];
  branches: StaffBranch[];
  roles: StaffAccessRole[];
}) {
  const [query, setQuery] = useState("");
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((user) =>
      [user.fullName, user.email, roleLabels[user.role], user.branches[0]?.branch.name]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalized)),
    );
  }, [query, users]);

  const activeCount = users.filter((user) => user.isActive).length;
  const pendingUsers = users.filter((user) => user.clerkUserId?.startsWith("pending:")).length;

  function openCreate() {
    setEditingUser(null);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(user: StaffUser) {
    setEditingUser(user);
    setError(null);
    setModalOpen(true);
  }

  function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveStaffUserAction(formData);
      if (result?.ok) {
        setModalOpen(false);
        setMessage(result.message ?? "Usuario guardado");
        window.setTimeout(() => setMessage(null), 1800);
        return;
      }
      setError(result?.error ?? "No pudimos guardar el usuario.");
    });
  }

  function runUserAction(action: (formData: FormData) => Promise<{ ok: boolean; message?: string; error?: string } | undefined>, data: Record<string, string>) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.set(key, value));
    startTransition(async () => {
      const result = await action(formData);
      if (result?.ok) {
        setMessage(result.message ?? "Acción realizada");
        window.setTimeout(() => setMessage(null), 1800);
      } else {
        setError(result?.error ?? "No pudimos completar la acción.");
      }
    });
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4">
      {message ? <div className="fixed right-4 top-4 z-[80] rounded-lg border bg-card px-3 py-2 text-sm font-medium shadow-xl">{message}</div> : null}
      {error ? <div className="fixed right-4 top-4 z-[80] rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 shadow-xl">{error}</div> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Personal</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Equipo operativo, acceso por sucursal y roles de negocio.</p>
        </div>
        <Button className="h-10" onClick={openCreate}>
          <Plus className="size-4" />
          Nuevo usuario
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Usuarios", users.length],
          ["Activos", activeCount],
          ["Pendientes", pendingUsers],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar usuario, correo, rol o sucursal..." className="h-10 bg-background pl-9" />
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredUsers.map((user) => {
          const branch = user.branches[0]?.branch.name ?? "Sin sucursal";
          const accessRole = user.accessRoles[0]?.role.name ?? roleLabels[user.role];
          return (
            <Card key={user.id} className="p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_hsl(222_28%_8%/0.08)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                    {initials(user)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{user.fullName ?? user.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <details className="relative">
                  <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-lg hover:bg-muted">
                    <MoreHorizontal className="size-4" />
                  </summary>
                  <div className="absolute right-0 top-9 z-20 w-44 rounded-lg border bg-card p-1 text-sm shadow-xl">
                    <button className="w-full rounded-md px-2 py-1.5 text-left hover:bg-muted" onClick={() => openEdit(user)}>Editar</button>
                    <button className="w-full rounded-md px-2 py-1.5 text-left hover:bg-muted" onClick={() => runUserAction(setStaffUserStatusAction, { userId: user.id, isActive: String(!user.isActive) })}>
                      {user.isActive ? "Suspender" : "Activar"}
                    </button>
                    <button className="w-full rounded-md px-2 py-1.5 text-left text-muted-foreground hover:bg-muted">Reset password</button>
                    <button className="w-full rounded-md px-2 py-1.5 text-left text-red-600 hover:bg-red-50" onClick={() => runUserAction(deleteStaffUserAction, { userId: user.id })}>Eliminar</button>
                  </div>
                </details>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-muted/45 p-3 text-xs">
                <div>
                  <p className="font-medium text-muted-foreground">Rol</p>
                  <p className="mt-1 font-semibold text-slate-800">{accessRole}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Estado</p>
                  <p className={`mt-1 font-semibold ${user.isActive ? "text-primary" : "text-amber-700"}`}>{user.isActive ? "Activo" : "Suspendido"}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Sucursal</p>
                  <p className="mt-1 truncate font-semibold text-slate-800">{branch}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Último acceso</p>
                  <p className="mt-1 font-semibold text-slate-800">{dateLabel(user.lastAccessAt)}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Creado {dateLabel(user.createdAt)}</p>
            </Card>
          );
        })}
      </div>

      {filteredUsers.length === 0 ? (
        <Card className="p-8 text-center">
          <UserRound className="mx-auto size-9 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-slate-800">No hay usuarios para esta búsqueda.</p>
        </Card>
      ) : null}

      <AppModal open={modalOpen} onClose={() => setModalOpen(false)} title={editingUser ? "Editar usuario" : "Nuevo usuario"} description="Gestiona acceso operativo sin tocar la arquitectura de Clerk." size="lg">
        <form onSubmit={submitUser} className="grid gap-3 p-4 sm:grid-cols-2">
          <input type="hidden" name="userId" value={editingUser?.id ?? ""} />
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            Nombre
            <Input name="fullName" defaultValue={editingUser?.fullName ?? ""} className="h-10" required />
          </label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            Correo
            <Input name="email" type="email" defaultValue={editingUser?.email ?? ""} className="h-10" required />
          </label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            Contraseña temporal
            <Input name="temporaryPassword" type="password" placeholder="Preparado para invitación" className="h-10" />
          </label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            Rol base
            <select name="appRole" defaultValue={editingUser?.role ?? "CASHIER"} className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-medium">
              {businessRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            Rol operativo
            <select name="accessRoleId" defaultValue={editingUser?.accessRoles[0]?.role.id ?? ""} className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-medium">
              <option value="">Sin rol ACL</option>
              {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            Sucursal
            <select name="branchId" defaultValue={editingUser?.branches[0]?.branch.id ?? ""} className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-medium">
              <option value="">Sin sucursal</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          <label className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm font-medium sm:col-span-2">
            Usuario activo
            <input name="isActive" type="checkbox" defaultChecked={editingUser?.isActive ?? true} className="size-4 accent-primary" />
          </label>
          <div className="flex justify-end gap-2 border-t pt-3 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button disabled={pending}>{pending ? "Guardando..." : "Guardar usuario"}</Button>
          </div>
        </form>
      </AppModal>
    </section>
  );
}
