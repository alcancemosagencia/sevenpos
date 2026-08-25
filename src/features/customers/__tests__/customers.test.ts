import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCustomerDisplayName,
  normalizeCustomerEmail,
  normalizeCustomerPhone,
  normalizeCustomerDocument,
} from '../../../domain/customers/Customer';
import { InMemoryCustomerRepository } from '../../../infrastructure/repositories/InMemoryCustomerRepository';
import { InMemoryCustomerQueryRepository } from '../../../infrastructure/repositories/InMemoryCustomerQueryRepository';
import { InMemorySaleRepository } from '../../../infrastructure/repositories/InMemorySaleRepository';
import { CreateCustomer } from '../../../application/customers/CreateCustomer';
import { UpdateCustomer, DeactivateCustomer, ActivateCustomer } from '../../../application/customers/UpdateCustomer';
import { CompleteSale } from '../../../application/sales/CompleteSale';
import { InMemoryProductRepository } from '../../../infrastructure/repositories/InMemoryProductRepository';
import { InMemoryProductPresentationRepository } from '../../../infrastructure/repositories/InMemoryProductPresentationRepository';
import { InMemoryPaymentMethodRepository } from '../../../infrastructure/repositories/InMemoryPaymentMethodRepository';
import { InMemoryBusinessRepository } from '../../../infrastructure/repositories/InMemoryBusinessRepository';
import { InMemoryInventoryMovementRepository } from '../../../infrastructure/repositories/InMemoryInventoryMovementRepository';
import { InMemoryInventoryLotRepository } from '../../../infrastructure/repositories/InMemoryInventoryLotRepository';
import { InMemoryCashSessionRepository } from '../../../infrastructure/repositories/InMemoryCashSessionRepository';
import { InMemoryCashRegisterRepository } from '../../../infrastructure/repositories/InMemoryCashRegisterRepository';
import { generateUUID } from '../../../domain/common/IdGenerator';

describe('Customer Domain Normalizers & Display Name', () => {
  it('should correctly format getCustomerDisplayName with first and last name', () => {
    expect(getCustomerDisplayName({ name: 'Juan', lastName: 'Pérez' })).toBe('Juan Pérez');
    expect(getCustomerDisplayName({ name: 'Empresa SpA', lastName: null })).toBe('Empresa SpA');
    expect(getCustomerDisplayName({ name: '  María  ', lastName: '  González  ' })).toBe('María González');
  });

  it('should normalize email to lowercase trimmed string', () => {
    expect(normalizeCustomerEmail('  User@Domain.COM  ')).toBe('user@domain.com');
    expect(normalizeCustomerEmail('')).toBeNull();
    expect(normalizeCustomerEmail(null)).toBeNull();
  });

  it('should normalize phone preserving leading +', () => {
    expect(normalizeCustomerPhone('+56 9 1234-5678')).toBe('+56912345678');
    expect(normalizeCustomerPhone(' (02) 2345-6789 ')).toBe('0223456789');
    expect(normalizeCustomerPhone('')).toBeNull();
  });

  it('should normalize document removing symbols and converting to uppercase', () => {
    expect(normalizeCustomerDocument('12.345.678-k')).toBe('12345678K');
    expect(normalizeCustomerDocument('  123-456  ')).toBe('123456');
    expect(normalizeCustomerDocument('')).toBeNull();
  });
});

describe('Customer CRUD & Duplicate Detection', () => {
  const businessId = 'test-business';
  let customerRepo: InMemoryCustomerRepository;

  beforeEach(() => {
    customerRepo = new InMemoryCustomerRepository();
  });

  it('should create customer successfully', async () => {
    const useCase = new CreateCustomer(customerRepo);
    const result = await useCase.execute(businessId, {
      name: 'Carlos',
      lastName: 'Santana',
      documentNumber: '11.111.111-1',
      phone: '+56988887777',
      email: 'carlos@santana.cl',
    });

    expect(result.customer.id).toBeDefined();
    expect(result.customer.name).toBe('Carlos');
    expect(result.customer.lastName).toBe('Santana');
    expect(result.customer.active).toBe(true);
    expect(result.duplicateWarnings).toHaveLength(0);
  });

  it('should throw error when customer name is missing', async () => {
    const useCase = new CreateCustomer(customerRepo);
    await expect(
      useCase.execute(businessId, {
        name: '   ',
      })
    ).rejects.toThrow('El nombre del cliente es obligatorio.');
  });

  it('should detect duplicate by document and phone', async () => {
    const useCase = new CreateCustomer(customerRepo);
    await useCase.execute(businessId, {
      name: 'Carlos',
      documentNumber: '11.111.111-1',
      phone: '+56988887777',
    });

    const duplicateCheck = await useCase.execute(
      businessId,
      {
        name: 'Carlos Segundo',
        documentNumber: '11111111-1', // same document normalized
        phone: '56988887777', // same phone normalized
      },
      true // allow create despite duplicates
    );

    expect(duplicateCheck.duplicateWarnings.length).toBeGreaterThanOrEqual(1);
    expect(duplicateCheck.customer.name).toBe('Carlos Segundo');
  });

  it('should update customer and deactivate/activate', async () => {
    const createUseCase = new CreateCustomer(customerRepo);
    const updateUseCase = new UpdateCustomer(customerRepo);
    const deactivateUseCase = new DeactivateCustomer(customerRepo);
    const activateUseCase = new ActivateCustomer(customerRepo);

    const { customer } = await createUseCase.execute(businessId, {
      name: 'Ana',
      lastName: 'Rojas',
    });

    const updated = await updateUseCase.execute(businessId, customer.id, {
      name: 'Ana María',
    });
    expect(updated.customer.name).toBe('Ana María');

    await deactivateUseCase.execute(businessId, customer.id);
    const deactivated = await customerRepo.findById(businessId, customer.id);
    expect(deactivated?.active).toBe(false);

    await activateUseCase.execute(businessId, customer.id);
    const reactivated = await customerRepo.findById(businessId, customer.id);
    expect(reactivated?.active).toBe(true);
  });
});

