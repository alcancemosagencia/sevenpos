import { Supplier, CreateSupplierDto } from '../../domain/purchases/Supplier';
import { SupplierRepository } from '../../domain/purchases/repositories/SupplierRepository';

export class CreateSupplier {
  constructor(private supplierRepo: SupplierRepository) {}

  async execute(businessId: string, dto: CreateSupplierDto): Promise<Supplier> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new Error('El nombre del proveedor es obligatorio.');
    }

    const existing = await this.supplierRepo.findByName(businessId, dto.name.trim());
    if (existing) {
      throw new Error(`Ya existe un proveedor con el nombre "${dto.name.trim()}".`);
    }

    return this.supplierRepo.create(businessId, {
      ...dto,
      name: dto.name.trim(),
      taxId: dto.taxId ? dto.taxId.trim() : null,
      contactName: dto.contactName ? dto.contactName.trim() : null,
      phone: dto.phone ? dto.phone.trim() : null,
      email: dto.email ? dto.email.trim() : null,
      address: dto.address ? dto.address.trim() : null,
      notes: dto.notes ? dto.notes.trim() : null,
    });
  }
}
