import { LimitKey, MetricKey } from '../../domain/subscription/Plan';
import { UsageOverview } from '../../domain/subscription/Entitlement';

export interface IUsageService {
  /**
   * Retrieves the raw count for a given limit or metric key for a business.
   * - catalog.active_products: products where business_id = ? AND active = 1
   * - customers.active: customers where business_id = ? AND active = 1
   * - users.active_operators: users where business_id = ? AND active = 1
   * - sales.monthly_completed: sales where business_id = ? AND status = 'COMPLETED' AND local month interval
   */
  getMetricUsage(businessId: string, metric: LimitKey | MetricKey): Promise<number>;

  /**
   * Aggregates usage metrics, states, and sales milestones for the subscription UI and meters.
   */
  getUsageOverview(businessId: string): Promise<UsageOverview>;
}
