import {
  OperatingExpense,
  OperatingExpenseWithDetails,
  RecordOperatingExpenseDto,
} from '../../domain/expenses/OperatingExpense';
import { OperatingExpenseRepository } from '../../domain/expenses/repositories/OperatingExpenseRepository';
import { ExpenseCategoryRepository } from '../../domain/expenses/repositories/ExpenseCategoryRepository';
import { CashSessionRepository } from '../../domain/cash/repositories/CashSessionRepository';
import { CashRegisterRepository } from '../../domain/cash/repositories/CashRegisterRepository';
import { SupplierRepository } from '../../domain/purchases/repositories/SupplierRepository';
import { CashMovement } from '../../domain/cash/CashMovement';
import { calculateExpectedCash } from '../../domain/cash/CashSessionMath';
import { generateUuid } from '../../domain/common/IdGenerator';
import { getCurrentUtcIsoString } from '../../domain/common/Timestamp';

export class RecordOperatingExpense {
  constructor(
    private expenseRepo: OperatingExpenseRepository,
    private categoryRepo: ExpenseCategoryRepository,
    private cashSessionRepo: CashSessionRepository,
    private cashRegisterRepo: CashRegisterRepository,
    private supplierRepo?: SupplierRepository
  ) {}

  async execute(
    businessId: string,
    userId: string,
    userName: string,
    dto: RecordOperatingExpenseDto
  ): Promise<OperatingExpenseWithDetails> {
    if (!businessId || businessId.trim().length === 0) {
      throw new Error('BUSINESS_ID_REQUIRED: El identificador de negocio es requerido.');
    }
    if (!userId || userId.trim().length === 0) {
      throw new Error('USER_ID_REQUIRED: El usuario operador es requerido.');
    }

    // 1. Validate Amount
    if (!Number.isInteger(dto.amount) || dto.amount <= 0) {
      throw new Error('INVALID_EXPENSE_AMOUNT: El monto del gasto debe ser un entero positivo mayor a cero.');
    }

    // 2. Validate Description
    const trimmedDesc = dto.description ? dto.description.trim() : '';
    if (trimmedDesc.length === 0) {
      throw new Error('EXPENSE_DESCRIPTION_REQUIRED: La descripción del gasto es obligatoria.');
    }

    // 3. Validate Expense Date (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dto.expenseDate || !dateRegex.test(dto.expenseDate)) {
      throw new Error('INVALID_EXPENSE_DATE: La fecha del gasto debe tener formato canónico YYYY-MM-DD.');
    }
    const parsedDate = new Date(dto.expenseDate + 'T00:00:00Z');
    if (isNaN(parsedDate.getTime())) {
      throw new Error('INVALID_EXPENSE_DATE: La fecha especificada es inválida.');
    }

    // 4. Validate Category
    const category = await this.categoryRepo.findById(businessId, dto.categoryId);
    if (!category) {
      throw new Error('EXPENSE_CATEGORY_NOT_FOUND: La categoría de gasto especificada no existe.');
    }
    if (!category.active) {
      throw new Error('EXPENSE_CATEGORY_INACTIVE: La categoría de gasto seleccionada está inactiva.');
    }

    // 5. Validate Supplier if provided
    let supplierNameSnapshot: string | null = null;
    let validSupplierId: string | null = null;
    if (dto.supplierId && this.supplierRepo) {
      const supplier = await this.supplierRepo.findById(businessId, dto.supplierId);
      if (!supplier) {
        throw new Error('SUPPLIER_NOT_FOUND: El proveedor especificado no existe en este negocio.');
      }
      if (!supplier.active) {
        throw new Error('SUPPLIER_INACTIVE: El proveedor seleccionado se encuentra inactivo.');
      }
      validSupplierId = supplier.id;
      supplierNameSnapshot = supplier.name;
    }

