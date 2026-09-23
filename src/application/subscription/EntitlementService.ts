import { IEntitlementService, EntitlementLimitInfo, DateRangeConstraintResult } from './IEntitlementService';
import {
  EntitlementKey,
  LimitKey,
  PlanDefinition,
  PLAN_DEFINITIONS,
  PRO_INTERNAL_SAFETY_CEILINGS,
  ROADMAP_FEATURES,
  RoadmapFeatureKey,
} from '../../domain/subscription/Plan';
import { EntitlementDecision } from '../../domain/subscription/Entitlement';
import { ISubscriptionRepository } from '../../domain/subscription/SubscriptionRepository';
import { IUsageService } from './IUsageService';
import { DateRange } from '../analytics/types';
import { EntitlementUnavailableError, isConfirmedEntitlement } from '../../domain/subscription/SubscriptionResolution';

export class EntitlementService implements IEntitlementService {
  constructor(
    private subscriptionRepo: ISubscriptionRepository,
    private usageService?: IUsageService
  ) {}

  async getPlan(businessId: string): Promise<PlanDefinition> {
    const sub = await this.subscriptionRepo.getSubscription(businessId);
    if (!isConfirmedEntitlement(sub)) throw new EntitlementUnavailableError(sub.resolutionReason);
    return PLAN_DEFINITIONS[sub.plan];
  }

  async can(businessId: string, key: EntitlementKey | RoadmapFeatureKey | string): Promise<EntitlementDecision> {
    const sub = await this.subscriptionRepo.getSubscription(businessId);
    if (!isConfirmedEntitlement(sub)) {
      return { allowed: false, reason: 'ENTITLEMENT_UNAVAILABLE', message: 'No pudimos verificar tu plan.' };
    }
    const planDef = PLAN_DEFINITIONS[sub.plan];

    // Exports are always allowed on both plans
    if (key === 'export.xlsx' || key === 'export.csv') {
      return { allowed: true, entitlementKey: key as EntitlementKey };
    }

    // Roadmap features are never active
    const isRoadmap = ROADMAP_FEATURES.some((rf) => rf.key === key);
    if (isRoadmap) {
      return {
        allowed: false,
        reason: 'FEATURE_IN_ROADMAP',
        entitlementKey: key as EntitlementKey,
        message: 'Esta funcionalidad está en desarrollo para SevenPOS Pro.',
      };
    }

    const isAllowed = planDef.entitlements.includes(key as EntitlementKey);
    if (isAllowed) {
      return { allowed: true, entitlementKey: key as EntitlementKey };
    }

    return {
      allowed: false,
      reason: 'PLAN_REQUIRED',
      entitlementKey: key as EntitlementKey,
      message: `Esta funcionalidad requiere el Plan Pro (${planDef.name}).`,
    };
  }

  async getLimit(businessId: string, key: LimitKey | string): Promise<EntitlementLimitInfo> {
    const sub = await this.subscriptionRepo.getSubscription(businessId);
    if (!isConfirmedEntitlement(sub)) throw new EntitlementUnavailableError(sub.resolutionReason);
    const planDef = PLAN_DEFINITIONS[sub.plan];

    if (key === 'pos.monthly_sales' || key === 'sales.monthly_completed') {
      return { value: 'UNLIMITED', enforced: false };
    }

    if (key === 'devices.registered' || key === 'devices') {
      return { value: 1, enforced: false };
    }

    switch (key) {
      case 'catalog.active_products':
        return sub.plan === 'PRO'
          ? { value: 'UNLIMITED', enforced: false }
          : { value: planDef.limits.activeProducts, enforced: true };
      case 'customers.active':
        return sub.plan === 'PRO'
          ? { value: 'UNLIMITED', enforced: false }
          : { value: planDef.limits.activeCustomers, enforced: true };
      case 'users.active_operators':
        return { value: planDef.limits.activeUsers, enforced: true };
      default:
        return { value: 'UNLIMITED', enforced: false };
    }
  }

