import { Customer, CreateCustomerDto, UpdateCustomerDto, DuplicateCustomerMatch } from '../Customer';

export interface ListCustomersOptions {
  includeInactive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CustomerRepository {
  findById(businessId: string, id: string): Promise<Customer | null>;
  findByDocument(businessId: string, documentNumber: string): Promise<Customer | null>;
  list(businessId: string, options?: ListCustomersOptions): Promise<Customer[]>;
  search(businessId: string, query: string, limit?: number): Promise<Customer[]>;
  checkDuplicates(
    businessId: string,
    dto: { documentNumber?: string | null; phone?: string | null; email?: string | null },
    excludeCustomerId?: string
  ): Promise<DuplicateCustomerMatch[]>;
  create(businessId: string, dto: CreateCustomerDto): Promise<Customer>;
  update(businessId: string, id: string, dto: UpdateCustomerDto): Promise<Customer>;
  deactivate(businessId: string, id: string): Promise<void>;
  activate(businessId: string, id: string): Promise<void>;
}
