import { Sale } from '../../domain/sales/Sale';
import { SaleRepository, ListSalesOptions } from '../../domain/sales/repositories/SaleRepository';

export class ListSales {
  constructor(private saleRepo: SaleRepository) {}

  async execute(businessId: string, options?: ListSalesOptions): Promise<{ sales: Sale[]; totalCount: number }> {
    const sales = await this.saleRepo.listSales(businessId, options);
    const totalCount = await this.saleRepo.countSales(businessId);
    return { sales, totalCount };
  }
}
