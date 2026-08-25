export type IdentifierType = 'SKU' | 'BARCODE';
export type IdentifierOwnerType = 'PRODUCT' | 'PRESENTATION';

export interface CatalogIdentifier {
  id: string;
  businessId: string;
  identifierType: IdentifierType;
  identifierValue: string;
  ownerType: IdentifierOwnerType;
  ownerId: string;
  createdAt: string;
}
