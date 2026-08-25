import { Supplier, UpdateSupplierDto } from '../../domain/purchases/Supplier';
import { SupplierRepository } from '../../domain/purchases/repositories/SupplierRepository';

export class UpdateSupplier {
  constructor(private supplierRepo: SupplierRepository) {}

  async execute(businessId: string, id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const existing = await this.supplierRepo.findById(businessId, id);
    if (!existing) {
      throw new Error('Proveedor no encontrado.');
    }

    if (dto.name !== undefined) {
      if (!dto.name || dto.name.trim().length === 0) {
        throw new Error('El nombre del proveedor no puede estar vacío.');
      }
      const duplicate = await this.supplierRepo.findByName(businessId, dto.name.trim());
      if (duplicate && duplicate.id !== id) {
        throw new Error(`Ya existe otro proveedor con el nombre "${dto.name.trim()}".`);
      }
    }

    return this.supplierRepo.update(businessId, id, {
      ...dto,
      name: dto.name ? dto.name.trim() : undefined,
      taxId: dto.taxId !== undefined ? (dto.taxId ? dto.taxId.trim() : null) : undefined,
      contactName: dto.contactName !== undefined ? (dto.contactName ? dto.contactName.trim() : null) : undefined,
      phone: dto.phone !== undefined ? (dto.phone ? dto.phone.trim() : null) : undefined,
      email: dto.email !== undefined ? (dto.email ? dto.email.trim() : null) : undefined,
      address: dto.address !== undefined ? (dto.address ? dto.address.trim() : null) : undefined,
      notes: dto.notes !== undefined ? (dto.notes ? dto.notes.trim() : null) : undefined,
    });
  }
}
