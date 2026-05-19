"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Copy, MoreHorizontal, Plus, Search, Shield } from "lucide-react";
import { AppModal } from "@/components/shared/app-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { aclActions, aclSections } from "@/features/staff/acl";
import { deleteAccessRoleAction, duplicateAccessRoleAction, saveAccessRoleAction } from "@/features/staff/actions";

type RolePermission = { section: string; action: string };
type StaffRole = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  usersCount: number;
  permissions: RolePermission[];
};

const templates = [
  {
    name: "Dueño",
    description: "Acceso operativo completo del negocio.",
    permissions: aclSections.flatMap((section) => aclActions.map((action) => `${section}:${action}`)),
  },
  {
    name: "Administrador",
    description: "Gestión completa sin tocar configuración sensible.",
    permissions: aclSections
      .filter((section) => section !== "Configuración")
      .flatMap((section) => aclActions.filter((action) => action !== "Configurar").map((action) => `${section}:${action}`)),
  },
  {
    name: "Cajero",
    description: "Venta diaria, clientes y cobro.",
    permissions: ["POS:Ver", "POS:Cobrar", "Clientes:Ver", "Clientes:Crear", "Ventas:Ver"],
  },
  {
    name: "Cocina/KDS",
    description: "Vista operativa para cocina.",
    permissions: ["POS:Ver", "Ventas:Ver"],
  },
  {
    name: "Garzón/Mesero",
    description: "Apoyo de sala y preventa.",
    permissions: ["Preventa:Ver", "Preventa:Crear", "Clientes:Ver"],
  },
  {
    name: "Inventario",
    description: "Stock, productos y transferencias.",
    permissions: ["Productos:Ver", "Inventario:Ver", "Inventario:Editar", "Transferencias:Ver", "Transferencias:Crear"],
  },
  {
    name: "Delivery",
    description: "Pedidos y clientes.",
    permissions: ["Preventa:Ver", "Clientes:Ver", "Clientes:Editar"],
  },
];

function permissionKey(permission: RolePermission) {
  return `${permission.section}:${permission.action}`;
}

