# ADR-005: Sales Transaction and Inventory Deduction Architecture

## Context
In SevenPOS, sales and inventory movements must be 100% atomic and offline-first. Selling a product requires validating live stock, allocating stock across lots, recording the sale, recording sale items snapshots, recording applied payments, and inserting inventory ledger records with `movement_type = 'SALE'`.

## Decision
1. **Single Atomic SQLite Transaction**: All sales operations run within a single `BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK` transaction.
2. **Integer Arithmetic without Floats**: Quantities are scaled by 1000 (`QUANTITY_SCALE = 1000`). Financial values are in minor integers with `HALF_UP` rounding (`calculateGrossLineTotal`).
3. **Proportional Discount Allocation**: Global discounts are distributed using the *Largest Remainder Method (Hare-Niemeyer)* ensuring $\sum \text{item.discount\_total} \equiv \text{sale.discount\_total}$.
4. **Lot Allocation (Unallocated First + Basic FEFO)**: Stock is consumed first from unallocated inventory, then from lots sorted ascending by expiration date. One sale item may generate multiple inventory movements to preserve lot balances.
5. **Price at Checkout with Explicit Conflict**: Live catalog prices are checked at checkout. If a price changed while in the cart, the system returns `PRICE_CHANGED` so the cashier can review before proceeding.
6. **Payment Semantics**: Payments strictly satisfy $\sum \text{payments.amount} \equiv \text{sale.total}$. Physical cash tendered is recorded in `received_amount`, and calculated change in `change_amount`.
7. **Idempotency**: Requests carry a unique `idempotency_key`. Replaying the same key returns the completed sale without duplicating inventory movements.

## Consequences
- Guarantees zero negative inventory and 100% consistency between sales and stock ledgers.
- Prevents rounding drift and floating-point errors.
- Fully supports presentations, lot management, and multi-payment combinations.
