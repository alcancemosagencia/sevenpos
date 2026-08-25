import { repositoryFactory } from '../../../infrastructure/repositories/RepositoryFactory';
import { CreateCategory } from '../../../application/catalog/category/CreateCategory';
import { CreateProduct } from '../../../application/catalog/product/CreateProduct';
import { CreatePresentation } from '../../../application/catalog/presentation/CreatePresentation';

export async function seedCatalogDevData(businessId = 'primary-business'): Promise<{ success: boolean; message: string }> {

  const categoryRepo = repositoryFactory.getCategoryRepository();
  const productRepo = repositoryFactory.getProductRepository();
  const presentationRepo = repositoryFactory.getProductPresentationRepository();
  const identifierRepo = repositoryFactory.getCatalogIdentifierRepository();

  const createCategory = new CreateCategory(categoryRepo);
  const createProduct = new CreateProduct(productRepo, identifierRepo);
  const createPresentation = new CreatePresentation(presentationRepo, productRepo, identifierRepo);

  // 1. Categories
  const catBebidasRes = await createCategory.execute({
    businessId,
    name: 'Bebidas y Líquidos',
    description: 'Refrescos, aguas y jugos',
    color: '#3b82f6',
  });
  const catBebidasId = catBebidasRes.category?.id || null;

  const catAlimentosRes = await createCategory.execute({
    businessId,
    name: 'Abarrotes y Alimentos',
    description: 'Arroz, harinas, pastas y lácteos',
    color: '#10b981',
  });
  const catAlimentosId = catAlimentosRes.category?.id || null;

  const catSnacksRes = await createCategory.execute({
    businessId,
    name: 'Snacks y Galletas',
    description: 'Galletas, chocolates y confites',
    color: '#f59e0b',
  });
  const catSnacksId = catSnacksRes.category?.id || null;

  // 2. Products
  // 1. Coca-Cola 350ml (with presentations)
  const cocaRes = await createProduct.execute({
    businessId,
    name: 'Coca-Cola Original 350ml',
    categoryId: catBebidasId,
    description: 'Lata individual de gaseosa refrescante',
    sku: 'BEB-COCA-350',
    barcode: '7801234567890',
    baseUnit: 'UNIT',
    salePrice: 1000,
    costPrice: 650,
    minimumStock: 24,
  });

  if (cocaRes.product) {
    // Add Pack x6
    await createPresentation.execute({
      businessId,
      productId: cocaRes.product.id,
      name: 'Pack x6 Latas 350ml',
      description: 'Six pack termocontraíble',
      unitFactor: 6,
      salePrice: 5500,
      sku: 'PACK-COCA-6',
      barcode: '7801234567891',
    });

    // Add Caja x24
    await createPresentation.execute({
      businessId,
      productId: cocaRes.product.id,
      name: 'Caja x24 Latas',
      description: 'Bandeja completa de 24 latas',
      unitFactor: 24,
      salePrice: 21000,
      sku: 'CAJA-COCA-24',
      barcode: '7801234567892',
    });
  }

  // 2. Agua Mineral 500ml (with presentation)
  const aguaRes = await createProduct.execute({
    businessId,
    name: 'Agua Mineral sin Gas 500ml',
    categoryId: catBebidasId,
    description: 'Botella individual de agua purificada',
    sku: 'BEB-AGUA-500',
    barcode: '7809876543210',
    baseUnit: 'UNIT',
    salePrice: 800,
    costPrice: 400,
    minimumStock: 12,
  });

  if (aguaRes.product) {
    await createPresentation.execute({
      businessId,
      productId: aguaRes.product.id,
      name: 'Pack x12 Botellas 500ml',
      description: 'Pack familiar de 12 unidades',
      unitFactor: 12,
      salePrice: 8500,
      sku: 'PACK-AGUA-12',
      barcode: '7809876543211',
    });
  }

  // 3. Arroz Grano Largo 1kg
  await createProduct.execute({
    businessId,
    name: 'Arroz Grano Largo Selección 1kg',
    categoryId: catAlimentosId,
    description: 'Bolsa de arroz blanco grado 1',
    sku: 'ABA-ARROZ-1KG',
    barcode: '7805554443332',
    baseUnit: 'KG',
    salePrice: 1690,
    costPrice: 1100,
    minimumStock: 15,
  });

  // 4. Leche Entera 1L
  await createProduct.execute({
    businessId,
    name: 'Leche Entera Natural 1L',
    categoryId: catAlimentosId,
    description: 'Caja tetra brik de leche fresca',
    sku: 'LAC-LECHE-1L',
    barcode: '7801112223334',
    baseUnit: 'L',
    salePrice: 1250,
    costPrice: 890,
    minimumStock: 20,
  });

  // 5. Café Gourmet 250g
  await createProduct.execute({
    businessId,
    name: 'Café Tostado Molido Gourmet 250g',
    categoryId: catAlimentosId,
    description: 'Café de grano arábica selección',
    sku: 'ABA-CAFE-250G',
    barcode: '7804443332221',
    baseUnit: 'G',
    salePrice: 4990,
    costPrice: 3200,
    minimumStock: 8,
  });

  // 6. Galletas Chocolate Rellenas
  await createProduct.execute({
    businessId,
    name: 'Galletas Chocolate Rellenas Vainilla 120g',
    categoryId: catSnacksId,
    description: 'Paquete de galletas crujientes',
    sku: 'SNK-GALL-CHOCO',
    barcode: '7807778889990',
    baseUnit: 'UNIT',
    salePrice: 950,
    costPrice: 580,
    minimumStock: 30,
  });

  // 7. Pan de Molde Integral (Uncategorized test)
  await createProduct.execute({
    businessId,
    name: 'Pan de Molde Integral 500g',
    categoryId: null,
    description: 'Pan artesanal sin categoría asignada',
    sku: 'PAN-INTEG-500',
    barcode: '7800001112223',
    baseUnit: 'UNIT',
    salePrice: 2200,
    costPrice: 1400,
    minimumStock: 10,
  });

  return {
    success: true,
    message: 'Semillas DEV de catálogo cargadas exitosamente (7 productos, 3 categorías, 3 presentaciones).',
  };
}
