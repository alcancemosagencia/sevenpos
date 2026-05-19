"use client";

import { useState } from "react";
import { Mail, MoreVertical, Phone, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PremiumModal } from "@/components/shared/premium-modal";
import { createCustomerAction } from "@/features/backoffice/actions";

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
};

export function ClientsClient({ customers }: { customers: CustomerRow[] }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="mx-auto w-full max-w-5xl space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Clientes</h1>
          <p className="text-sm text-muted-foreground">{customers.length} clientes</p>
        </div>
        <Button onClick={() => setOpen(true)} className="h-10 px-4 shadow-[0_14px_30px_hsl(218_92%_35%/0.2)]">
          <Plus className="size-4" />
          Nuevo
        </Button>
      </div>

      <div className="space-y-2">
        {customers.map((customer) => (
          <Card key={customer.id} className="flex items-center gap-3 p-3 transition hover:shadow-[0_12px_35px_hsl(220_20%_10%/0.08)]">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Users className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{customer.name}</p>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {customer.phone ? <span className="inline-flex items-center gap-1"><Phone className="size-3" />{customer.phone}</span> : null}
                {customer.email ? <span className="inline-flex items-center gap-1"><Mail className="size-3" />{customer.email}</span> : null}
                <span>Sin compras recientes</span>
              </div>
            </div>
            <details className="relative">
              <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-lg border bg-background hover:bg-muted">
                <MoreVertical className="size-4" />
              </summary>
              <div className="absolute right-0 top-10 z-30 w-44 rounded-lg border bg-card p-1.5 shadow-[0_18px_50px_hsl(220_20%_10%/0.18)]">
                {["Ver ficha", "Historial compras", "Editar", "Eliminar"].map((action) => (
                  <button key={action} type="button" className="block w-full rounded-lg px-2 py-2 text-left text-xs font-medium hover:bg-muted">
                    {action}
                  </button>
                ))}
              </div>
            </details>
          </Card>
        ))}
      </div>

      {customers.length === 0 ? (
        <Card className="flex min-h-[150px] flex-col items-center justify-center p-6 text-center">
          <Users className="mb-2 size-7 text-muted-foreground" />
          <p className="text-sm font-semibold">No hay clientes registrados</p>
        </Card>
      ) : null}

      <PremiumModal open={open} title="Nuevo cliente" description="Ficha ligera para ventas recurrentes." onClose={() => setOpen(false)}>
        <form action={createCustomerAction} className="space-y-3 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre</Label>
            <Input name="name" className="h-10" required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Teléfono</Label>
              <Input name="phone" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input name="email" type="email" className="h-10" />
            </div>
          </div>
          <Button className="h-11 w-full">Crear cliente</Button>
        </form>
      </PremiumModal>
    </section>
  );
}
