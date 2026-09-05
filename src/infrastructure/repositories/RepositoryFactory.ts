import { BusinessRepository } from '../../domain/business/BusinessRepository';
import { UserRepository } from '../../domain/user/UserRepository';
import { CategoryRepository } from '../../domain/catalog/CategoryRepository';
import { ProductRepository } from '../../domain/catalog/ProductRepository';
import { ProductPresentationRepository } from '../../domain/catalog/ProductPresentationRepository';
import { CatalogIdentifierRepository } from '../../domain/catalog/CatalogIdentifierRepository';
import { isTauriEnvironment } from '../runtime/environment';
import { databaseManager } from '../database/DatabaseManager';
import { SqliteBusinessRepository } from './SqliteBusinessRepository';
import { SqliteUserRepository } from './SqliteUserRepository';
import { SqliteCategoryRepository } from './SqliteCategoryRepository';
import { SqliteProductRepository } from './SqliteProductRepository';
import { SqliteProductPresentationRepository } from './SqliteProductPresentationRepository';
import { SqliteCatalogIdentifierRepository } from './SqliteCatalogIdentifierRepository';
import { InMemoryBusinessRepository } from './InMemoryBusinessRepository';
import { InMemoryUserRepository } from './InMemoryUserRepository';
import { InMemoryCategoryRepository } from './InMemoryCategoryRepository';
import { InMemoryProductRepository } from './InMemoryProductRepository';
import { InMemoryProductPresentationRepository } from './InMemoryProductPresentationRepository';
import { InMemoryCatalogIdentifierRepository } from './InMemoryCatalogIdentifierRepository';
import { InventoryMovementRepository } from '../../domain/inventory/repositories/InventoryMovementRepository';
import { InventoryLotRepository } from '../../domain/inventory/repositories/InventoryLotRepository';
import { InventoryQueryRepository } from '../../domain/inventory/repositories/InventoryQueryRepository';
import { SqliteInventoryMovementRepository } from './SqliteInventoryMovementRepository';
import { SqliteInventoryLotRepository } from './SqliteInventoryLotRepository';
import { SqliteInventoryQueryRepository } from './SqliteInventoryQueryRepository';
import { InMemoryInventoryMovementRepository } from './InMemoryInventoryMovementRepository';
import { InMemoryInventoryLotRepository } from './InMemoryInventoryLotRepository';
import { InMemoryInventoryQueryRepository } from './InMemoryInventoryQueryRepository';
import { SessionRepository } from '../../domain/auth/SessionRepository';
import { BrowserSessionRepository } from './BrowserSessionRepository';
import { NativeSessionRepository } from './NativeSessionRepository';
import { PaymentMethodRepository } from '../../domain/sales/repositories/PaymentMethodRepository';
import { SqlitePaymentMethodRepository } from './SqlitePaymentMethodRepository';
import { InMemoryPaymentMethodRepository } from './InMemoryPaymentMethodRepository';
import { CashRegisterRepository } from '../../domain/cash/repositories/CashRegisterRepository';
import { CashSessionRepository } from '../../domain/cash/repositories/CashSessionRepository';
import { CashQueryRepository } from '../../domain/cash/repositories/CashQueryRepository';
import { SqliteCashRegisterRepository } from './SqliteCashRegisterRepository';
import { SqliteCashSessionRepository } from './SqliteCashSessionRepository';
import { SqliteCashQueryRepository } from './SqliteCashQueryRepository';
import { InMemoryCashRegisterRepository } from './InMemoryCashRegisterRepository';
import { InMemoryCashSessionRepository } from './InMemoryCashSessionRepository';
import { InMemoryCashQueryRepository } from './InMemoryCashQueryRepository';
import { SaleRepository } from '../../domain/sales/repositories/SaleRepository';
import { SqliteSaleRepository } from './SqliteSaleRepository';
import { InMemorySaleRepository } from './InMemorySaleRepository';
import { SupplierRepository } from '../../domain/purchases/repositories/SupplierRepository';
import { PurchaseOrderRepository } from '../../domain/purchases/repositories/PurchaseOrderRepository';
import { PurchaseQueryRepository } from '../../domain/purchases/repositories/PurchaseQueryRepository';
import { SqliteSupplierRepository } from './SqliteSupplierRepository';
import { InMemorySupplierRepository } from './InMemorySupplierRepository';
import { SqlitePurchaseOrderRepository } from './SqlitePurchaseOrderRepository';
import { InMemoryPurchaseOrderRepository } from './InMemoryPurchaseOrderRepository';
import { SqlitePurchaseQueryRepository } from './SqlitePurchaseQueryRepository';
import { InMemoryPurchaseQueryRepository } from './InMemoryPurchaseQueryRepository';
import { CustomerRepository } from '../../domain/customers/repositories/CustomerRepository';
import { CustomerQueryRepository } from '../../domain/customers/repositories/CustomerQueryRepository';
import { SqliteCustomerRepository } from './SqliteCustomerRepository';
import { InMemoryCustomerRepository } from './InMemoryCustomerRepository';
import { SqliteCustomerQueryRepository } from './SqliteCustomerQueryRepository';
import { InMemoryCustomerQueryRepository } from './InMemoryCustomerQueryRepository';
import { ExpenseCategoryRepository } from '../../domain/expenses/repositories/ExpenseCategoryRepository';
import { OperatingExpenseRepository } from '../../domain/expenses/repositories/OperatingExpenseRepository';
import { ExpenseQueryRepository } from '../../domain/expenses/repositories/ExpenseQueryRepository';
import { SqliteExpenseCategoryRepository } from './SqliteExpenseCategoryRepository';
import { InMemoryExpenseCategoryRepository } from './InMemoryExpenseCategoryRepository';
import { SqliteOperatingExpenseRepository } from './SqliteOperatingExpenseRepository';
import { InMemoryOperatingExpenseRepository } from './InMemoryOperatingExpenseRepository';
import { SqliteExpenseQueryRepository } from './SqliteExpenseQueryRepository';
import { InMemoryExpenseQueryRepository } from './InMemoryExpenseQueryRepository';
import { logger } from '../logging/Logger';

