import { ProductPresentation, validateProductPresentation } from '../../../domain/catalog/ProductPresentation';
import { ProductPresentationRepository } from '../../../domain/catalog/ProductPresentationRepository';
import { ProductRepository } from '../../../domain/catalog/ProductRepository';
import { CatalogIdentifierRepository } from '../../../domain/catalog/CatalogIdentifierRepository';
import { ProductIdentifierService } from '../../../domain/catalog/ProductIdentifierService';
import { normalizeSku, normalizeBarcode } from '../../../domain/catalog/Product';

export interface CreatePresentationDTO {
  businessId: string;
  productId: string;
  name: string;
  description?: string | null;
  unitFactor: number;
  salePrice: number;
  sku?: string | null;
  barcode?: string | null;
  imagePath?: string | null;
}

export class CreatePresentation {
  private identifierService: ProductIdentifierService;

  constructor(
    private presentationRepo: ProductPresentationRepository,
    private productRepo: ProductRepository,
    private identifierRepo: CatalogIdentifierRepository
  ) {
    this.identifierService = new ProductIdentifierService(identifierRepo);
  }

  async execute(dto: CreatePresentationDTO): Promise<{ success: boolean; presentation?: ProductPresentation; error?: string }> {
    const parentProduct = await this.productRepo.getById(dto.productId, dto.businessId);
    if (!parentProduct) {
      return { success: false, error: 'El producto base asociado no existe o no pertenece a este negocio.' };
    }

    const trimmedName = dto.name ? dto.name.trim() : '';
    const normSku = normalizeSku(dto.sku);
    const normBarcode = normalizeBarcode(dto.barcode);

    const validation = validateProductPresentation({
      ...dto,
      name: trimmedName,
      sku: normSku,
      barcode: normBarcode,
    });

    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // 1. Verify SKU uniqueness across products and presentations
    if (normSku) {
      const skuCheck = await this.identifierService.isSkuAvailable(dto.businessId, normSku);
      if (!skuCheck.isAvailable) {
        return {
          success: false,
          error: `El SKU "${normSku}" ya está siendo utilizado por ${skuCheck.conflictingOwner}.`,
        };
      }
    }

    // 2. Verify Barcode uniqueness across products and presentations
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
    const presentationId = crypto.randomUUID();

    const presentation: ProductPresentation = {
      id: presentationId,
      businessId: dto.businessId,
      productId: dto.productId,
      name: trimmedName,
      description: dto.description?.trim() || null,
      unitFactor: Math.round(dto.unitFactor),
      salePrice: dto.salePrice,
      sku: normSku,
      barcode: normBarcode,
      imagePath: dto.imagePath || null,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    await this.presentationRepo.save(presentation);

    // Register identifiers in central registry
    if (normSku) {
      await this.identifierRepo.registerIdentifier({
        id: crypto.randomUUID(),
        businessId: dto.businessId,
        identifierType: 'SKU',
        identifierValue: normSku,
        ownerType: 'PRESENTATION',
        ownerId: presentationId,
        createdAt: now,
      });
    }

    if (normBarcode) {
      await this.identifierRepo.registerIdentifier({
        id: crypto.randomUUID(),
        businessId: dto.businessId,
        identifierType: 'BARCODE',
        identifierValue: normBarcode,
        ownerType: 'PRESENTATION',
        ownerId: presentationId,
        createdAt: now,
      });
    }

    return {
      success: true,
      presentation,
    };
  }
}
