import { IUsageService } from './IUsageService';
import { LimitKey, MetricKey, PLAN_DEFINITIONS } from '../../domain/subscription/Plan';
import { MetricUsage, UsageOverview, UsageState } from '../../domain/subscription/Entitlement';
import { ISubscriptionRepository } from '../../domain/subscription/SubscriptionRepository';
import { repositoryFactory } from '../../infrastructure/repositories/RepositoryFactory';
import { getLocalMonthInterval } from './TimezoneUtils';
import { EntitlementUnavailableError, isConfirmedEntitlement } from '../../domain/subscription/SubscriptionResolution';

import { ProductRepository } from '../../domain/catalog/ProductRepository';
import { CustomerQueryRepository } from '../../domain/customers/repositories/CustomerQueryRepository';
import { CustomerRepository } from '../../domain/customers/repositories/CustomerRepository';
import { UserRepository } from '../../domain/user/UserRepository';
import { SaleRepository } from '../../domain/sales/repositories/SaleRepository';
import { BusinessRepository } from '../../domain/business/BusinessRepository';

export interface UsageServiceRepositories {
  productRepo?: ProductRepository;
  customerQueryRepo?: CustomerQueryRepository;
  customerRepo?: CustomerRepository;
  userRepo?: UserRepository;
  saleRepo?: SaleRepository;
  businessRepo?: BusinessRepository;
}

export class UsageService implements IUsageService {
  constructor(
    private subscriptionRepo: ISubscriptionRepository,
    private customRepos?: UsageServiceRepositories
  ) {}

  async getActiveProductsCount(businessId: string): Promise<number> {
    return this.getMetricUsage(businessId, 'catalog.active_products');
  }

  async getActiveCustomersCount(businessId: string): Promise<number> {
    return this.getMetricUsage(businessId, 'customers.active');
  }

  async getActiveUsersCount(businessId: string): Promise<number> {
    return this.getMetricUsage(businessId, 'users.active_operators');
  }

  async getMonthlySalesCount(businessId: string, countryCode?: string): Promise<number> {
    const saleRepo = this.customRepos?.saleRepo || repositoryFactory.getSaleRepository();
    const interval = getLocalMonthInterval(countryCode);
    const summary = await saleRepo.getSalesSummary(
      businessId,
      interval.startOfLocalMonth,
      interval.startOfNextLocalMonth
    );
    return summary.ticketCount;
  }

  async getMetricUsage(businessId: string, metric: LimitKey | MetricKey): Promise<number> {
    switch (metric) {
      case 'catalog.active_products': {
        const productRepo = this.customRepos?.productRepo || repositoryFactory.getProductRepository();
        const kpis = await productRepo.getKpiSummary(businessId);
        return kpis.activeProducts;
      }
      case 'customers.active': {
        if (this.customRepos?.customerRepo) {
          const list = await this.customRepos.customerRepo.list(businessId, { includeInactive: false });
          return list.length;
        }
        const customerQueryRepo =
          this.customRepos?.customerQueryRepo || repositoryFactory.getCustomerQueryRepository();
        const kpis = await customerQueryRepo.getKPIMetrics(businessId);
        return kpis.activeCustomersCount;
      }
      case 'users.active_operators': {
        const userRepo = this.customRepos?.userRepo || repositoryFactory.getUserRepository();
        const activeUsers = await userRepo.getActiveUsersByBusinessId(businessId);
        return activeUsers.length;
      }
      case 'sales.monthly_completed': {
        const saleRepo = this.customRepos?.saleRepo || repositoryFactory.getSaleRepository();
        const businessRepo = this.customRepos?.businessRepo || repositoryFactory.getBusinessRepository();
        let countryCode: string | undefined;
        try {
          const business = await businessRepo.getPrimaryBusiness();
          countryCode = business?.countryCode;
        } catch {
          // fallback to default country
        }
        const interval = getLocalMonthInterval(countryCode);
        const summary = await saleRepo.getSalesSummary(
          businessId,
          interval.startOfLocalMonth,
          interval.startOfNextLocalMonth
        );
        return summary.ticketCount;
      }
      default:
        return 0;
    }
  }

