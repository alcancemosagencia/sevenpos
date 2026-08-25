import { Product, validateProduct, normalizeSku, normalizeBarcode } from '../../../domain/catalog/Product';
import { ProductRepository } from '../../../domain/catalog/ProductRepository';
import { CatalogIdentifierRepository } from '../../../domain/catalog/CatalogIdentifierRepository';
import { ProductIdentifierService } from '../../../domain/catalog/ProductIdentifierService';
import { BaseUnitCode } from '../../../domain/common/unit/BaseUnit';

export interface CreateProductDTO {
  businessId: string;
  name: string;
  categoryId?: string | null;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  baseUnit: BaseUnitCode;
  salePrice: number; // minor units
  costPrice?: number | null; // minor units
  minimumStock?: number | null;
  imagePath?: string | null;
  featured?: boolean;
}

export class CreateProduct {
  private identifierService: ProductIdentifierService;

  constructor(
    private productRepo: ProductRepository,
    private identifierRepo: CatalogIdentifierRepository
  ) {
    this.identifierService = new ProductIdentifierService(identifierRepo);
  }

  async execute(dto: CreateProductDTO): Promise<{ success: boolean; product?: Product; error?: string }> {
    const trimmedName = dto.name ? dto.name.trim() : '';
    const normSku = normalizeSku(dto.sku);
    const normBarcode = normalizeBarcode(dto.barcode);

    const validation = validateProduct({
      ...dto,
      name: trimmedName,
      sku: normSku,
      barcode: normBarcode,
    });

    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // 1. Verify SKU uniqueness across all products & presentations
    if (normSku) {
      const skuCheck = await this.identifierService.isSkuAvailable(dto.businessId, normSku);
      if (!skuCheck.isAvailable) {
        return {
          success: false,
          error: `El SKU "${normSku}" ya está siendo utilizado por ${skuCheck.conflictingOwner}.`,
        };
      }
    }

    // 2. Verify Barcode uniqueness across all products & presentations
    if (normBarcode) {
      const barcodeCheck = await this.identifierService.isBarcodeAvailable(dto.businessId, normBarcode);
      if (!barcodeCheck.isAvailable) {
        return {
          success: false,
          error: `El código de barras "${normBarcode}" ya está registrado en ${barcodeCheck.conflictingOwner}.`,
        };
      }
    }

    const now = new Date().toISOString();
    const productId = crypto.randomUUID();

    const product: Product = {
      id: productId,
      businessId: dto.businessId,
      categoryId: dto.categoryId || null,
      name: trimmedName,
      description: dto.description?.trim() || null,
      sku: normSku,
      barcode: normBarcode,
      baseUnit: dto.baseUnit || 'UNIT',
      salePrice: dto.salePrice,
      costPrice: dto.costPrice ?? null,
      minimumStock: dto.minimumStock ?? null,
      imagePath: dto.imagePath || null,
      featured: dto.featured ?? false,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    // Save product
    await this.productRepo.save(product);

    // Register identifiers in central registry
    if (normSku) {
      await this.identifierRepo.registerIdentifier({
        id: crypto.randomUUID(),
        businessId: dto.businessId,
        identifierType: 'SKU',
        identifierValue: normSku,
        ownerType: 'PRODUCT',
        ownerId: productId,
        createdAt: now,
      });
    }

    if (normBarcode) {
      await this.identifierRepo.registerIdentifier({
        id: crypto.randomUUID(),
        businessId: dto.businessId,
        identifierType: 'BARCODE',
        identifierValue: normBarcode,
        ownerType: 'PRODUCT',
        ownerId: productId,
        createdAt: now,
      });
    }

    return {
      success: true,
      product,
    };
  }
}
