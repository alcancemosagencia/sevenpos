"use client";

import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PremiumModal } from "@/components/shared/premium-modal";
import { money } from "@/features/pos/format";
import { createExpenseAction } from "@/features/backoffice/actions";

type ExpenseRow = {
  id: string;
  description: string;
  amount: number;
  createdAt: string;
};

export function ExpensesClient({ expenses, total }: { expenses: ExpenseRow[]; total: number }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="mx-auto w-full max-w-5xl space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Gastos</h1>
          <p className="text-sm text-muted-foreground">Total: {money(total, "USD")}</p>
        </div>
        <Button onClick={() => setOpen(true)} className="h-10 px-4 shadow-[0_14px_30px_hsl(218_92%_35%/0.2)]">
          <Plus className="size-4" />
          Nuevo
        </Button>
      </div>

      <Card className="overflow-hidden">
        {expenses.length > 0 ? (
          expenses.map((expense) => (
            <div key={expense.id} className="flex items-center gap-3 border-b p-3 last:border-b-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Wallet className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{expense.description}</p>
                <p className="text-xs text-muted-foreground">{expense.createdAt}</p>
              </div>
              <p className="text-sm font-semibold">{money(expense.amount, "USD")}</p>
            </div>
          ))
        ) : (
          <div className="flex min-h-[150px] flex-col items-center justify-center p-6 text-center">
            <Wallet className="mb-2 size-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No hay gastos registrados</p>
          </div>
        )}
      </Card>

      <PremiumModal open={open} title="Nuevo gasto" onClose={() => setOpen(false)}>
        <form action={createExpenseAction} className="space-y-3 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Descripción *</Label>
            <Input name="description" className="h-10" required autoFocus />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Monto USD *</Label>
              <Input name="amount" type="number" min="0.01" step="0.01" className="h-10" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">categoría</Label>
              <Input className="h-10" value="Otros" readOnly />
            </div>
          </div>
          <Button className="h-11 w-full shadow-[0_14px_30px_hsl(218_92%_35%/0.2)]">Registrar gasto</Button>
        </form>
      </PremiumModal>
    </section>
  );
}
