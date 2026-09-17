import { ISubscriptionRepository } from '../../domain/subscription/SubscriptionRepository';
import { Subscription } from '../../domain/subscription/Subscription';
import { PlanCode } from '../../domain/subscription/Plan';
import { getSupabaseClient } from '../cloud/supabaseClient';

/**
 * CloudSubscriptionRepository — reads subscription state from Supabase.
 * Priority: verified cloud state → FREE fallback.
 * Never calls Mercado Pago directly.
 */
export class CloudSubscriptionRepository implements ISubscriptionRepository {
  async getSubscription(businessId: string): Promise<Subscription> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('business_subscriptions')
        .select('plan_code, status, cancel_at_period_end, current_period_end, updated_at')
        .eq('business_id', businessId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // No subscription row → safely default to FREE
        return this.freeFallback(businessId, 'CLOUD');
      }

      // Map cloud status to Subscription type
      const status = this.mapStatus(data.status);
      const plan: PlanCode = this.effectivePlan(data.plan_code, status);

      return {
        businessId,
        plan,
        status,
        source: 'CLOUD',
        updatedAt: data.updated_at ?? new Date().toISOString(),
        cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
        periodEnd: data.current_period_end ?? null,
      };
    } catch (err) {
      console.warn('[CloudSubscriptionRepository] Cloud fetch failed, falling back to FREE:', err);
      return this.freeFallback(businessId, 'LOCAL_FALLBACK');
    }
  }

  async setPlan(businessId: string, _plan: PlanCode): Promise<Subscription> {
    // setPlan from client is intentionally a no-op for the cloud repository.
    // All plan mutations happen server-side via Edge Functions.
    // Return current state.
    return this.getSubscription(businessId);
  }

  private mapStatus(cloudStatus: string): Subscription['status'] {
    const valid: readonly string[] = ['PENDING', 'ACTIVE', 'PAST_DUE', 'EXPIRED'];
    if (valid.indexOf(cloudStatus) !== -1) return cloudStatus as Subscription['status'];
    return 'ACTIVE'; // unknown status → treat as active (defensive)
  }

  private effectivePlan(planCode: string, status: Subscription['status']): PlanCode {
    if (planCode !== 'PRO') return 'FREE';
    if (status === 'ACTIVE' || status === 'PAST_DUE') return 'PRO';
    return 'FREE';
  }

  private freeFallback(businessId: string, source: Subscription['source']): Subscription {
    return {
      businessId,
      plan: 'FREE',
      status: 'ACTIVE',
      source,
      updatedAt: new Date().toISOString(),
    };
  }
}
