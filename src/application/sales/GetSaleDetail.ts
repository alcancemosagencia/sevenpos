import { SaleWithDetails } from '../../domain/sales/Sale';
import { SaleRepository } from '../../domain/sales/repositories/SaleRepository';
import { BusinessRepository } from '../../domain/business/BusinessRepository';
import { ReceiptDTO, buildReceiptDTO } from '../../domain/sales/Receipt';

export class GetSaleDetail {
  constructor(
    private saleRepo: SaleRepository,
    private businessRepo: BusinessRepository
  ) {}

  async execute(saleId: string): Promise<{ saleWithDetails: SaleWithDetails | null; receipt: ReceiptDTO | null }> {
    const saleWithDetails = await this.saleRepo.getSaleById(saleId);
    if (!saleWithDetails) {
      return { saleWithDetails: null, receipt: null };
    }

    const business = await this.businessRepo.getPrimaryBusiness();
    const receipt = buildReceiptDTO(
      saleWithDetails.sale,
      saleWithDetails.items,
      saleWithDetails.payments,
      {
        name: business?.name || 'SevenPOS',
        fiscalId: business?.fiscalId,
        address: business?.address,
        phone: business?.phone,
      }
    );

    return { saleWithDetails, receipt };
  }
}
