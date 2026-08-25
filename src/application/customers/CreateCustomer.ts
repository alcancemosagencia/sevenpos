import { Customer, CreateCustomerDto, DuplicateCustomerMatch } from '../../domain/customers/Customer';
import { CustomerRepository } from '../../domain/customers/repositories/CustomerRepository';

export interface CreateCustomerResult {
  customer: Customer;
  duplicateWarnings: DuplicateCustomerMatch[];
}

export class CreateCustomer {
  constructor(private customerRepo: CustomerRepository) {}

  async execute(
    businessId: string,
    dto: CreateCustomerDto,
    allowDuplicates: boolean = false
  ): Promise<CreateCustomerResult> {
    if (!dto.name || !dto.name.trim()) {
      throw new Error('El nombre del cliente es obligatorio.');
    }

    const duplicateWarnings = await this.customerRepo.checkDuplicates(businessId, {
      documentNumber: dto.documentNumber,
      phone: dto.phone,
      email: dto.email,
    });

    if (duplicateWarnings.length > 0 && !allowDuplicates) {
      // In UI, return warnings so user can confirm or cancel.
      // If allowDuplicates is true, proceeding to create.
    }

    const customer = await this.customerRepo.create(businessId, {
      name: dto.name.trim(),
      lastName: dto.lastName?.trim() || null,
      documentType: dto.documentType?.trim() || null,
      documentNumber: dto.documentNumber?.trim() || null,
      phone: dto.phone?.trim() || null,
      email: dto.email?.trim() || null,
      address: dto.address?.trim() || null,
      notes: dto.notes?.trim() || null,
    });

    return {
      customer,
      duplicateWarnings,
    };
  }
}