export class RepositoryFactory {
  private businessRepo: BusinessRepository | null = null;
  private userRepo: UserRepository | null = null;
  private categoryRepo: CategoryRepository | null = null;
  private productRepo: ProductRepository | null = null;
  private presentationRepo: ProductPresentationRepository | null = null;
  private identifierRepo: CatalogIdentifierRepository | null = null;
  private movementRepo: InventoryMovementRepository | null = null;
  private lotRepo: InventoryLotRepository | null = null;
  private queryRepo: InventoryQueryRepository | null = null;
  private sessionRepo: SessionRepository | null = null;
  private paymentMethodRepo: PaymentMethodRepository | null = null;
  private saleRepo: SaleRepository | null = null;
  private cashRegisterRepo: CashRegisterRepository | null = null;
  private cashSessionRepo: CashSessionRepository | null = null;
  private cashQueryRepo: CashQueryRepository | null = null;
  private supplierRepo: SupplierRepository | null = null;
  private purchaseOrderRepo: PurchaseOrderRepository | null = null;
  private purchaseQueryRepo: PurchaseQueryRepository | null = null;
  private customerRepo: CustomerRepository | null = null;
  private customerQueryRepo: CustomerQueryRepository | null = null;
  private expenseCategoryRepo: ExpenseCategoryRepository | null = null;
  private operatingExpenseRepo: OperatingExpenseRepository | null = null;
  private expenseQueryRepo: ExpenseQueryRepository | null = null;

  getBusinessRepository(): BusinessRepository {
    if (this.businessRepo) {
      return this.businessRepo;
    }

    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqliteBusinessRepository');
      this.businessRepo = new SqliteBusinessRepository(databaseManager);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemoryBusinessRepository for development/testing');
      this.businessRepo = new InMemoryBusinessRepository();
    }

