import { Product, validateProduct, normalizeSku, normalizeBarcode } from '../../../domain/catalog/Product';
import { ProductRepository } from '../../../domain/catalog/ProductRepository';
import { CatalogIdentifierRepository } from '../../../domain/catalog/CatalogIdentifierRepository';
import { ProductIdentifierService } from '../../../domain/catalog/ProductIdentifierService';
import { BaseUnitCode } from '../../../domain/common/unit/BaseUnit';

export interface UpdateProductDTO {
  id: string;
  businessId: string;
  name: string;
  categoryId?: string | null;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  baseUnit: BaseUnitCode;
  salePrice: number;
  costPrice?: number | null;
  minimumStock?: number | null;
  imagePath?: string | null;
  featured?: boolean;
  active?: boolean;
}

export class UpdateProduct {
  private identifierService: ProductIdentifierService;

  constructor(
    private productRepo: ProductRepository,
    private identifierRepo: CatalogIdentifierRepository
  ) {
    this.identifierService = new ProductIdentifierService(identifierRepo);
  }

  async execute(dto: UpdateProductDTO): Promise<{ success: boolean; product?: Product; error?: string }> {
    const existing = await this.productRepo.getById(dto.id, dto.businessId);
    if (!existing) {
      return { success: false, error: 'El producto no existe o no pertenece a este negocio.' };
    }

    const trimmedName = dto.name ? dto.name.trim() : existing.name;
    const normSku = normalizeSku(dto.sku !== undefined ? dto.sku : existing.sku);
    const normBarcode = normalizeBarcode(dto.barcode !== undefined ? dto.barcode : existing.barcode);

    const validation = validateProduct({
      ...existing,
      ...dto,
      name: trimmedName,
      sku: normSku,
      barcode: normBarcode,
    });

    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // 1. Verify SKU uniqueness if changed
    if (normSku && normSku !== existing.sku) {
      const skuCheck = await this.identifierService.isSkuAvailable(dto.businessId, normSku, dto.id);
      if (!skuCheck.isAvailable) {
        return {
          success: false,
          error: `El SKU "${normSku}" ya está siendo utilizado por ${skuCheck.conflictingOwner}.`,
        };
      }
    }

    // 2. Verify Barcode uniqueness if changed
    if (normBarcode && normBarcode !== existing.barcode) {
      const barcodeCheck = await this.identifierService.isBarcodeAvailable(dto.businessId, normBarcode, dto.id);
      if (!barcodeCheck.isAvailable) {
        return {
          success: false,
          error: `El código de barras "${normBarcode}" ya está registrado en ${barcodeCheck.conflictingOwner}.`,
        };
      }
    }

    const now = new Date().toISOString();
    const updated: Product = {
      ...existing,
      categoryId: dto.categoryId !== undefined ? dto.categoryId : existing.categoryId,
      name: trimmedName,
      description: dto.description !== undefined ? dto.description?.trim() || null : existing.description,
      sku: normSku,
      barcode: normBarcode,
      baseUnit: dto.baseUnit || existing.baseUnit,
      salePrice: dto.salePrice !== undefined ? dto.salePrice : existing.salePrice,
      costPrice: dto.costPrice !== undefined ? dto.costPrice : existing.costPrice,
      minimumStock: dto.minimumStock !== undefined ? dto.minimumStock : existing.minimumStock,
      imagePath: dto.imagePath !== undefined ? dto.imagePath : existing.imagePath,
      featured: dto.featured !== undefined ? dto.featured : existing.featured,
      active: dto.active !== undefined ? dto.active : existing.active,
      updatedAt: now,
    };

    await this.productRepo.update(updated);

    // Update identifier registry if changed
    if (normSku !== existing.sku) {
      await this.identifierRepo.updateIdentifier(dto.businessId, dto.id, 'SKU', normSku || '');
    }

    if (normBarcode !== existing.barcode) {
      await this.identifierRepo.updateIdentifier(dto.businessId, dto.id, 'BARCODE', normBarcode || '');
    }

    return {
      success: true,
      product: updated,
    };
  }
}
