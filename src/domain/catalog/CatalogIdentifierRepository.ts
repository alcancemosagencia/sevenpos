import { CatalogIdentifier, IdentifierType } from './CatalogIdentifier';

export interface CatalogIdentifierRepository {
  findIdentifier(
    businessId: string,
    type: IdentifierType,
    value: string
  ): Promise<CatalogIdentifier | null>;

  registerIdentifier(identifier: CatalogIdentifier): Promise<void>;

  updateIdentifier(
    businessId: string,
    ownerId: string,
    type: IdentifierType,
    newValue: string
  ): Promise<void>;

  removeIdentifiersByOwner(businessId: string, ownerId: string): Promise<void>;
}