    return this.businessRepo;
  }

  getUserRepository(): UserRepository {
    if (this.userRepo) {
      return this.userRepo;
    }

    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqliteUserRepository');
      this.userRepo = new SqliteUserRepository(databaseManager);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemoryUserRepository for development/testing');
      this.userRepo = new InMemoryUserRepository();
    }

    return this.userRepo;
  }

  getCategoryRepository(): CategoryRepository {
    if (this.categoryRepo) {
      return this.categoryRepo;
    }

    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqliteCategoryRepository');
      this.categoryRepo = new SqliteCategoryRepository(databaseManager);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemoryCategoryRepository for development/testing');
      this.categoryRepo = new InMemoryCategoryRepository();
    }

    return this.categoryRepo;
  }

  getProductPresentationRepository(): ProductPresentationRepository {
    if (this.presentationRepo) {
      return this.presentationRepo;
    }

    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqliteProductPresentationRepository');
      this.presentationRepo = new SqliteProductPresentationRepository(databaseManager);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemoryProductPresentationRepository for development/testing');
      this.presentationRepo = new InMemoryProductPresentationRepository();
    }

    return this.presentationRepo;
  }

  getCatalogIdentifierRepository(): CatalogIdentifierRepository {
    if (this.identifierRepo) {
      return this.identifierRepo;
    }

    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqliteCatalogIdentifierRepository');
      this.identifierRepo = new SqliteCatalogIdentifierRepository(databaseManager);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemoryCatalogIdentifierRepository for development/testing');
      this.identifierRepo = new InMemoryCatalogIdentifierRepository();
    }

    return this.identifierRepo;
  }

  getProductRepository(): ProductRepository {
    if (this.productRepo) {
      return this.productRepo;
    }

    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqliteProductRepository');
      this.productRepo = new SqliteProductRepository(databaseManager);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemoryProductRepository for development/testing');
      const catRepo = this.getCategoryRepository() as InMemoryCategoryRepository;
      const presRepo = this.getProductPresentationRepository() as InMemoryProductPresentationRepository;
      this.productRepo = new InMemoryProductRepository(catRepo, presRepo);
    }

    return this.productRepo;
  }

  getInventoryMovementRepository(): InventoryMovementRepository {
    if (this.movementRepo) {
      return this.movementRepo;
    }

    const fallback = new InMemoryInventoryMovementRepository();
    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqliteInventoryMovementRepository');
      this.movementRepo = new SqliteInventoryMovementRepository(databaseManager, fallback);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemoryInventoryMovementRepository for development/testing');
      this.movementRepo = fallback;
    }

    return this.movementRepo;
  }

  getInventoryLotRepository(): InventoryLotRepository {
    if (this.lotRepo) {
      return this.lotRepo;
    }

    const movementRepo = this.getInventoryMovementRepository();
    const fallback = new InMemoryInventoryLotRepository(movementRepo);
    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqliteInventoryLotRepository');
      this.lotRepo = new SqliteInventoryLotRepository(databaseManager, fallback);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemoryInventoryLotRepository for development/testing');
      this.lotRepo = fallback;
    }

    return this.lotRepo;
  }

  getInventoryQueryRepository(): InventoryQueryRepository {
    if (this.queryRepo) {
      return this.queryRepo;
    }

    const productRepo = this.getProductRepository();
    const movementRepo = this.getInventoryMovementRepository();
    const lotRepo = this.getInventoryLotRepository();

    const fallback = new InMemoryInventoryQueryRepository(
      productRepo,
      movementRepo,
      lotRepo
    );

    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqliteInventoryQueryRepository');
      this.queryRepo = new SqliteInventoryQueryRepository(databaseManager, fallback);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemoryInventoryQueryRepository for development/testing');
      this.queryRepo = fallback;
    }

    return this.queryRepo;
  }

  getSessionRepository(): SessionRepository {
    if (this.sessionRepo) {
      return this.sessionRepo;
    }

    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating NativeSessionRepository for Tauri native runtime');
      this.sessionRepo = new NativeSessionRepository();
    } else {
      logger.info('RepositoryFactory', 'Instantiating BrowserSessionRepository for browser/development runtime');
      this.sessionRepo = new BrowserSessionRepository();
    }

    return this.sessionRepo;
  }

  getPaymentMethodRepository(): PaymentMethodRepository {
    if (this.paymentMethodRepo) {
      return this.paymentMethodRepo;
    }

    const fallback = new InMemoryPaymentMethodRepository();
    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqlitePaymentMethodRepository');
      this.paymentMethodRepo = new SqlitePaymentMethodRepository(databaseManager, fallback);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemoryPaymentMethodRepository for development/testing');
      this.paymentMethodRepo = fallback;
    }

    return this.paymentMethodRepo;
  }

  getCashRegisterRepository(): CashRegisterRepository {
    if (this.cashRegisterRepo) {
      return this.cashRegisterRepo;
    }

    const fallback = new InMemoryCashRegisterRepository();
    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqliteCashRegisterRepository');
      this.cashRegisterRepo = new SqliteCashRegisterRepository(databaseManager, fallback);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemoryCashRegisterRepository for development/testing');
      this.cashRegisterRepo = fallback;
    }

    return this.cashRegisterRepo;
  }

  getCashSessionRepository(): CashSessionRepository {
    if (this.cashSessionRepo) {
      return this.cashSessionRepo;
    }

    const fallback = new InMemoryCashSessionRepository();
    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqliteCashSessionRepository');
      this.cashSessionRepo = new SqliteCashSessionRepository(databaseManager, fallback);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemoryCashSessionRepository for development/testing');
      this.cashSessionRepo = fallback;
    }

    return this.cashSessionRepo;
  }

  getCashQueryRepository(): CashQueryRepository {
    if (this.cashQueryRepo) {
      return this.cashQueryRepo;
    }

    const sessionRepo = this.getCashSessionRepository();
    const registerRepo = this.getCashRegisterRepository();
    const saleRepo = this.getSaleRepository();

    const fallback = new InMemoryCashQueryRepository(sessionRepo, registerRepo, saleRepo);
    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqliteCashQueryRepository');
      this.cashQueryRepo = new SqliteCashQueryRepository(databaseManager, fallback);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemoryCashQueryRepository for development/testing');
      this.cashQueryRepo = fallback;
    }

    return this.cashQueryRepo;
  }

  getSaleRepository(): SaleRepository {
    if (this.saleRepo) {
      return this.saleRepo;
    }

    const movementRepo = this.getInventoryMovementRepository();
    const cashSessionRepo = this.getCashSessionRepository();
    const fallback = new InMemorySaleRepository(movementRepo, cashSessionRepo);
    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqliteSaleRepository');
      this.saleRepo = new SqliteSaleRepository(databaseManager, fallback);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemorySaleRepository for development/testing');
      this.saleRepo = fallback;
    }

    return this.saleRepo;
  }

  getSupplierRepository(): SupplierRepository {
    if (this.supplierRepo) {
      return this.supplierRepo;
    }

    const fallback = new InMemorySupplierRepository();
    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqliteSupplierRepository');
      this.supplierRepo = new SqliteSupplierRepository(databaseManager, fallback);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemorySupplierRepository for development/testing');
      this.supplierRepo = fallback;
    }

    return this.supplierRepo;
  }

  getPurchaseOrderRepository(): PurchaseOrderRepository {
    if (this.purchaseOrderRepo) {
      return this.purchaseOrderRepo;
    }

    const supplierRepo = this.getSupplierRepository();
    const movementRepo = this.getInventoryMovementRepository();
    const lotRepo = this.getInventoryLotRepository();
    const fallback = new InMemoryPurchaseOrderRepository(supplierRepo, movementRepo, lotRepo);

    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqlitePurchaseOrderRepository');
      this.purchaseOrderRepo = new SqlitePurchaseOrderRepository(databaseManager, supplierRepo, fallback);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemoryPurchaseOrderRepository for development/testing');
      this.purchaseOrderRepo = fallback;
    }

    return this.purchaseOrderRepo;
  }

  getPurchaseQueryRepository(): PurchaseQueryRepository {
    if (this.purchaseQueryRepo) {
      return this.purchaseQueryRepo;
    }

    const orderRepo = this.getPurchaseOrderRepository();
    const fallback = new InMemoryPurchaseQueryRepository(orderRepo);

    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqlitePurchaseQueryRepository');
      this.purchaseQueryRepo = new SqlitePurchaseQueryRepository(databaseManager, fallback);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemoryPurchaseQueryRepository for development/testing');
      this.purchaseQueryRepo = fallback;
    }

    return this.purchaseQueryRepo;
  }

  getCustomerRepository(): CustomerRepository {
    if (this.customerRepo) {
      return this.customerRepo;
    }

    const fallback = new InMemoryCustomerRepository();
    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqliteCustomerRepository');
      this.customerRepo = new SqliteCustomerRepository(databaseManager, fallback);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemoryCustomerRepository for development/testing');
      this.customerRepo = fallback;
    }

    return this.customerRepo;
  }

  getCustomerQueryRepository(): CustomerQueryRepository {
    if (this.customerQueryRepo) {
      return this.customerQueryRepo;
    }

    const customerRepo = this.getCustomerRepository();
    const saleRepo = this.getSaleRepository();
    const fallback = new InMemoryCustomerQueryRepository(customerRepo, saleRepo);

    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqliteCustomerQueryRepository');
      this.customerQueryRepo = new SqliteCustomerQueryRepository(databaseManager, fallback);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemoryCustomerQueryRepository for development/testing');
      this.customerQueryRepo = fallback;
    }

    return this.customerQueryRepo;
  }

  getExpenseCategoryRepository(): ExpenseCategoryRepository {
    if (this.expenseCategoryRepo) {
      return this.expenseCategoryRepo;
    }

    const fallback = new InMemoryExpenseCategoryRepository();
    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqliteExpenseCategoryRepository');
      this.expenseCategoryRepo = new SqliteExpenseCategoryRepository(databaseManager, fallback);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemoryExpenseCategoryRepository for development/testing');
      this.expenseCategoryRepo = fallback;
    }

    return this.expenseCategoryRepo;
  }

  getOperatingExpenseRepository(): OperatingExpenseRepository {
    if (this.operatingExpenseRepo) {
      return this.operatingExpenseRepo;
    }

    const cashSessionRepo = this.getCashSessionRepository();
    const fallback = new InMemoryOperatingExpenseRepository(cashSessionRepo);

    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqliteOperatingExpenseRepository');
      this.operatingExpenseRepo = new SqliteOperatingExpenseRepository(databaseManager, fallback);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemoryOperatingExpenseRepository for development/testing');
      this.operatingExpenseRepo = fallback;
    }

    return this.operatingExpenseRepo;
  }

  getExpenseQueryRepository(): ExpenseQueryRepository {
    if (this.expenseQueryRepo) {
      return this.expenseQueryRepo;
    }

    const fallback = new InMemoryExpenseQueryRepository();
    if (isTauriEnvironment()) {
      logger.info('RepositoryFactory', 'Instantiating SqliteExpenseQueryRepository');
      this.expenseQueryRepo = new SqliteExpenseQueryRepository(databaseManager, fallback);
    } else {
      logger.info('RepositoryFactory', 'Instantiating InMemoryExpenseQueryRepository for development/testing');
      this.expenseQueryRepo = fallback;
    }

    return this.expenseQueryRepo;
  }
}

export const repositoryFactory = new RepositoryFactory();


