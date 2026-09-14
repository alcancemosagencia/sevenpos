import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryProductRepository } from '../infrastructure/repositories/InMemoryProductRepository';
import { InMemoryCatalogIdentifierRepository } from '../infrastructure/repositories/InMemoryCatalogIdentifierRepository';
import { InMemorySubscriptionRepository } from '../infrastructure/repositories/InMemorySubscriptionRepository';
import { UsageService } from '../application/subscription/UsageService';
import { EntitlementService } from '../application/subscription/EntitlementService';
import { CreateProduct } from '../application/catalog/product/CreateProduct';
import { Product } from '../domain/catalog/Product';

describe('Entitlement - Free Products Limit (100 Active)', () => {
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

  it('allows creating up to 100 active products on Free plan', async () => {
    for (let i = 1; i <= 100; i++) {
      const res = await createProduct.execute({
        businessId: 'biz-prod-test',
        name: `Producto ${i}`,
        sku: `SKU-${i}`,
        baseUnit: 'UNIT',
        salePrice: 1000 + i,
      });
      expect(res.success).toBe(true);
      expect(res.product?.name).toBe(`Producto ${i}`);
    }

    const count = await usageService.getActiveProductsCount('biz-prod-test');
    expect(count).toBe(100);

    // 101st active product must be blocked with LIMIT_REACHED
    const extraRes = await createProduct.execute({
      businessId: 'biz-prod-test',
      name: 'Producto 101',
      sku: 'SKU-101',
      baseUnit: 'UNIT',
      salePrice: 2000,
    });

    expect(extraRes.success).toBe(false);
    expect(extraRes.error).toMatch(/alcanzado el límite de 100/i);
  });

  it('deactivating a product frees up slot to allow creating another product', async () => {
    // Fill up to 100 products
    for (let i = 1; i <= 100; i++) {
      const now = new Date().toISOString();
      const prod: Product = {
        id: `prod-${i}`,
        businessId: 'biz-prod-test',
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

    expect(await usageService.getActiveProductsCount('biz-prod-test')).toBe(100);

    // Deactivate 1 product
    await productRepo.deactivate('prod-1', 'biz-prod-test');
    expect(await usageService.getActiveProductsCount('biz-prod-test')).toBe(99);

    // Now creating product 101 succeeds
    const newRes = await createProduct.execute({
      businessId: 'biz-prod-test',
      name: 'Producto 101',
      sku: 'SKU-101',
      baseUnit: 'UNIT',
      salePrice: 2000,
    });

    expect(newRes.success).toBe(true);
    expect(await usageService.getActiveProductsCount('biz-prod-test')).toBe(100);
  });

  it('Pro plan allows creating beyond 100 products', async () => {
    await subRepo.setPlan('biz-prod-test', 'PRO');

    for (let i = 1; i <= 105; i++) {
      const now = new Date().toISOString();
      const prod: Product = {
        id: `prod-pro-${i}`,
        businessId: 'biz-prod-test',
        name: `Producto Pro ${i}`,
        categoryId: null,
        description: null,
        sku: `SKU-PRO-${i}`,
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

    const nextRes = await createProduct.execute({
      businessId: 'biz-prod-test',
      name: 'Producto Pro 106',
      sku: 'SKU-PRO-106',
      baseUnit: 'UNIT',
      salePrice: 1000,
    });

    expect(nextRes.success).toBe(true);
    expect(nextRes.product?.name).toBe('Producto Pro 106');
  });
});
