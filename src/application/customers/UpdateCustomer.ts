import { Customer, UpdateCustomerDto, DuplicateCustomerMatch } from '../../domain/customers/Customer';
import { CustomerRepository } from '../../domain/customers/repositories/CustomerRepository';

export interface UpdateCustomerResult {
  customer: Customer;
  duplicateWarnings: DuplicateCustomerMatch[];
}

export class UpdateCustomer {
  constructor(private customerRepo: CustomerRepository) {}

  async execute(
    businessId: string,
    id: string,
    dto: UpdateCustomerDto,
    _allowDuplicates: boolean = false
  ): Promise<UpdateCustomerResult> {
    if (dto.name !== undefined && !dto.name.trim()) {
      throw new Error('El nombre del cliente no puede estar vacío.');
    }

    const existing = await this.customerRepo.findById(businessId, id);
    if (!existing) {
      throw new Error(`Cliente ${id} no encontrado.`);
    }

    const duplicateWarnings = await this.customerRepo.checkDuplicates(
      businessId,
      {
        documentNumber: dto.documentNumber !== undefined ? dto.documentNumber : existing.documentNumber,
        phone: dto.phone !== undefined ? dto.phone : existing.phone,
        email: dto.email !== undefined ? dto.email : existing.email,
      },
      id
    );

    const customer = await this.customerRepo.update(businessId, id, {
      name: dto.name !== undefined ? dto.name.trim() : existing.name,
      lastName: dto.lastName !== undefined ? (dto.lastName?.trim() || null) : existing.lastName,
      documentType: dto.documentType !== undefined ? (dto.documentType?.trim() || null) : existing.documentType,
      documentNumber: dto.documentNumber !== undefined ? (dto.documentNumber?.trim() || null) : existing.documentNumber,
      phone: dto.phone !== undefined ? (dto.phone?.trim() || null) : existing.phone,
      email: dto.email !== undefined ? (dto.email?.trim() || null) : existing.email,
      address: dto.address !== undefined ? (dto.address?.trim() || null) : existing.address,
      notes: dto.notes !== undefined ? (dto.notes?.trim() || null) : existing.notes,
      active: dto.active !== undefined ? dto.active : existing.active,
    });

    return {
      customer,
      duplicateWarnings,
    };
  }
}

export class DeactivateCustomer {
  constructor(private customerRepo: CustomerRepository) {}

  async execute(businessId: string, id: string): Promise<void> {
    const existing = await this.customerRepo.findById(businessId, id);
    if (!existing) {
      throw new Error(`Cliente ${id} no encontrado.`);
    }
    await this.customerRepo.deactivate(businessId, id);
  }
}

export class ActivateCustomer {
  constructor(private customerRepo: CustomerRepository) {}

  async execute(businessId: string, id: string): Promise<void> {
    const existing = await this.customerRepo.findById(businessId, id);
    if (!existing) {
      throw new Error(`Cliente ${id} no encontrado.`);
    }
    await this.customerRepo.activate(businessId, id);
  }
}
