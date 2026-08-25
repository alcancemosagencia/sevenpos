# Cash & Shift Management Domain — SevenPOS.PRO

## 1. Domain Entities & Roles

### 1.1 Cash Register (`CashRegister`)
Represents the physical or logical drawer assigned to a sales point.
- Default: "Caja principal" (idempotently ensured per business).
- Multi-register ready: Designed with `business_id` scoping to support multiple physical terminals in future phases.

### 1.2 Cash Session / Shift (`CashSession`)
Represents the bounded operational shift between an opening and a closing.
- Invariants:
  - Exactly one `OPEN` session allowed per `cash_register_id` at any time (enforced by SQLite partial unique index `uq_active_cash_session_per_register`).
  - Stores `opening_amount` as an immutable audit snapshot.
  - Closed sessions are immutable records containing final closing metadata (`closed_at`, `closed_by_user_id`, `expected_cash_amount`, `counted_cash_amount`, `difference_amount`, `closing_note`).

### 1.3 Cash Movement (`CashMovement`)
An immutable ledger record of a physical cash event.
- Movement Types:
  - `OPENING` (+): Initial shift cash opening.
  - `SALE_CASH` (+): Net cash received from a POS sale.
  - `CASH_IN` (+): Manual cash deposit / replenishment.
  - `CASH_OUT` (-): Manual cash withdrawal / minor expenses.
- Strictly positive stored amounts; direction is determined by canonical sign mapping (`CashSessionMath`).
- Non-destructive ledger: No row edits or deletions.

---

## 2. POS Sale & Shift Coupling

1. **Mandatory Open Session**: POS sales cannot be completed without an active `OPEN` session.
2. **Atomic Ledger Booking**: Physical cash payments generate a `SALE_CASH` movement inside the same atomic SQLite transaction (`BEGIN IMMEDIATE`) as the sale, sale items, payments, and stock movements.
3. **Consolidated Sale Cash**: If multiple cash lines exist in a transaction, they are consolidated into exactly one `SALE_CASH` movement per sale.
