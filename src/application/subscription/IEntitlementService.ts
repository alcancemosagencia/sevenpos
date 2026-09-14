import { EntitlementKey, LimitKey, PlanDefinition, RoadmapFeatureKey } from '../../domain/subscription/Plan';
import { EntitlementDecision, LimitValue } from '../../domain/subscription/Entitlement';
import { DateRange } from '../analytics/types';

export interface EntitlementLimitInfo {
  value: LimitValue;
  enforced: boolean;
}

export interface DateRangeConstraintResult {
  requestedRange: DateRange;
  effectiveRange: DateRange;
  wasConstrained: boolean;
  constraintReason?: string;
}

export interface IEntitlementService {
  /**
   * Returns the plan definition for the business.
   */
  getPlan(businessId: string): Promise<PlanDefinition>;

  /**
   * Checks whether the given entitlement feature is included in the business's active plan.
   */
  can(businessId: string, key: EntitlementKey | RoadmapFeatureKey | string): Promise<EntitlementDecision>;

  /**
   * Returns the configured limit value for a given limit key.
   */
  getLimit(businessId: string, key: LimitKey | string): Promise<EntitlementLimitInfo>;

  /**
   * Evaluates if creating or activating another item for the given limit key is permitted.
   */
  checkLimit(businessId: string, key: LimitKey | string): Promise<EntitlementDecision & { status?: string }>;

  /**
   * Evaluates and constrains date ranges according to plan history windows.
   */
  getDateRangeConstraint(
    businessId: string,
    scope: 'reports.history_window' | 'audit.history_window',
    requestedRange: DateRange
  ): Promise<DateRangeConstraintResult>;
}
