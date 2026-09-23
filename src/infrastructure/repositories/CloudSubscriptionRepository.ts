import { ISubscriptionRepository } from '../../domain/subscription/SubscriptionRepository';
import { Subscription } from '../../domain/subscription/Subscription';
import { PlanCode } from '../../domain/subscription/Plan';
import { getSupabaseClient } from '../cloud/supabaseClient';
import { DeviceEnrollmentStorage } from '../auth/DeviceEnrollmentStorage';
import { CloudBusinessLinkStorage } from '../auth/CloudBusinessLinkStorage';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * CloudSubscriptionRepository — reads subscription state from Supabase.
 * Priority: verified cloud state. Unavailable cloud state is not confirmed FREE.
 * Never calls Mercado Pago directly.
 */
export class CloudSubscriptionRepository implements ISubscriptionRepository {
  async getSubscription(businessId: string): Promise<Subscription> {
    try {
      const supabase = getSupabaseClient();
      let targetBusinessId = businessId;
      const enrollment = DeviceEnrollmentStorage.getEnrollment();
      const link = CloudBusinessLinkStorage.getLink();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      // A local business ID may itself be a UUID. Match the device's local-to-cloud
      // mapping before assuming any UUID is the cloud subscription key.
      const enrollmentMatches = enrollment && (!authUser || enrollment.userId === authUser.id) &&
        (businessId === enrollment.localBusinessId || businessId === enrollment.cloudBusinessId || businessId === 'primary-business');
      const linkMatches = link && (!authUser || link.cloudUserId === authUser.id) &&
        (businessId === link.localBusinessId || businessId === link.cloudBusinessId || businessId === 'primary-business');
      if (enrollmentMatches && UUID_REGEX.test(enrollment.cloudBusinessId)) {
        targetBusinessId = enrollment.cloudBusinessId;
      } else if (linkMatches && UUID_REGEX.test(link.cloudBusinessId)) {
        targetBusinessId = link.cloudBusinessId;
      }

      // If businessId is not a valid UUID, attempt resolution from storage or active membership
      if (!targetBusinessId || !UUID_REGEX.test(targetBusinessId)) {
        if (businessId === 'primary-business' && !enrollmentMatches && !linkMatches) {
          // Check active user session memberships via Supabase
          if (authUser) {
            const { data: membership } = await supabase
              .from('business_memberships')
              .select('business_id')
              .eq('user_id', authUser.id)
              .eq('status', 'ACTIVE')
              .order('created_at', { ascending: true })
              .limit(1)
              .maybeSingle();

            if (membership?.business_id && UUID_REGEX.test(membership.business_id)) {
              targetBusinessId = membership.business_id;
            }
          }
        }
      }

      // If we still don't have a valid UUID, return an unresolved state.
      if (!targetBusinessId || !UUID_REGEX.test(targetBusinessId)) {
        const hasEnrollmentOrLink = Boolean(
          DeviceEnrollmentStorage.getEnrollment()?.cloudBusinessId ||
          CloudBusinessLinkStorage.getLink()?.cloudBusinessId
        );
        return this.freeFallback(
          businessId,
          'LOCAL_FALLBACK',
          hasEnrollmentOrLink ? 'INVALID_UUID' : 'NO_CLOUD_LINK',
          hasEnrollmentOrLink ? 'No se pudo resolver un UUID cloud válido.' : 'Dispositivo sin enlace a negocio cloud.'
        );
      }

      const { data, error } = await supabase
        .from('business_subscriptions')
        .select('plan_code, status, billing_source, cancel_at_period_end, current_period_end, updated_at')
        .eq('business_id', targetBusinessId)
        .maybeSingle();

      if (error) {
        const isRls = error.code === '42501' || error.message?.toLowerCase().includes('permission') || error.message?.toLowerCase().includes('policy');
        return this.freeFallback(
          businessId,
          'CLOUD',
          isRls ? 'RLS_DENIED' : 'LOAD_ERROR',
          error.message
        );
      }

      if (!data) {
        // RLS also returns zero rows for an unauthenticated request. Never call that confirmed FREE.
        if (!authUser) {
          return this.freeFallback(businessId, 'CLOUD', 'LOAD_ERROR', 'Cloud session unavailable.');
        }
        // No row can also mean RLS silently filtered it. Confirm an active
        // membership before treating absence of a subscription as FREE.
        const { data: membership, error: membershipError } = await supabase
          .from('business_memberships')
          .select('business_id')
          .eq('business_id', targetBusinessId)
          .eq('user_id', authUser.id)
          .eq('status', 'ACTIVE')
          .maybeSingle();
        if (membershipError || !membership) {
          return this.freeFallback(businessId, 'CLOUD', membershipError ? 'RLS_DENIED' : 'LOAD_ERROR', membershipError?.message);
        }
        return this.freeFallback(businessId, 'CLOUD', 'CONFIRMED_FREE');
      }

      // Map cloud status to Subscription type
      const status = this.mapStatus(data.status);
      if (!status) return this.freeFallback(businessId, 'CLOUD', 'LOAD_ERROR', 'Unknown subscription status.');
      if (data.plan_code !== 'PRO' && data.plan_code !== 'FREE') {
        return this.freeFallback(businessId, 'CLOUD', 'LOAD_ERROR', 'Unknown subscription plan.');
      }
      const plan: PlanCode = this.effectivePlan(data.plan_code, status);

      return {
        businessId,
        plan,
        status,
        source: 'CLOUD',
        resolutionReason: plan === 'PRO' ? 'CONFIRMED_PRO' : 'CONFIRMED_FREE',
        updatedAt: data.updated_at ?? new Date().toISOString(),
        cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
        periodEnd: data.current_period_end ?? null,
        billingSource: data.billing_source ?? null,
      };
    } catch (err) {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn('[CloudSubscriptionRepository] Cloud fetch failed, falling back safely:', err);
      return this.freeFallback(
        businessId,
        'LOCAL_FALLBACK',
        isOffline ? 'OFFLINE_UNAVAILABLE' : 'LOAD_ERROR',
        errorMsg
      );
    }
  }

  async setPlan(businessId: string, _plan: PlanCode): Promise<Subscription> {
    // setPlan from client is intentionally a no-op for the cloud repository.
    // All plan mutations happen server-side via Edge Functions.
    // Return current state.
    return this.getSubscription(businessId);
  }

  private mapStatus(cloudStatus: string): Subscription['status'] | null {
    const valid: readonly string[] = ['PENDING', 'ACTIVE', 'PAST_DUE', 'EXPIRED'];
    if (valid.indexOf(cloudStatus) !== -1) return cloudStatus as Subscription['status'];
    return null;
  }

  private effectivePlan(planCode: string, status: Subscription['status']): PlanCode {
    if (planCode !== 'PRO') return 'FREE';
    if (status === 'ACTIVE' || status === 'PAST_DUE') return 'PRO';
    return 'FREE';
  }

  private freeFallback(
    businessId: string,
    source: Subscription['source'],
    resolutionReason: Subscription['resolutionReason'] = 'CONFIRMED_FREE',
    errorMessage?: string
  ): Subscription {
    return {
      businessId,
      plan: 'FREE',
      status: 'ACTIVE',
      source,
      resolutionReason,
      errorMessage,
      updatedAt: new Date().toISOString(),
    };
  }
}
