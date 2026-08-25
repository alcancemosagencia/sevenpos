import {
  OperatingExpense,
  OperatingExpenseWithDetails,
} from '../../domain/expenses/OperatingExpense';
import { OperatingExpenseRepository } from '../../domain/expenses/repositories/OperatingExpenseRepository';
import { CashMovement, CashMovementType } from '../../domain/cash/CashMovement';
import { getMovementTypeSign } from '../../domain/cash/CashSessionMath';
import { ExpensePaymentMethod } from '../../domain/expenses/ExpensePaymentMethod';
import { CurrencyCode } from '../../types/country';
import { DatabaseManager } from '../database/DatabaseManager';
import { logger } from '../logging/Logger';

interface ExpenseRow {
  id: string;
  business_id: string;
  expense_number: string;
  expense_sequence: number;
  category_id: string;
  category_name_snapshot: string;
  description: string;
  amount: number;
  currency_code: string;
  payment_method_code: string;
  expense_date: string;
  supplier_id: string | null;
  supplier_name_snapshot: string | null;
  cash_session_id: string | null;
  cash_movement_id: string | null;
  reference_document: string | null;
  note: string | null;
  status: string;
  idempotency_key: string;
  created_by_user_id: string;
  created_by_name_snapshot: string;
  created_at: string;
  updated_at: string;
  category_name?: string;
  supplier_name?: string | null;
}

export class SqliteOperatingExpenseRepository implements OperatingExpenseRepository {
  constructor(
    private dbManager: DatabaseManager,
    private fallbackRepo: OperatingExpenseRepository
  ) {}

  private mapRow(r: ExpenseRow): OperatingExpenseWithDetails {
    return {
      id: r.id,
      businessId: r.business_id,
      expenseNumber: r.expense_number,
      expenseSequence: r.expense_sequence,
      categoryId: r.category_id,
      categoryNameSnapshot: r.category_name_snapshot,
      categoryName: r.category_name || r.category_name_snapshot,
      description: r.description,
      amount: r.amount,
      currencyCode: r.currency_code as CurrencyCode,
      paymentMethodCode: r.payment_method_code as ExpensePaymentMethod,
      expenseDate: r.expense_date,
      supplierId: r.supplier_id,
      supplierNameSnapshot: r.supplier_name_snapshot,
      supplierName: r.supplier_name || r.supplier_name_snapshot,
      cashSessionId: r.cash_session_id,
      cashMovementId: r.cash_movement_id,
      referenceDocument: r.reference_document,
      note: r.note,
      status: 'RECORDED',
      idempotencyKey: r.idempotency_key,
      createdByUserId: r.created_by_user_id,
      createdByNameSnapshot: r.created_by_name_snapshot,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async findById(businessId: string, id: string): Promise<OperatingExpenseWithDetails | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.findById(businessId, id);

    try {
      const rows: ExpenseRow[] = await db.select(
        `SELECT e.*, c.name as category_name, s.name as supplier_name
         FROM operating_expenses e
         LEFT JOIN expense_categories c ON e.category_id = c.id
         LEFT JOIN suppliers s ON e.supplier_id = s.id
         WHERE e.business_id = ? AND e.id = ?`,
        [businessId, id]
      );
      if (rows.length === 0) return null;
      return this.mapRow(rows[0]);
    } catch (err) {
      logger.error('SqliteOperatingExpenseRepository', 'Error in findById', { error: String(err) });
      return this.fallbackRepo.findById(businessId, id);
    }
  }

  async findByExpenseNumber(businessId: string, expenseNumber: string): Promise<OperatingExpenseWithDetails | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.findByExpenseNumber(businessId, expenseNumber);

    try {
      const rows: ExpenseRow[] = await db.select(
        `SELECT e.*, c.name as category_name, s.name as supplier_name
         FROM operating_expenses e
         LEFT JOIN expense_categories c ON e.category_id = c.id
         LEFT JOIN suppliers s ON e.supplier_id = s.id
         WHERE e.business_id = ? AND e.expense_number = ?`,
        [businessId, expenseNumber]
      );
      if (rows.length === 0) return null;
      return this.mapRow(rows[0]);
    } catch (err) {
      logger.error('SqliteOperatingExpenseRepository', 'Error in findByExpenseNumber', { error: String(err) });
      return this.fallbackRepo.findByExpenseNumber(businessId, expenseNumber);
    }
  }

