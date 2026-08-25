import { describe, it, expect, beforeEach } from 'vitest';
import {
  toMinorUnits,
  toMajorUnits,
  formatMoney,
  parseMoneyInput,
} from '../../../domain/common/money/Money';
import { InMemoryCategoryRepository } from '../../../infrastructure/repositories/InMemoryCategoryRepository';
import { InMemoryProductRepository } from '../../../infrastructure/repositories/InMemoryProductRepository';
import { InMemoryProductPresentationRepository } from '../../../infrastructure/repositories/InMemoryProductPresentationRepository';
import { InMemoryCatalogIdentifierRepository } from '../../../infrastructure/repositories/InMemoryCatalogIdentifierRepository';
import { CreateCategory } from '../../../application/catalog/category/CreateCategory';
import { UpdateCategory } from '../../../application/catalog/category/UpdateCategory';
import { DeactivateCategory } from '../../../application/catalog/category/DeactivateCategory';
import { CreateProduct } from '../../../application/catalog/product/CreateProduct';
import { UpdateProduct } from '../../../application/catalog/product/UpdateProduct';
import { ListProducts } from '../../../application/catalog/product/ListProducts';
import { CreatePresentation } from '../../../application/catalog/presentation/CreatePresentation';

describe('AG-04: Money Domain and Minor Units Strategy', () => {
  it('CLP / COP minor units roundtrip (0 decimals)', () => {
    const clpMinor = toMinorUnits(12990, 'CLP');
    expect(clpMinor).toBe(12990);
    expect(toMajorUnits(clpMinor, 'CLP')).toBe(12990);
    expect(formatMoney(clpMinor, 'CLP')).toContain('12.990');

    const copMinor = toMinorUnits(19900, 'COP');
    expect(copMinor).toBe(19900);
    expect(toMajorUnits(copMinor, 'COP')).toBe(19900);
  });

  it('USD / VES minor units roundtrip (2 decimals)', () => {
    const usdMinor = toMinorUnits(12.5, 'USD');
    expect(usdMinor).toBe(1250);
    expect(toMajorUnits(usdMinor, 'USD')).toBe(12.5);
    expect(formatMoney(usdMinor, 'USD')).toBe('$ 12.50');

    const vesMinor = toMinorUnits(12.5, 'VES');
    expect(vesMinor).toBe(1250);
    expect(toMajorUnits(vesMinor, 'VES')).toBe(12.5);
  });

  it('parseMoneyInput parses strings safely into integer minor units', () => {
    expect(parseMoneyInput('$ 12.990', 'CLP')).toBe(12990);
    expect(parseMoneyInput('12990', 'CLP')).toBe(12990);
    expect(parseMoneyInput('12.50', 'USD')).toBe(1250);
    expect(parseMoneyInput('$ 12,50', 'USD')).toBe(1250);
    expect(parseMoneyInput('Bs. 25,75', 'VES')).toBe(2575);
    expect(parseMoneyInput('invalid', 'CLP')).toBeNull();
    expect(parseMoneyInput('', 'CLP')).toBeNull();
  });
});

describe('AG-04: Category Domain and Use Cases', () => {
  let categoryRepo: InMemoryCategoryRepository;
  let createCategory: CreateCategory;
  let updateCategory: UpdateCategory;
  let deactivateCategory: DeactivateCategory;

  beforeEach(() => {
    categoryRepo = new InMemoryCategoryRepository();
    categoryRepo.clear();
    createCategory = new CreateCategory(categoryRepo);
    updateCategory = new UpdateCategory(categoryRepo);
    deactivateCategory = new DeactivateCategory(categoryRepo);
  });

  it('creates category with name and color successfully', async () => {
    const res = await createCategory.execute({
      businessId: 'biz-1',
      name: 'Bebidas',
      description: 'Refrescos y aguas',
      color: '#3b82f6',
    });

    expect(res.success).toBe(true);
    expect(res.category?.name).toBe('Bebidas');
    expect(res.category?.active).toBe(true);

    const list = await categoryRepo.list('biz-1');
    expect(list.length).toBe(1);
  });

  it('rejects duplicate active category name within same business', async () => {
    await createCategory.execute({
      businessId: 'biz-1',
      name: 'Bebidas',
    });

    const duplicate = await createCategory.execute({
      businessId: 'biz-1',
      name: ' bebidas ',
    });

    expect(duplicate.success).toBe(false);
    expect(duplicate.error).toContain('Ya existe una categoría activa');
  });

  it('allows same category name across different businesses', async () => {
    const res1 = await createCategory.execute({ businessId: 'biz-1', name: 'Bebidas' });
    const res2 = await createCategory.execute({ businessId: 'biz-2', name: 'Bebidas' });

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
  });

  it('updates category successfully', async () => {
    const created = await createCategory.execute({
      businessId: 'biz-1',
      name: 'Lácteos',
    });

    const updated = await updateCategory.execute({
      id: created.category!.id,
      businessId: 'biz-1',
      name: 'Lácteos y Quesos',
      color: '#10b981',
    });

    expect(updated.success).toBe(true);
    expect(updated.category?.name).toBe('Lácteos y Quesos');
  });

  it('deactivates category logically without hard delete', async () => {
    const created = await createCategory.execute({ businessId: 'biz-1', name: 'Snacks' });
    await deactivateCategory.execute(created.category!.id, 'biz-1');

    const activeList = await categoryRepo.list('biz-1', true);
    expect(activeList.length).toBe(0);

    const allList = await categoryRepo.list('biz-1', false);
    expect(allList.length).toBe(1);
    expect(allList[0].active).toBe(false);
  });
});

