import { Supplier, CreateSupplierDto, UpdateSupplierDto } from '../Supplier';

export interface SupplierRepository {
  findById(businessId: string, id: string): Promise<Supplier | null>;
  findByName(businessId: string, name: string): Promise<Supplier | null>;
  list(businessId: string, includeInactive?: boolean): Promise<Supplier[]>;
  create(businessId: string, dto: CreateSupplierDto): Promise<Supplier>;
  update(businessId: string, id: string, dto: UpdateSupplierDto): Promise<Supplier>;
  deactivate(businessId: string, id: string): Promise<void>;
  activate(businessId: string, id: string): Promise<void>;
}