  async getUsageOverview(businessId: string): Promise<UsageOverview> {
    const sub = await this.subscriptionRepo.getSubscription(businessId);
    if (!isConfirmedEntitlement(sub)) throw new EntitlementUnavailableError(sub.resolutionReason);
    const planCode = sub.plan;
    const planDef = PLAN_DEFINITIONS[planCode];

    const [activeProducts, activeCustomers, activeUsers, monthlySales] = await Promise.all([
      this.getMetricUsage(businessId, 'catalog.active_products'),
      this.getMetricUsage(businessId, 'customers.active'),
      this.getMetricUsage(businessId, 'users.active_operators'),
      this.getMetricUsage(businessId, 'sales.monthly_completed'),
    ]);

    const productsMetric = this.buildMetricUsage(
      'catalog.active_products',
      'Productos activos',
      activeProducts,
      planCode === 'PRO' ? 'UNLIMITED' : planDef.limits.activeProducts,
      true
    );

    const customersMetric = this.buildMetricUsage(
      'customers.active',
      'Clientes activos',
      activeCustomers,
      planCode === 'PRO' ? 'UNLIMITED' : planDef.limits.activeCustomers,
      true
    );

    const usersMetric = this.buildMetricUsage(
      'users.active_operators',
      'Usuarios del equipo',
      activeUsers,
      planDef.limits.activeUsers,
      true
    );

    // Sales milestone (Commercial only, zero quota/limit)
    let milestoneLevel: 'NORMAL' | 'GROWTH_MILESTONE' | 'SOFT_RECOMMENDATION' | 'STRONG_RECOMMENDATION' = 'NORMAL';
    let milestoneMessage: string | undefined;

    if (monthlySales >= 300) {
      milestoneLevel = 'STRONG_RECOMMENDATION';
      milestoneMessage = '¡Excelente volumen! Tu negocio está creciendo a paso firme.';
    } else if (monthlySales >= 270) {
      milestoneLevel = 'SOFT_RECOMMENDATION';
      milestoneMessage = 'Tu ritmo comercial se está acelerando.';
    } else if (monthlySales >= 240) {
      milestoneLevel = 'GROWTH_MILESTONE';
      milestoneMessage = 'Has alcanzado un hito de ventas este mes.';
    }

    const historyDays = planDef.limits.reportsHistoryDays;
    const auditDays = planDef.limits.auditHistoryDays;

    return {
      plan: planCode,
      planName: planDef.name,
      products: productsMetric,
      customers: customersMetric,
      users: usersMetric,
      salesMilestone: {
        currentMonthlySales: monthlySales,
        milestoneLevel,
        message: milestoneMessage,
      },
      historyWindow: {
        reportsDays: historyDays,
        auditDays: auditDays,
        displayLabel: planCode === 'PRO' ? 'Histórico completo' : `${historyDays} días incluidos`,
      },
    };
  }

  private buildMetricUsage(
    key: LimitKey,
    label: string,
    current: number,
    limit: number | 'UNLIMITED',
    isEnforced: boolean
  ): MetricUsage {
    if (limit === 'UNLIMITED' || limit === Infinity) {
      return {
        key,
        label,
        current,
        limit: 'UNLIMITED',
        isEnforced,
        state: 'NORMAL',
        displayValue: `${current.toLocaleString()} / Ilimitados`,
      };
    }

    const percentage = Math.min(100, Math.round((current / limit) * 100));
    let state: UsageState = 'NORMAL';

    if (current >= limit) {
      state = 'LIMIT_REACHED';
    } else if (percentage >= 90) {
      state = 'WARNING';
    } else if (percentage >= 70) {
      state = 'INFORMATIVE';
    }

    return {
      key,
      label,
      current,
      limit,
      isEnforced,
      percentage,
      state,
      displayValue: `${current} / ${limit}`,
    };
  }
}
