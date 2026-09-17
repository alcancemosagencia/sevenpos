import { getSupabaseClient } from '../cloud/supabaseClient';

/**
 * BillingApiClient — typed calls to Supabase Edge Functions.
 * Browser never sends authoritative amounts.
 * All pricing calculated server-side.
 */

export type BillingInterval = 'MONTHLY' | 'ANNUAL';

export interface CreateBillingIntentRequest {
  planId: 'pro_monthly' | 'pro_annual';
  billingInterval: BillingInterval;
  couponCode?: string;
}

export interface BillingIntentResponse {
  intentId: string;
  initPoint: string;          // MP checkout URL
  finalNetAmount: number;
  taxAmount: number;
  finalGrossAmount: number;
  appliedPromotionCode: string | null;
  rejectedPromotion?: { code: string; reason: string } | null;
}

export interface CouponStatus {
  code: string;
  valid: boolean;
  reason?: 'PUBLIC_PROMOTION_ALREADY_APPLIED' | 'INFERIOR_PRICE' | 'INVALID' | 'EXPIRED' | 'INACTIVE' | 'INTERVAL_NOT_SUPPORTED' | 'ALREADY_USED' | string;
  message?: string;
}

export interface ValidatePromotionRequest {
  planId?: 'pro_monthly' | 'pro_annual';
  billingInterval: BillingInterval;
  couponCode?: string;
}

export type PricePreviewRequest = ValidatePromotionRequest;

export interface ValidatePromotionResponse {
  valid: boolean;
  planId?: 'pro_monthly' | 'pro_annual';
  billingInterval?: BillingInterval;
  baseNetAmount?: number;
  discountNetAmount?: number;
  finalNetAmount?: number;
  taxAmount?: number;
  finalGrossAmount?: number;
  appliedPromotionCode?: string | null;
  appliedPromotionType?: string | null;
  durationMonths?: number | null;
  durationType?: string | null;
  renewalNetAmount?: number;
  renewalGrossAmount?: number;
  isFounders?: boolean;
  promotionCode?: string | null;
  reason?: string;
  couponStatus?: CouponStatus | null;
}

export interface PricePreviewResponse {
  valid: boolean;
  planId: 'pro_monthly' | 'pro_annual';
  billingInterval: BillingInterval;
  baseNetAmount: number;
  discountNetAmount: number;
  finalNetAmount: number;
  taxAmount: number;
  finalGrossAmount: number;
  appliedPromotionCode: string | null;
  appliedPromotionType?: string | null;
  durationMonths: number | null;
  durationType?: string | null;
  renewalNetAmount: number;
  renewalGrossAmount: number;
  isFounders: boolean;
  promotionCode?: string | null;
  reason?: string;
  couponStatus?: CouponStatus | null;
}

export interface SubscriptionStatusResponse {
  planCode: 'FREE' | 'PRO';
  status: 'PENDING' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED';
  billingInterval?: BillingInterval | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  updatedAt: string;
  promotionCode?: string | null;
  renewalGrossAmount?: number | null;
}

export interface CancelSubscriptionResponse {
  success: boolean;
  cancelAtPeriodEnd: boolean;
  cancelRequestedAt: string;
  providerCancelDueAt: string;
}

export class BillingApiClient {
  private async invokeFunction<T>(name: string, body: object): Promise<T> {
    const supabase = getSupabaseClient();
    
    // Attach real user session JWT when available
    const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    const sessionToken = sessionData?.session?.access_token;
    
    const headers: Record<string, string> = {};
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    const invokePromise = supabase.functions.invoke<T>(name, {
      body,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });

    // 18-second client-side timeout fallback
    const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) => {
      setTimeout(() => reject(new Error('PROVIDER_TIMEOUT: Request timed out')), 18000);
    });

    const { data, error } = await Promise.race([invokePromise, timeoutPromise]).catch((err) => {
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    });

    if (error) {
      let detail = error.message;
      try {
        if ('context' in error && (error as { context?: Response }).context && typeof ((error as { context?: Response }).context as Response).json === 'function') {
          const bodyJson = await ((error as { context?: Response }).context as Response).json();
          if (bodyJson?.provider_safe_message) detail = `${bodyJson.error || 'PROVIDER_ERROR'}: ${bodyJson.provider_safe_message}`;
          else if (bodyJson?.error) detail = bodyJson.error;
          else if (bodyJson?.reason) detail = bodyJson.reason;
          else if (bodyJson?.message) detail = bodyJson.message;
        }
      } catch {
        // Fallback to error.message
      }
      throw new Error(`BillingApiClient: ${name} failed — ${detail}`);
    }
    return data as T;
  }

  /**
   * Create a billing intent server-side.
   * Browser sends ONLY plan selection + optional coupon code.
   * Server calculates all amounts authoritatively.
   */
  async createBillingIntent(req: CreateBillingIntentRequest): Promise<BillingIntentResponse> {
    return this.invokeFunction<BillingIntentResponse>('billing-create-intent', req);
  }

  /**
   * Validate a coupon code or fetch canonical price preview server-side before checkout.
   * Auto-resolves public campaigns and compares with optional private coupons.
   */
  async validatePromotion(req: ValidatePromotionRequest): Promise<ValidatePromotionResponse> {
    return this.invokeFunction<ValidatePromotionResponse>('billing-validate-promotion', req);
  }

  /**
   * Alias for validatePromotion — fetches canonical server price preview.
   */
  async getPricePreview(req: PricePreviewRequest): Promise<PricePreviewResponse> {
    return this.invokeFunction<PricePreviewResponse>('billing-validate-promotion', req);
  }

  /**
   * Get current subscription status for the authenticated business.
   * Never trusts query params or local state.
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
    return this.invokeFunction<SubscriptionStatusResponse>('billing-subscription-status', {});
  }

  /**
   * Request cancellation at period end.
   * Does NOT immediately cancel the Mercado Pago preapproval.
   * PRO remains active until current_period_end.
   */
  async cancelSubscription(): Promise<CancelSubscriptionResponse> {
    return this.invokeFunction<CancelSubscriptionResponse>('billing-cancel-subscription', {});
  }
}

export const billingApiClient = new BillingApiClient();
