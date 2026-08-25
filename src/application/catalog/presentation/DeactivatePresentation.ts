import { ProductPresentationRepository } from '../../../domain/catalog/ProductPresentationRepository';

export class DeactivatePresentation {
  constructor(private presentationRepo: ProductPresentationRepository) {}

  async execute(id: string, businessId: string): Promise<{ success: boolean; error?: string }> {
    const existing = await this.presentationRepo.getById(id, businessId);
    if (!existing) {
      return { success: false, error: 'La presentación no existe.' };
    }
    await this.presentationRepo.deactivate(id, businessId);
    return { success: true };
  }
}
