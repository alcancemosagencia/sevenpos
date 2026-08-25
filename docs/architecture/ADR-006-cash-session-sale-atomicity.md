# ADR-006: Cash Session Lifecycle and POS Sale Atomicity

## Context
In SevenPOS, sales and inventory management were coupled atomically in AG-06 via SQLite `BEGIN IMMEDIATE ... COMMIT` transactions. In AG-07, the Cash Management module introduces cash drawers, operational shifts, and an immutable financial cash ledger.

## Decision
1. **Coupled Atomic Boundaries**: When a POS sale includes cash payments, the sale record, line items, payments, inventory lot allocations/movements, and the resulting `SALE_CASH` cash ledger entry are committed in the **exact same native write transaction**.
2. **Authoritative In-Transaction Validation**: Active shift state (`status = 'OPEN'`) is re-checked inside SQLite's write lock, eliminating race conditions between concurrent checkout attempts and shift closing operations.
3. **Canonical Ledger Arithmetic**: Physical expected cash is computed exclusively from signed ledger rows ($\text{OPENING} + \text{SALE\_CASH} + \text{CASH\_IN} - \text{CASH\_OUT}$).
4. **Idempotency Guarantee**: Idempotent sale replays prevent secondary ledger insertions. A partial unique index on `(business_id, reference_id)` where `reference_type = 'SALE'` and `movement_type = 'SALE_CASH'` enforces this guarantee at the database level.
5. **Non-Destructive Auditing**: Differences calculated during blind-count closings are stored directly in `cash_sessions.difference_amount`. No balancing rows are fabricated.

## Consequences
- **Positive**: Guaranteed reconciliation between physical cash and sales history, zero orphaned sales or unbacked cash movements, robust concurrency safety under SQLite `WAL` mode.
- **Trade-off**: Requires an active shift before starting sales; handled seamlessly in UX by offering inline shift opening prompts directly from the POS interface.