describe('AG-04: Product & Presentation Cross-Table Identifier Uniqueness', () => {
  let categoryRepo: InMemoryCategoryRepository;
  let productRepo: InMemoryProductRepository;
  let presentationRepo: InMemoryProductPresentationRepository;
  let identifierRepo: InMemoryCatalogIdentifierRepository;

  let createProduct: CreateProduct;
  let updateProduct: UpdateProduct;
  let createPresentation: CreatePresentation;
  let listProducts: ListProducts;

  beforeEach(() => {
    categoryRepo = new InMemoryCategoryRepository();
    categoryRepo.clear();
    presentationRepo = new InMemoryProductPresentationRepository();
    presentationRepo.clear();
    identifierRepo = new InMemoryCatalogIdentifierRepository();
    identifierRepo.clear();
    productRepo = new InMemoryProductRepository(categoryRepo, presentationRepo);
    productRepo.clear();

    createProduct = new CreateProduct(productRepo, identifierRepo);
    updateProduct = new UpdateProduct(productRepo, identifierRepo);
    createPresentation = new CreatePresentation(presentationRepo, productRepo, identifierRepo);
    listProducts = new ListProducts(productRepo);
  });

  it('creates product with normalized SKU and preserved barcode with leading zeros', async () => {
    const res = await createProduct.execute({
      businessId: 'biz-1',
      name: 'Coca-Cola 350ml',
      sku: '  beb-coca-350  ',
      barcode: '001234567890',
      baseUnit: 'UNIT',
      salePrice: 1000,
      costPrice: 650,
      minimumStock: 10,
    });

    expect(res.success).toBe(true);
    expect(res.product?.sku).toBe('BEB-COCA-350');
    expect(res.product?.barcode).toBe('001234567890'); // Leading zeros preserved

    const foundByBarcode = await productRepo.findByBarcode('001234567890', 'biz-1');
    expect(foundByBarcode).not.toBeNull();
    expect(foundByBarcode?.barcode).toBe('001234567890');
  });

  it('updates product and adjusts identifier registry', async () => {
    const res = await createProduct.execute({
      businessId: 'biz-1',
      name: 'Sprite 350ml',
      sku: 'BEB-SPR-350',
      baseUnit: 'UNIT',
      salePrice: 900,
    });

    const updated = await updateProduct.execute({
      id: res.product!.id,
      businessId: 'biz-1',
      name: 'Sprite Zero 350ml',
      baseUnit: 'UNIT',
      salePrice: 950,
      sku: 'BEB-SPR-ZERO-350',
    });

    expect(updated.success).toBe(true);
    expect(updated.product?.name).toBe('Sprite Zero 350ml');
    expect(updated.product?.salePrice).toBe(950);
    expect(updated.product?.sku).toBe('BEB-SPR-ZERO-350');
  });

  it('rejects duplicate SKU between two products in the same business', async () => {
    await createProduct.execute({
      businessId: 'biz-1',
      name: 'Coca-Cola 350ml',
      sku: 'SKU-001',
      baseUnit: 'UNIT',
      salePrice: 1000,
    });

    const duplicate = await createProduct.execute({
      businessId: 'biz-1',
      name: 'Pepsi 350ml',
      sku: 'sku-001', // Should normalize and conflict
      baseUnit: 'UNIT',
      salePrice: 900,
    });

    expect(duplicate.success).toBe(false);
    expect(duplicate.error).toContain('ya está siendo utilizado');
  });

  it('CRITICAL TEST: rejects duplicate barcode between a Product and a Presentation', async () => {
    // 1. Create base product with barcode 780123456789
    const prodRes = await createProduct.execute({
      businessId: 'biz-1',
      name: 'Agua Mineral 500ml',
      barcode: '780123456789',
      baseUnit: 'UNIT',
      salePrice: 800,
    });
    expect(prodRes.success).toBe(true);

    // 2. Attempt to create presentation with the same barcode
    const presRes = await createPresentation.execute({
      businessId: 'biz-1',
      productId: prodRes.product!.id,
      name: 'Pack x6 Botellas',
      unitFactor: 6,
      salePrice: 4500,
      barcode: '780123456789', // CONFLICT
    });

    expect(presRes.success).toBe(false);
    expect(presRes.error).toContain('ya está registrado en un producto existente');
  });

  it('CRITICAL TEST: rejects duplicate SKU between a Presentation and a new Product', async () => {
    // 1. Create product
    const prod1 = await createProduct.execute({
      businessId: 'biz-1',
      name: 'Cerveza Lager 330ml',
      sku: 'CERV-LAGER-330',
      baseUnit: 'UNIT',
      salePrice: 1200,
    });

    // 2. Create presentation with SKU PACK-CERV-24
    const presRes = await createPresentation.execute({
      businessId: 'biz-1',
      productId: prod1.product!.id,
      name: 'Caja x24 Latas',
      unitFactor: 24,
      salePrice: 24000,
      sku: 'PACK-CERV-24',
    });
    expect(presRes.success).toBe(true);

    // 3. Create another product attempting to use PACK-CERV-24 as product SKU
    const prod2 = await createProduct.execute({
      businessId: 'biz-1',
      name: 'Pack Especial Cerveza',
      sku: 'pack-cerv-24', // CONFLICT with presentation
      baseUnit: 'UNIT',
      salePrice: 25000,
    });

    expect(prod2.success).toBe(false);
    expect(prod2.error).toContain('ya está siendo utilizado por una presentación existente');
  });

  it('allows same SKU across different businesses (multi-tenant boundary)', async () => {
    const resA = await createProduct.execute({
      businessId: 'business-A',
      name: 'Producto A',
      sku: 'SKU-UNIVERSAL',
      baseUnit: 'UNIT',
      salePrice: 1000,
    });

    const resB = await createProduct.execute({
      businessId: 'business-B',
      name: 'Producto B',
      sku: 'SKU-UNIVERSAL',
      baseUnit: 'UNIT',
      salePrice: 1500,
    });

    expect(resA.success).toBe(true);
    expect(resB.success).toBe(true);
  });

  it('validates presentation unitFactor is a positive integer', async () => {
    const prod = await createProduct.execute({
      businessId: 'biz-1',
      name: 'Vino Tinto 750ml',
      baseUnit: 'UNIT',
      salePrice: 5000,
    });

    const invalidFactor = await createPresentation.execute({
      businessId: 'biz-1',
      productId: prod.product!.id,
      name: 'Caja x6',
      unitFactor: 0, // INVALID
      salePrice: 28000,
    });

    expect(invalidFactor.success).toBe(false);
    expect(invalidFactor.error).toContain('factor de conversión');
  });

  it('lists products with query search across name, SKU, and presentation barcodes', async () => {
    const prod1 = await createProduct.execute({
      businessId: 'biz-1',
      name: 'Coca-Cola 350ml',
      sku: 'BEB-COCA-350',
      barcode: '780111111111',
      baseUnit: 'UNIT',
      salePrice: 1000,
    });

    await createPresentation.execute({
      businessId: 'biz-1',
      productId: prod1.product!.id,
      name: 'Pack x6',
      unitFactor: 6,
      salePrice: 5500,
      barcode: '780999999999', // Unique presentation barcode
    });

    await createProduct.execute({
      businessId: 'biz-1',
      name: 'Arroz 1kg',
      sku: 'ABA-ARROZ-1KG',
      baseUnit: 'KG',
      salePrice: 1500,
    });

    // Search by presentation barcode returns base product
    const searchByPresBarcode = await listProducts.execute({
      businessId: 'biz-1',
      query: '780999999999',
    });

    expect(searchByPresBarcode.items.length).toBe(1);
    expect(searchByPresBarcode.items[0].product.name).toBe('Coca-Cola 350ml');
    expect(searchByPresBarcode.items[0].presentationCount).toBe(1);
  });
});