  async findByIdempotencyKey(businessId: string, idempotencyKey: string): Promise<OperatingExpenseWithDetails | null> {
    const db = await this.dbManager.getDatabase();
    if (!db) return this.fallbackRepo.findByIdempotencyKey(businessId, idempotencyKey);

    try {
      const rows: ExpenseRow[] = await db.select(
        `SELECT e.*, c.name as category_name, s.name as supplier_name
         FROM operating_expenses e
         LEFT JOIN expense_categories c ON e.category_id = c.id
         LEFT JOIN suppliers s ON e.supplier_id = s.id
         WHERE e.business_id = ? AND e.idempotency_key = ?`,
        [businessId, idempotencyKey]
      );
      if (rows.length === 0) return null;
      return this.mapRow(rows[0]);
    } catch (err) {
      logger.error('SqliteOperatingExpenseRepository', 'Error in findByIdempotencyKey', { error: String(err) });
      return this.fallbackRepo.findByIdempotencyKey(businessId, idempotencyKey);
    }
  }

  async recordExpenseTransaction(
    expense: OperatingExpense,
    cashMovement?: CashMovement | null
  ): Promise<OperatingExpenseWithDetails> {
    const db = await this.dbManager.getDatabase();
    if (!db) {
      return this.fallbackRepo.recordExpenseTransaction(expense, cashMovement);
    }

    try {
      await db.execute('BEGIN IMMEDIATE');

      // 1. In-transaction Idempotency Check (P0: Check before any sequence/ledger mutation)
      const existingRows: ExpenseRow[] = await db.select(
        `SELECT e.*, c.name as category_name, s.name as supplier_name
         FROM operating_expenses e
         LEFT JOIN expense_categories c ON e.category_id = c.id
         LEFT JOIN suppliers s ON e.supplier_id = s.id
         WHERE e.business_id = ? AND e.idempotency_key = ?`,
        [expense.businessId, expense.idempotencyKey]
      );

      if (existingRows.length > 0) {
        await db.execute('COMMIT');
        return this.mapRow(existingRows[0]);
      }

      // 2. Authoritative Category Validation & Snapshot Derivation
      const categoryRows: { id: string; name: string; active: number }[] = await db.select(
        'SELECT id, name, active FROM expense_categories WHERE id = ? AND business_id = ?',
        [expense.categoryId, expense.businessId]
      );
      if (categoryRows.length === 0) {
        throw new Error('EXPENSE_CATEGORY_NOT_FOUND: La categoría especificada no existe.');
      }
      if (categoryRows[0].active !== 1) {
        throw new Error('EXPENSE_CATEGORY_INACTIVE: La categoría seleccionada se encuentra inactiva.');
      }
      const finalCategoryNameSnapshot = categoryRows[0].name;

      // 3. Authoritative Supplier Validation & Snapshot Derivation
      let finalSupplierId: string | null = null;
      let finalSupplierNameSnapshot: string | null = null;
      if (expense.supplierId) {
        const supplierRows: { id: string; name: string; active: number }[] = await db.select(
          'SELECT id, name, active FROM suppliers WHERE id = ? AND business_id = ?',
          [expense.supplierId, expense.businessId]
        );
        if (supplierRows.length === 0) {
          throw new Error('SUPPLIER_NOT_FOUND: El proveedor especificado no existe en este negocio.');
        }
        if (supplierRows[0].active !== 1) {
          throw new Error('SUPPLIER_INACTIVE: El proveedor seleccionado se encuentra inactivo.');
        }
        finalSupplierId = supplierRows[0].id;
        finalSupplierNameSnapshot = supplierRows[0].name;
      }

      // 4. CASH Integration within Transaction Lock
      if (expense.paymentMethodCode === 'CASH') {
        if (!expense.cashSessionId) {
          throw new Error('CASH_SESSION_REQUIRED: Se requiere una sesión de caja abierta para registrar un gasto en efectivo.');
        }

        // Validate Cash Session is currently OPEN
        const sessionRows: { id: string; status: string; cash_register_id: string }[] = await db.select(
          'SELECT id, status, cash_register_id FROM cash_sessions WHERE id = ? AND business_id = ?',
          [expense.cashSessionId, expense.businessId]
        );
        if (sessionRows.length === 0 || sessionRows[0].status !== 'OPEN') {
          throw new Error('CASH_SESSION_REQUIRED: La caja seleccionada no se encuentra abierta.');
        }

        // Authoritative live calculation of expected physical cash for this specific session
        const movementRows: { movement_type: string; amount: number }[] = await db.select(
          'SELECT movement_type, amount FROM cash_movements WHERE business_id = ? AND cash_session_id = ?',
          [expense.businessId, expense.cashSessionId]
        );

        let liveExpectedCash = 0;
        for (const m of movementRows) {
          const sign = getMovementTypeSign(m.movement_type as CashMovementType);
          liveExpectedCash += sign * m.amount;
        }

        if (liveExpectedCash < expense.amount) {
          throw new Error(
            `INSUFFICIENT_CASH: Fondos insuficientes en la caja. Saldo disponible: $${liveExpectedCash.toLocaleString('es-CL')} vs requerido: $${expense.amount.toLocaleString('es-CL')}.`
          );
        }
      }

      // 5. Atomic Sequence Generation
      const seqRows: { next_seq: number }[] = await db.select(
        'SELECT COALESCE(MAX(expense_sequence), 0) + 1 AS next_seq FROM operating_expenses WHERE business_id = ?',
        [expense.businessId]
      );
      const nextSeq = seqRows[0]?.next_seq || 1;
      const expenseNumber = `GTO-${String(nextSeq).padStart(6, '0')}`;

      // 6. Insert Operating Expense
      await db.execute(
        `INSERT INTO operating_expenses (
          id, business_id, expense_number, expense_sequence, category_id, category_name_snapshot,
          description, amount, currency_code, payment_method_code, expense_date,
          supplier_id, supplier_name_snapshot, cash_session_id, cash_movement_id,
          reference_document, note, status, idempotency_key,
          created_by_user_id, created_by_name_snapshot, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECORDED', ?, ?, ?, ?, ?)`,
        [
          expense.id,
          expense.businessId,
          expenseNumber,
          nextSeq,
          expense.categoryId,
          finalCategoryNameSnapshot,
          expense.description,
          expense.amount,
          expense.currencyCode,
          expense.paymentMethodCode,
          expense.expenseDate,
          finalSupplierId,
          finalSupplierNameSnapshot,
          expense.paymentMethodCode === 'CASH' ? expense.cashSessionId : null,
          expense.paymentMethodCode === 'CASH' && cashMovement ? cashMovement.id : null,
          expense.referenceDocument || null,
          expense.note || null,
          expense.idempotencyKey,
          expense.createdByUserId,
          expense.createdByNameSnapshot,
          expense.createdAt,
          expense.updatedAt,
        ]
      );

      // 7. Insert Cash Movement if Cash Expense
      if (expense.paymentMethodCode === 'CASH' && cashMovement) {
        await db.execute(
          `INSERT INTO cash_movements (
            id, business_id, cash_session_id, cash_register_id, movement_type,
            amount, currency_code, reason, note, reference_type, reference_id,
            created_by_user_id, created_by_name_snapshot, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cashMovement.id,
            cashMovement.businessId,
            cashMovement.cashSessionId,
            cashMovement.cashRegisterId,
            cashMovement.movementType,
            cashMovement.amount,
            cashMovement.currencyCode,
            cashMovement.reason,
            cashMovement.note || null,
            cashMovement.referenceType || null,
            expense.id,
            cashMovement.createdByUserId,
            cashMovement.createdByNameSnapshot,
            cashMovement.createdAt,
          ]
        );
      }

      await db.execute('COMMIT');

      return {
        ...expense,
        expenseNumber,
        expenseSequence: nextSeq,
        categoryNameSnapshot: finalCategoryNameSnapshot,
        supplierId: finalSupplierId,
        supplierNameSnapshot: finalSupplierNameSnapshot,
        status: 'RECORDED',
      };
    } catch (err) {
      try {
        await db.execute('ROLLBACK');
      } catch {
        // Rollback error fallback
      }
      logger.error('SqliteOperatingExpenseRepository', 'Error in recordExpenseTransaction, rolled back', {
        error: String(err),
      });
      throw err;
    }
  }
}
