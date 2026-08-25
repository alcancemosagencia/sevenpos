import { CatalogIdentifierRepository } from './CatalogIdentifierRepository';
import { normalizeSku, normalizeBarcode } from './Product';

export class ProductIdentifierService {
  constructor(private identifierRepo: CatalogIdentifierRepository) {}

  /**
   * Validates whether a given SKU is available for a product or presentation in the business.
   * If currentOwnerId is provided, ignores matches belonging to the same owner (for updates).
   */
  async isSkuAvailable(
    businessId: string,
    rawSku?: string | null,
    currentOwnerId?: string
  ): Promise<{ isAvailable: boolean; normalizedSku: string | null; conflictingOwner?: string }> {
    const sku = normalizeSku(rawSku);
    if (!sku) {
      return { isAvailable: true, normalizedSku: null };
    }

    const existing = await this.identifierRepo.findIdentifier(businessId, 'SKU', sku);
    if (existing && existing.ownerId !== currentOwnerId) {
      return {
        isAvailable: false,
        normalizedSku: sku,
        conflictingOwner: existing.ownerType === 'PRODUCT' ? 'un producto existente' : 'una presentación existente',
      };
    }

    return { isAvailable: true, normalizedSku: sku };
  }

  /**
   * Validates whether a given Barcode is available in the business across products and presentations.
   */
  async isBarcodeAvailable(
    businessId: string,
    rawBarcode?: string | null,
    currentOwnerId?: string
  ): Promise<{ isAvailable: boolean; normalizedBarcode: string | null; conflictingOwner?: string }> {
    const barcode = normalizeBarcode(rawBarcode);
    if (!barcode) {
      return { isAvailable: true, normalizedBarcode: null };
    }

    const existing = await this.identifierRepo.findIdentifier(businessId, 'BARCODE', barcode);
    if (existing && existing.ownerId !== currentOwnerId) {
      return {
        isAvailable: false,
        normalizedBarcode: barcode,
        conflictingOwner: existing.ownerType === 'PRODUCT' ? 'un producto existente' : 'una presentación existente',
      };
    }

    return { isAvailable: true, normalizedBarcode: barcode };
  }
}
