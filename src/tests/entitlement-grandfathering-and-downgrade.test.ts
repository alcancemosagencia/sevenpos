import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryProductRepository } from '../infrastructure/repositories/InMemoryProductRepository';
import { InMemoryCatalogIdentifierRepository } from '../infrastructure/repositories/InMemoryCatalogIdentifierRepository';
import { InMemorySubscriptionRepository } from '../infrastructure/repositories/InMemorySubscriptionRepository';
import { UsageService } from '../application/subscription/UsageService';
import { EntitlementService } from '../application/subscription/EntitlementService';
import { CreateProduct } from '../application/catalog/product/CreateProduct';
import { Product } from '../domain/catalog/Product';

describe('Entitlement - Grandfathering & Downgrade (Zero Data Loss)', () => {
  let productRepo: InMemoryProductRepository;
  let identifierRepo: InMemoryCatalogIdentifierRepository;
  let subRepo: InMemorySubscriptionRepository;
  let usageService: UsageService;
  let entitlementService: EntitlementService;
  let createProduct: CreateProduct;

  beforeEach(() => {
    productRepo = new InMemoryProductRepository();
    identifierRepo = new InMemoryCatalogIdentifierRepository();
    subRepo = new InMemorySubscriptionRepository();
    usageService = new UsageService(subRepo, { productRepo });
    entitlementService = new EntitlementService(subRepo, usageService);
    createProduct = new CreateProduct(productRepo, identifierRepo, entitlementService);
  });

  it('preserves 150 products when business downgrades from Pro to Free without deleting any data', async () => {
    // In Pro: 150 products created
    await subRepo.setPlan('biz-down-test', 'PRO');
    for (let i = 1; i <= 150; i++) {
      const now = new Date().toISOString();
      const prod: Product = {
        id: `prod-${i}`,
        businessId: 'biz-down-test',
        name: `Producto ${i}`,
        categoryId: null,
        description: null,
        sku: `SKU-${i}`,
        barcode: null,
        baseUnit: 'UNIT',
        salePrice: 1000,
        costPrice: null,
        minimumStock: null,
        imagePath: null,
        featured: false,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      await productRepo.save(prod);
    }

    expect(await usageService.getActiveProductsCount('biz-down-test')).toBe(150);

    // Business downgrades to Free
    await subRepo.setPlan('biz-down-test', 'FREE');

    // All 150 products remain in database untouched
    const count = await usageService.getActiveProductsCount('biz-down-test');
    expect(count).toBe(150);

    // Existing products can still be retrieved
    const p1 = await productRepo.getById('prod-1', 'biz-down-test');
    expect(p1).toBeDefined();

    // But creating a 151st product is blocked until active products < 100
    const extraRes = await createProduct.execute({
      businessId: 'biz-down-test',
      name: 'Producto 151',
      sku: 'SKU-151',
      baseUnit: 'UNIT',
      salePrice: 2000,
    });

    expect(extraRes.success).toBe(false);
    expect(extraRes.error).toMatch(/alcanzado el límite de 100/i);
  });
});
