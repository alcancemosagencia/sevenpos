"use client";

import { useActionState, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { closeCashSessionAction, type CashActionState } from "@/features/cash/actions";
import { money } from "@/features/pos/format";

const initialState: CashActionState = {};

export function CashCloseForm({
  expectedUsd,
  expectedBs,
  expensesUsd,
  expensesBs,
  incomesUsd,
  incomesBs,
}: {
  expectedUsd: number;
  expectedBs: number;
  expensesUsd: number;
  expensesBs: number;
  incomesUsd: number;
  incomesBs: number;
}) {
  const [state, action, pending] = useActionState(closeCashSessionAction, initialState);
  const [closingUsd, setClosingUsd] = useState(expectedUsd.toFixed(2));
  const [closingBs, setClosingBs] = useState(expectedBs.toFixed(2));

  const difference = useMemo(
    () => ({
      usd: Number(closingUsd || 0) - expectedUsd,
      bs: Number(closingBs || 0) - expectedBs,
    }),
    [closingBs, closingUsd, expectedBs, expectedUsd],
  );

  return (
    <Card className="p-4 sm:p-5">
      <form action={action} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-background p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.11em] text-muted-foreground">Esperado USD</p>
            <p className="mt-1 text-xl font-semibold">{money(expectedUsd, "USD")}</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.11em] text-muted-foreground">Esperado Bs</p>
            <p className="mt-1 text-xl font-semibold">{money(expectedBs, "VES")}</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.11em] text-muted-foreground">Gastos</p>
            <p className="mt-1 text-sm font-medium">{money(expensesUsd, "USD")} / {money(expensesBs, "VES")}</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.11em] text-muted-foreground">Ingresos</p>
            <p className="mt-1 text-sm font-medium">{money(incomesUsd, "USD")} / {money(incomesBs, "VES")}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="closingAmountUsd">Conteo real USD</Label>
            <Input id="closingAmountUsd" name="closingAmountUsd" type="number" min="0" step="0.01" value={closingUsd} onChange={(event) => setClosingUsd(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="closingAmountBs">Conteo real Bs</Label>
            <Input id="closingAmountBs" name="closingAmountBs" type="number" min="0" step="0.01" value={closingBs} onChange={(event) => setClosingBs(event.target.value)} />
          </div>
        </div>

        <div className="rounded-lg bg-muted p-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.11em] text-muted-foreground">Diferencia</p>
          <p className={`mt-1 text-lg font-semibold ${difference.usd === 0 && difference.bs === 0 ? "text-primary" : "text-destructive"}`}>
            {money(difference.usd, "USD")} / {money(difference.bs, "VES")}
          </p>
        </div>

        {state.error ? <p className="text-sm font-semibold text-destructive">{state.error}</p> : null}

        <Button className="h-12 w-full" disabled={pending}>
          {pending ? "Cerrando caja..." : "Cerrar caja"}
          <CheckCircle2 className="size-4" />
        </Button>
      </form>
    </Card>
  );
}
