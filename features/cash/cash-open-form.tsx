"use client";

import { useActionState } from "react";
import { ArrowRight, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { openCashSessionAction, type CashActionState } from "@/features/cash/actions";

const initialState: CashActionState = {};

export function CashOpenForm() {
  const [state, action, pending] = useActionState(openCashSessionAction, initialState);

  return (
    <Card className="p-4 sm:p-5">
      <form action={action} className="space-y-4">
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Banknote className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Monto inicial</h2>
            <p className="text-xs text-muted-foreground">Ingresa el efectivo físico disponible.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="openingAmountUsd">USD</Label>
            <Input id="openingAmountUsd" name="openingAmountUsd" type="number" min="0" step="0.01" defaultValue="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="openingAmountBs">Bs</Label>
            <Input id="openingAmountBs" name="openingAmountBs" type="number" min="0" step="0.01" defaultValue="0" />
          </div>
        </div>

        {state.error ? <p className="text-sm font-semibold text-destructive">{state.error}</p> : null}

        <Button className="h-12 w-full" disabled={pending}>
          {pending ? "Abriendo caja..." : "Abrir caja"}
          <ArrowRight className="size-4" />
        </Button>
      </form>
    </Card>
  );
}