    if (dto.paymentMethodCode === 'CASH') {
      let registerId = dto.cashRegisterId;
      if (!registerId) {
        const registers = await this.cashRegisterRepo.list(businessId);
        const activeReg = registers.find((r) => r.active) || registers[0];
        if (!activeReg) {
          const defaultReg = await this.cashRegisterRepo.ensureDefaultRegister(businessId);
          registerId = defaultReg.id;
        } else {
          registerId = activeReg.id;
        }
      }

      // Check open session for THIS specific register
      const activeSession = await this.cashSessionRepo.getActiveSession(businessId, registerId);
      if (!activeSession || activeSession.status !== 'OPEN') {
        throw new Error('CASH_SESSION_REQUIRED: Se requiere una sesión de caja abierta para registrar un gasto en efectivo.');
      }

      // Query live movements for this session
      const movements = await this.cashSessionRepo.listMovementsBySession(activeSession.id, businessId);
      const liveExpectedCash = calculateExpectedCash(movements);

      if (liveExpectedCash < dto.amount) {
        throw new Error(
          `INSUFFICIENT_CASH: Fondos insuficientes en la caja. Saldo disponible: ${liveExpectedCash} vs requerido: ${dto.amount}`
        );
      }

      const expenseId = generateUuid();
      const movementId = generateUuid();

      const cashMovement: CashMovement = {
        id: movementId,
        businessId,
        cashSessionId: activeSession.id,
        cashRegisterId: registerId,
        movementType: 'CASH_OUT',
        amount: dto.amount,
        currencyCode: dto.currencyCode,
        reason: `Gasto: ${trimmedDesc}`,
        note: dto.referenceDocument ? `Doc: ${dto.referenceDocument}` : null,
        referenceType: 'OPERATING_EXPENSE',
        referenceId: expenseId,
        createdByUserId: userId,
        createdByNameSnapshot: userName,
        createdAt: getCurrentUtcIsoString(),
      };

      const now = getCurrentUtcIsoString();
      const newExpense: OperatingExpense = {
        id: expenseId,
        businessId,
        expenseNumber: '', // Assigned in repository transaction
        expenseSequence: 0,
        categoryId: category.id,
        categoryNameSnapshot: category.name,
        description: trimmedDesc,
        amount: dto.amount,
        currencyCode: dto.currencyCode,
        paymentMethodCode: dto.paymentMethodCode,
        expenseDate: dto.expenseDate,
        supplierId: validSupplierId,
        supplierNameSnapshot,
        cashSessionId: activeSession.id,
        cashMovementId: movementId,
        referenceDocument: dto.referenceDocument?.trim() || null,
        note: dto.note?.trim() || null,
        status: 'RECORDED',
        idempotencyKey: dto.idempotencyKey,
        createdByUserId: userId,
        createdByNameSnapshot: userName,
        createdAt: now,
        updatedAt: now,
      };

      return this.expenseRepo.recordExpenseTransaction(newExpense, cashMovement);
    }

    // NON-CASH Expense
    const expenseId = generateUuid();
    const now = getCurrentUtcIsoString();

    const newExpense: OperatingExpense = {
      id: expenseId,
      businessId,
      expenseNumber: '', // Assigned in repository transaction
      expenseSequence: 0,
      categoryId: category.id,
      categoryNameSnapshot: category.name,
      description: trimmedDesc,
      amount: dto.amount,
      currencyCode: dto.currencyCode,
      paymentMethodCode: dto.paymentMethodCode,
      expenseDate: dto.expenseDate,
      supplierId: validSupplierId,
      supplierNameSnapshot,
      cashSessionId: null,
      cashMovementId: null,
      referenceDocument: dto.referenceDocument?.trim() || null,
      note: dto.note?.trim() || null,
      status: 'RECORDED',
      idempotencyKey: dto.idempotencyKey,
      createdByUserId: userId,
      createdByNameSnapshot: userName,
      createdAt: now,
      updatedAt: now,
    };

    return this.expenseRepo.recordExpenseTransaction(newExpense, null);
  }
}