describe('CompleteSale Authoritative Customer Validation & History', () => {
  const businessId = 'test-business';
  let customerRepo: InMemoryCustomerRepository;
  let saleRepo: InMemorySaleRepository;
  let customerQueryRepo: InMemoryCustomerQueryRepository;
  let productRepo: InMemoryProductRepository;
  let presentationRepo: InMemoryProductPresentationRepository;
  let paymentMethodRepo: InMemoryPaymentMethodRepository;
  let businessRepo: InMemoryBusinessRepository;
  let movementRepo: InMemoryInventoryMovementRepository;
  let lotRepo: InMemoryInventoryLotRepository;
  let cashSessionRepo: InMemoryCashSessionRepository;
  let cashRegisterRepo: InMemoryCashRegisterRepository;

  beforeEach(async () => {
    customerRepo = new InMemoryCustomerRepository();
    movementRepo = new InMemoryInventoryMovementRepository();
    cashSessionRepo = new InMemoryCashSessionRepository();
    saleRepo = new InMemorySaleRepository(movementRepo, cashSessionRepo, customerRepo);
    customerQueryRepo = new InMemoryCustomerQueryRepository(customerRepo, saleRepo);

    productRepo = new InMemoryProductRepository();
    presentationRepo = new InMemoryProductPresentationRepository();
    paymentMethodRepo = new InMemoryPaymentMethodRepository();
    businessRepo = new InMemoryBusinessRepository();
    lotRepo = new InMemoryInventoryLotRepository(movementRepo);
    cashRegisterRepo = new InMemoryCashRegisterRepository();

    // Create Business
    await businessRepo.saveBusinessWithSettings(
      {
        id: businessId,
        name: 'Mi Negocio Test',
        countryCode: 'CL',
        fiscalId: null,
        address: null,
        phone: null,
        phonePrefix: '+56',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        businessId,
        primaryCurrency: 'CLP',
        secondaryCurrency: null,
        secondaryCurrencyEnabled: false,
        exchangeRateProvider: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );

    // Ensure Payment Methods
    await paymentMethodRepo.ensureDefaultMethods(businessId);

    // Open Cash Session
    const openCashSession = new (await import('../../../application/cash/OpenCashSession')).OpenCashSession(
      cashSessionRepo,
      cashRegisterRepo
    );
    await openCashSession.execute({
      businessId,
      openedByUserId: 'user-1',
      openedByNameSnapshot: 'Vendedor Test',
      openingAmount: 10000,
    });

    // Create Product
    await productRepo.save({
      id: 'prod-1',
      businessId,
      name: 'Coca Cola 1.5L',
      categoryId: 'cat-1',
      costPrice: 800,
      salePrice: 1500,
      active: true,
      featured: false,
      sku: 'CC-15',
      barcode: '7801234567890',
      baseUnit: 'UNIT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Record initial inventory movement
    await movementRepo.recordMovement({
      businessId,
      productId: 'prod-1',
      movementType: 'ENTRY',
      quantityDelta: 50000, // 50 units in scaled int (1000)
      unitCost: 800,
      totalCost: 40000,
      lotId: null,
      reasonCode: null,
      referenceType: 'MANUAL',
      referenceId: null,
      note: 'Initial stock for test',
      createdByUserId: 'user-1',
    });
  });

  it('should complete sale with Consumidor final when customerId is null', async () => {
    const cashMethod = await paymentMethodRepo.getPaymentMethodByCode(businessId, 'CASH');
    const completeSale = new CompleteSale(
      saleRepo,
      paymentMethodRepo,
      productRepo,
      presentationRepo,
      movementRepo,
      lotRepo,
      businessRepo,
      cashSessionRepo,
      customerRepo
    );

    const result = await completeSale.execute({
      businessId,
      userId: 'user-1',
      userName: 'Vendedor Test',
      idempotencyKey: generateUUID(),
      customerId: null,
      customerName: 'Consumidor final',
      items: [
        {
          productId: 'prod-1',
          presentationId: null,
          quantity: 2000,
          expectedUnitPrice: 1500,
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethod!.id,
          amount: 3000,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.saleWithDetails?.sale.customerId).toBeNull();
    expect(result.saleWithDetails?.sale.customerNameSnapshot).toBe('Consumidor final');
  });

  it('should complete sale with customer and store authoritative name snapshot', async () => {
    const cashMethod = await paymentMethodRepo.getPaymentMethodByCode(businessId, 'CASH');
    const customer = await customerRepo.create(businessId, {
      name: 'Juan',
      lastName: 'Pérez',
      documentNumber: '12.345.678-9',
    });

    const completeSale = new CompleteSale(
      saleRepo,
      paymentMethodRepo,
      productRepo,
      presentationRepo,
      movementRepo,
      lotRepo,
      businessRepo,
      cashSessionRepo,
      customerRepo
    );

    const result = await completeSale.execute({
      businessId,
      userId: 'user-1',
      userName: 'Vendedor Test',
      idempotencyKey: generateUUID(),
      customerId: customer.id,
      customerName: 'Untrusted Name from Cart',
      items: [
        {
          productId: 'prod-1',
          presentationId: null,
          quantity: 2000,
          expectedUnitPrice: 1500,
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethod!.id,
          amount: 3000,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.saleWithDetails?.sale.customerId).toBe(customer.id);
    expect(result.saleWithDetails?.sale.customerNameSnapshot).toBe('Juan Pérez');

    // Verify stats in CustomerQueryRepository
    const stats = await customerQueryRepo.getCustomerStats(businessId, customer.id);
    expect(stats).not.toBeNull();
    expect(stats?.salesCount).toBe(1);
    expect(stats?.totalSpent).toBe(3000);
    expect(stats?.averageTicket).toBe(3000);

    const metrics = await customerQueryRepo.getKPIMetrics(businessId);
    expect(metrics.activeCustomersCount).toBe(1);
    expect(metrics.customersWithPurchasesCount).toBe(1);
    expect(metrics.globalAverageTicketPerCustomer).toBe(3000);
  });

  it('should reject sale when customer is inactive', async () => {
    const cashMethod = await paymentMethodRepo.getPaymentMethodByCode(businessId, 'CASH');
    const customer = await customerRepo.create(businessId, {
      name: 'Inactivo',
      lastName: 'Test',
    });
    await customerRepo.deactivate(businessId, customer.id);

    const completeSale = new CompleteSale(
      saleRepo,
      paymentMethodRepo,
      productRepo,
      presentationRepo,
      movementRepo,
      lotRepo,
      businessRepo,
      cashSessionRepo,
      customerRepo
    );

    const result = await completeSale.execute({
      businessId,
      userId: 'user-1',
      userName: 'Vendedor Test',
      idempotencyKey: generateUUID(),
      customerId: customer.id,
      customerName: 'Inactivo Test',
      items: [
        {
          productId: 'prod-1',
          presentationId: null,
          quantity: 1000,
          expectedUnitPrice: 1500,
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethod!.id,
          amount: 1500,
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('CUSTOMER_INACTIVE');
  });

  it('should reject sale when customer does not exist', async () => {
    const cashMethod = await paymentMethodRepo.getPaymentMethodByCode(businessId, 'CASH');
    const completeSale = new CompleteSale(
      saleRepo,
      paymentMethodRepo,
      productRepo,
      presentationRepo,
      movementRepo,
      lotRepo,
      businessRepo,
      cashSessionRepo,
      customerRepo
    );

    const result = await completeSale.execute({
      businessId,
      userId: 'user-1',
      userName: 'Vendedor Test',
      idempotencyKey: generateUUID(),
      customerId: 'non-existent-customer-id',
      customerName: 'Fantasma',
      items: [
        {
          productId: 'prod-1',
          presentationId: null,
          quantity: 1000,
          expectedUnitPrice: 1500,
        },
      ],
      payments: [
        {
          paymentMethodId: cashMethod!.id,
          amount: 1500,
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('CUSTOMER_NOT_FOUND');
  });
});
