# Cash Reconciliation & Arqueo — SevenPOS.PRO

## 1. Canonical Expected Cash Formula

Expected physical cash is computed purely as the sum of signed entries in the shift ledger:

$$\text{expected\_cash} = \sum \text{signed movements} = \text{OPENING} (+) + \text{SALE\_CASH} (+) + \text{CASH\_IN} (+) - \text{CASH\_OUT} (-)$$

> [!IMPORTANT]
> The initial shift amount is already stored in the ledger as an `OPENING` movement (+). Therefore, `opening_amount` from the `cash_sessions` record is **never** added on top of the movements sum, preventing double-counting.

---

## 2. Blind Count Workflow (Arqueo a Ciegas)

To prevent cognitive bias or dishonest balancing, SevenPOS applies a strict 2-step blind count:

```
[Step 1: Physical Count]
  Cashier counts physical cash and inputs total in MoneyInput.
  Expected balance is hidden during this step.
       │
       ▼
[Step 2: Reconciliation Preview]
  System computes:
    difference = counted_amount - expected_cash
  Displays side-by-side financial audit:
    - Fondo inicial
    - Ventas en efectivo
    - Ingresos manuales
    - Retiros manuales
    - Saldo esperado
    - Efectivo contado
    - Diferencia (Exacto, Sobrante o Faltante)
       │
       ▼
[Step 3: Atomic Shift Closure]
  Revalidates expected cash inside SQLite write transaction.
  Locks shift status to CLOSED.
  Preserves difference_amount without artificial balancing rows.
```

---

## 3. Difference Integrity

SevenPOS never creates artificial balancing movements (e.g. `CLOSING_ADJUSTMENT -500`) to force difference to 0. All variances remain explicitly recorded in `cash_sessions.difference_amount` for audit integrity.
