import { ProductPresentation, validateProductPresentation } from '../../../domain/catalog/ProductPresentation';
import { ProductPresentationRepository } from '../../../domain/catalog/ProductPresentationRepository';
import { CatalogIdentifierRepository } from '../../../domain/catalog/CatalogIdentifierRepository';
import { ProductIdentifierService } from '../../../domain/catalog/ProductIdentifierService';
import { normalizeSku, normalizeBarcode } from '../../../domain/catalog/Product';

export interface UpdatePresentationDTO {
  id: string;
  businessId: string;
  name: string;
  description?: string | null;
  unitFactor: number;
  salePrice: number;
  sku?: string | null;
  barcode?: string | null;
  imagePath?: string | null;
  active?: boolean;
}

export class UpdatePresentation {
  private identifierService: ProductIdentifierService;

  constructor(
    private presentationRepo: ProductPresentationRepository,
    private identifierRepo: CatalogIdentifierRepository
  ) {
    this.identifierService = new ProductIdentifierService(identifierRepo);
  }

  async execute(dto: UpdatePresentationDTO): Promise<{ success: boolean; presentation?: ProductPresentation; error?: string }> {
    const existing = await this.presentationRepo.getById(dto.id, dto.businessId);
    if (!existing) {
      return { success: false, error: 'La presentación no existe o no pertenece a este negocio.' };
    }

    const trimmedName = dto.name ? dto.name.trim() : existing.name;
    const normSku = normalizeSku(dto.sku !== undefined ? dto.sku : existing.sku);
    const normBarcode = normalizeBarcode(dto.barcode !== undefined ? dto.barcode : existing.barcode);

    const validation = validateProductPresentation({
      ...existing,
      ...dto,
      name: trimmedName,
      sku: normSku,
      barcode: normBarcode,
    });

    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // 1. Check SKU collision if changed
    if (normSku && normSku !== existing.sku) {
      const skuCheck = await this.identifierService.isSkuAvailable(dto.businessId, normSku, dto.id);
      if (!skuCheck.isAvailable) {
        return {
          success: false,
          error: `El SKU "${normSku}" ya está siendo utilizado por ${skuCheck.conflictingOwner}.`,
        };
      }
    }

    // 2. Check Barcode collision if changed
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
    const updated: ProductPresentation = {
      ...existing,
      name: trimmedName,
      description: dto.description !== undefined ? dto.description?.trim() || null : existing.description,
      unitFactor: Math.round(dto.unitFactor),
      salePrice: dto.salePrice,
      sku: normSku,
      barcode: normBarcode,
      imagePath: dto.imagePath !== undefined ? dto.imagePath : existing.imagePath,
      active: dto.active !== undefined ? dto.active : existing.active,
      updatedAt: now,
    };

    await this.presentationRepo.update(updated);

    // Update identifier registry if changed
    if (normSku !== existing.sku) {
      await this.identifierRepo.updateIdentifier(dto.businessId, dto.id, 'SKU', normSku || '');
    }

    if (normBarcode !== existing.barcode) {
      await this.identifierRepo.updateIdentifier(dto.businessId, dto.id, 'BARCODE', normBarcode || '');
    }

    return {
      success: true,
      presentation: updated,
    };
  }
}