  async checkLimit(businessId: string, key: LimitKey | string): Promise<EntitlementDecision & { status?: string }> {
    const sub = await this.subscriptionRepo.getSubscription(businessId);
    if (!isConfirmedEntitlement(sub)) {
      return {
        allowed: false,
        reason: 'ENTITLEMENT_UNAVAILABLE',
        limitKey: key as LimitKey,
        message: 'No pudimos verificar tu plan. Comprueba tu conexión e inténtalo nuevamente.',
      };
    }
    const planDef = PLAN_DEFINITIONS[sub.plan];

    if (key === 'pos.monthly_sales' || key === 'sales.monthly_completed') {
      return {
        allowed: true,
        status: 'UNLIMITED',
        maxLimit: 'UNLIMITED',
      };
    }

    if (key === 'devices.registered' || key === 'devices') {
      return {
        allowed: true,
        status: 'DISPLAY_ONLY',
        maxLimit: 1,
      };
    }

    const currentUsage = this.usageService
      ? await this.usageService.getMetricUsage(businessId, key as LimitKey)
      : 0;

    // If Pro: check against internal safety ceiling only
    if (sub.plan === 'PRO') {
      const safetyCeiling = PRO_INTERNAL_SAFETY_CEILINGS[key as LimitKey];
      if (safetyCeiling !== undefined && currentUsage >= safetyCeiling) {
        return {
          allowed: false,
          reason: 'SAFETY_CEILING_REACHED',
          limitKey: key as LimitKey,
          currentUsage,
          maxLimit: safetyCeiling,
          message:
            'Has alcanzado la capacidad operativa recomendada para esta cuenta. Contacta a soporte para ampliar tus recursos.',
        };
      }
      return {
        allowed: true,
        limitKey: key as LimitKey,
        currentUsage,
        maxLimit: 'UNLIMITED',
      };
    }

    // If Free: check against standard plan limits
    let maxLimit = 0;
    let label = '';
    switch (key) {
      case 'catalog.active_products':
        maxLimit = planDef.limits.activeProducts;
        label = 'productos activos';
        break;
      case 'customers.active':
        maxLimit = planDef.limits.activeCustomers;
        label = 'clientes activos';
        break;
      case 'users.active_operators':
        maxLimit = planDef.limits.activeUsers;
        label = 'usuarios en tu equipo';
        break;
    }

    if (currentUsage >= maxLimit) {
      return {
        allowed: false,
        reason: 'LIMIT_REACHED',
        limitKey: key as LimitKey,
        currentUsage,
        maxLimit,
        message: `Has alcanzado el límite de ${maxLimit} ${label} incluido en SevenPOS Free.`,
      };
    }

    return {
      allowed: true,
      limitKey: key as LimitKey,
      currentUsage,
      maxLimit,
    };
  }

  async getDateRangeConstraint(
    businessId: string,
    scope: 'reports.history_window' | 'audit.history_window',
    requestedRange: DateRange
  ): Promise<DateRangeConstraintResult> {
    const sub = await this.subscriptionRepo.getSubscription(businessId);
    if (!isConfirmedEntitlement(sub)) throw new EntitlementUnavailableError(sub.resolutionReason);
    const planDef = PLAN_DEFINITIONS[sub.plan];

    const maxDays =
      scope === 'reports.history_window'
        ? planDef.limits.reportsHistoryDays
        : planDef.limits.auditHistoryDays;

    if (maxDays === 'FULL' || typeof maxDays !== 'number') {
      return {
        requestedRange,
        effectiveRange: requestedRange,
        wasConstrained: false,
      };
    }

    const start = new Date(requestedRange.startDate);
    const end = new Date(requestedRange.endDate);
    const diffDays = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));

    if (diffDays <= maxDays) {
      return {
        requestedRange,
        effectiveRange: requestedRange,
        wasConstrained: false,
      };
    }

    // Truncate to maxDays
    const effectiveStartDate = new Date(end.getTime() - maxDays * 86400000)
      .toISOString()
      .split('T')[0];

    return {
      requestedRange,
      effectiveRange: {
        ...requestedRange,
        startDate: effectiveStartDate,
        endDate: requestedRange.endDate,
      },
      wasConstrained: true,
      constraintReason: `FREE_PLAN_${maxDays}_DAYS`,
    };
  }
}