export function StaffRolesClient({ roles }: { roles: StaffRole[] }) {
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<StaffRole | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filteredRoles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return roles;
    return roles.filter((role) => [role.name, role.slug, role.description].filter(Boolean).some((value) => value?.toLowerCase().includes(normalized)));
  }, [query, roles]);

  function openCreate() {
    setEditingRole(null);
    setSelectedPermissions(new Set());
    setError(null);
    setModalOpen(true);
  }

  function openEdit(role: StaffRole) {
    setEditingRole(role);
    setSelectedPermissions(new Set(role.permissions.map(permissionKey)));
    setError(null);
    setModalOpen(true);
  }

  function applyTemplate(templateName: string) {
    const template = templates.find((item) => item.name === templateName);
    if (!template) return;
    setSelectedPermissions(new Set(template.permissions));
  }

  function togglePermission(key: string) {
    setSelectedPermissions((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function submitRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    selectedPermissions.forEach((permission) => formData.append("permission", permission));
    startTransition(async () => {
      const result = await saveAccessRoleAction(formData) as { ok?: boolean; message?: string; error?: string } | undefined;
      if (result?.ok) {
        setModalOpen(false);
        setMessage(result.message ?? "Rol guardado");
        window.setTimeout(() => setMessage(null), 1800);
        return;
      }
      setError(result?.error ?? "No pudimos guardar el rol.");
    });
  }

  function runRoleAction(action: (formData: FormData) => Promise<{ ok: boolean; message?: string; error?: string } | undefined>, roleId: string) {
    const formData = new FormData();
    formData.set("roleId", roleId);
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
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Roles</h1>
          <p className="mt-1 text-sm text-muted-foreground">Permisos operativos por módulo, sin tablas técnicas gigantes.</p>
        </div>
        <Button className="h-10" onClick={openCreate}>
          <Plus className="size-4" />
          Crear rol
        </Button>
      </div>

      <Card className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar rol..." className="h-10 bg-background pl-9" />
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredRoles.map((role) => {
          const permissionPreview = role.permissions.slice(0, 4);
          return (
            <Card key={role.id} className="p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_hsl(222_28%_8%/0.08)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Shield className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{role.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{role.slug}</p>
                    </div>
                  </div>
                </div>
                <details className="relative">
                  <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-lg hover:bg-muted">
                    <MoreHorizontal className="size-4" />
                  </summary>
                  <div className="absolute right-0 top-9 z-20 w-40 rounded-lg border bg-card p-1 text-sm shadow-xl">
                    <button className="w-full rounded-md px-2 py-1.5 text-left hover:bg-muted" onClick={() => openEdit(role)}>Editar</button>
                    <button className="w-full rounded-md px-2 py-1.5 text-left hover:bg-muted" onClick={() => runRoleAction(duplicateAccessRoleAction, role.id)}>Duplicar</button>
                    <button className="w-full rounded-md px-2 py-1.5 text-left text-red-600 hover:bg-red-50" onClick={() => runRoleAction(deleteAccessRoleAction, role.id)}>Eliminar</button>
                  </div>
                </details>
              </div>
              <p className="mt-3 min-h-9 text-sm text-muted-foreground">{role.description ?? "Rol operativo del negocio."}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {permissionPreview.map((permission) => (
                  <span key={permissionKey(permission)} className="rounded-lg bg-muted px-2 py-1 text-[11px] font-medium text-slate-700">
                    {permission.section} · {permission.action}
                  </span>
                ))}
                {role.permissions.length > permissionPreview.length ? (
                  <span className="rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">+{role.permissions.length - permissionPreview.length}</span>
                ) : null}
              </div>
              <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs">
                <span className="font-medium text-muted-foreground">{role.usersCount} usuarios</span>
                <span className={`rounded-lg px-2 py-1 font-medium ${role.isSystem ? "bg-primary/10 text-primary" : "bg-muted text-slate-700"}`}>{role.isSystem ? "Sistema" : "Custom"}</span>
              </div>
            </Card>
          );
        })}
      </div>

      <AppModal open={modalOpen} onClose={() => setModalOpen(false)} title={editingRole ? "Editar rol" : "Crear rol"} description="Parte desde una plantilla y ajusta permisos por módulo." size="xl">
        <form onSubmit={submitRole} className="space-y-4 p-4">
          <input type="hidden" name="roleId" value={editingRole?.id ?? ""} />
          <div className="grid gap-3 lg:grid-cols-4">
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
              Nombre
              <Input name="name" defaultValue={editingRole?.name ?? ""} className="h-10" required />
            </label>
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
              Slug
              <Input name="slug" defaultValue={editingRole?.slug ?? ""} className="h-10" />
            </label>
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground lg:col-span-2">
              Descripción
              <Input name="description" defaultValue={editingRole?.description ?? ""} className="h-10" />
            </label>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Plantillas</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {templates.map((template) => (
                <button key={template.name} type="button" onClick={() => applyTemplate(template.name)} className="shrink-0 rounded-lg border bg-card px-3 py-2 text-left text-xs transition hover:border-primary/50">
                  <span className="block font-semibold text-slate-900">{template.name}</span>
                  <span className="block max-w-40 truncate text-muted-foreground">{template.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {aclSections.map((section) => (
              <Card key={section} className="p-3">
                <p className="text-sm font-semibold text-slate-900">{section}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {aclActions.map((action) => {
                    const key = `${section}:${action}`;
                    const checked = selectedPermissions.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => togglePermission(key)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${checked ? "border-primary bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:border-primary/40"}`}
                      >
                        {checked ? "✓ " : ""}{action}
                      </button>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button disabled={pending}>
              <Copy className="size-4" />
              {pending ? "Guardando..." : "Guardar rol"}
            </Button>
          </div>
        </form>
      </AppModal>
    </section>
  );
}
