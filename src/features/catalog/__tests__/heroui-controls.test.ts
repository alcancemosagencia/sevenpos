import { describe, it, expect, beforeEach } from 'vitest';
import { BASE_UNITS, BaseUnitCode } from '../../../domain/common/unit/BaseUnit';
import { InMemoryCategoryRepository } from '../../../infrastructure/repositories/InMemoryCategoryRepository';
import { InMemoryProductRepository } from '../../../infrastructure/repositories/InMemoryProductRepository';
import { InMemoryProductPresentationRepository } from '../../../infrastructure/repositories/InMemoryProductPresentationRepository';
import { InMemoryCatalogIdentifierRepository } from '../../../infrastructure/repositories/InMemoryCatalogIdentifierRepository';
import { CreateCategory } from '../../../application/catalog/category/CreateCategory';
import { CreateProduct } from '../../../application/catalog/product/CreateProduct';
import { DeactivateCategory } from '../../../application/catalog/category/DeactivateCategory';
import { ListCategories } from '../../../application/catalog/category/ListCategories';

describe('AG-04.1: HeroUI Form Controls and Categories Table Invariants', () => {
  let categoryRepo: InMemoryCategoryRepository;
  let productRepo: InMemoryProductRepository;
  let identifierRepo: InMemoryCatalogIdentifierRepository;
  let createCategory: CreateCategory;
  let createProduct: CreateProduct;
  let deactivateCategory: DeactivateCategory;
  let listCategories: ListCategories;

  beforeEach(() => {
    categoryRepo = new InMemoryCategoryRepository();
    const presentationRepo = new InMemoryProductPresentationRepository();
    productRepo = new InMemoryProductRepository(categoryRepo, presentationRepo);
    identifierRepo = new InMemoryCatalogIdentifierRepository();
    createCategory = new CreateCategory(categoryRepo);
    createProduct = new CreateProduct(productRepo, identifierRepo);
    deactivateCategory = new DeactivateCategory(categoryRepo);
    listCategories = new ListCategories(categoryRepo);
  });

  it('Base units list provides exactly the 6 required standard units', () => {
    const expectedCodes: BaseUnitCode[] = ['UNIT', 'KG', 'G', 'L', 'ML', 'M'];
    const codes = BASE_UNITS.map((u) => u.code);
    expect(codes).toEqual(expectedCodes);

    const unitUnit = BASE_UNITS.find((u) => u.code === 'UNIT');
    expect(unitUnit?.label).toBe('Unidad (u)');
    expect(unitUnit?.shortLabel).toBe('u');

    const kgUnit = BASE_UNITS.find((u) => u.code === 'KG');
    expect(kgUnit?.label).toBe('Kilogramo (kg)');
    expect(kgUnit?.shortLabel).toBe('kg');
  });

  it('Sin categoría asignada maps to null categoryId without creating artificial entity', async () => {
    const res = await createProduct.execute({
      businessId: 'biz-1',
      name: 'Producto sin categoría',
      categoryId: null, // Mapped to null
      baseUnit: 'UNIT',
      salePrice: 1000,
    });

    expect(res.success).toBe(true);
    expect(res.product?.categoryId).toBeNull();

    // Verify repository categories list remained 0
    const catList = await listCategories.execute('biz-1');
    expect(catList.length).toBe(0);
  });

  it('Categories table calculates total associated products count correctly', async () => {
    const catBebidas = await createCategory.execute({
      businessId: 'biz-1',
      name: 'Bebidas',
      color: '#3B82F6',
    });
    const catId = catBebidas.category!.id;

    // Create 3 products under Bebidas
    await createProduct.execute({
      businessId: 'biz-1',
      name: 'Coca Cola 350ml',
      categoryId: catId,
      baseUnit: 'UNIT',
      salePrice: 1000,
    });

    await createProduct.execute({
      businessId: 'biz-1',
      name: 'Fanta 350ml',
      categoryId: catId,
      baseUnit: 'UNIT',
      salePrice: 1000,
    });

    await createProduct.execute({
      businessId: 'biz-1',
      name: 'Sprite 350ml',
      categoryId: catId,
      baseUnit: 'UNIT',
      salePrice: 1000,
    });

    // Count products
    const count = await productRepo.countByCategory(catId, 'biz-1');
    expect(count).toBe(3);
  });

  it('Category status toggles correctly between active and inactive', async () => {
    const created = await createCategory.execute({
      businessId: 'biz-1',
      name: 'Lácteos',
      color: '#10B981',
    });
    const cat = created.category!;
    expect(cat.active).toBe(true);

    // Deactivate
    const deactRes = await deactivateCategory.execute(cat.id, 'biz-1');
    expect(deactRes.success).toBe(true);

    const updated = await categoryRepo.getById(cat.id, 'biz-1');
    expect(updated?.active).toBe(false);
  });
});
