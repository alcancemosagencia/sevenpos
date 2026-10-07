import {platformRpcCompatibility, platformError, type GrantInput, type ListInput} from './PlatformRpcCompatibilityAdapter';
import { getSupabaseClient } from '../../infrastructure/cloud/supabaseClient';
import {
  PlatformAdmin,
  PlatformDashboardMetrics,
  PlatformBusinessListResponse,
  PlatformBusinessDetail,
} from '../types/PlatformTypes';

export class PlatformAdminService {
  /**
   * Validates if the current logged-in user is an active Platform Super Admin.
   */
  async getCurrentAdmin(): Promise<PlatformAdmin | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('platform_get_current_admin');

    if (error) {
      console.warn('[PlatformAdminService] platform_get_current_admin error:', error.message);
      return null;
    }

    if (!data || !data.is_admin || data.role !== 'SUPER_ADMIN' || ('is_active' in data && data.is_active !== true)) {
      return null;
    }

    platformRpcCompatibility.setIdentity(data.user_id);
    return {
      id: data.id,
      userId: data.user_id,
      email: data.email,
      role: data.role,
      createdAt: data.created_at,
      lastLoginAt: data.last_login_at,
    };
  }

  /**
   * Fetches real SaaS metrics, country distribution, growth trends and recent activity.
   */
  async getDashboardMetrics(): Promise<PlatformDashboardMetrics> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('platform_get_dashboard_metrics');

    if (error) {
      throw new Error(`Error al obtener métricas del dashboard: ${error.message}`);
    }

    return {
      totalBusinesses: data.total_businesses ?? 0,
      proActive: data.pro_active ?? 0,
      freeActive: data.free_active ?? 0,
      manualActive: data.manual_active ?? 0,
      mercadopagoActive: data.mercadopago_active ?? 0,
      promotionalActive: data.promotional_active ?? 0,
      internalActive: data.internal_active ?? 0,
      countryDistribution: data.country_distribution ?? [],
      growthTrend: data.growth_trend ?? [],
      recentActivity: (data.recent_activity ?? []).map((a: Record<string, unknown>) => ({
        id: String(a.id || ''),
        action: String(a.action || ''),
        reason: a.reason ? String(a.reason) : null,
        createdAt: String(a.created_at || ''),
        businessName: a.business_name ? String(a.business_name) : null,
        businessId: a.business_id ? String(a.business_id) : null,
        adminEmail: a.admin_email ? String(a.admin_email) : null,
      })),
    };
  }

  /**
   * Fetches server-paginated list of businesses with search and filters.
   */
  async listBusinesses(params: ListInput): Promise<PlatformBusinessListResponse> {
    const result = await platformRpcCompatibility.list(params);
    return {items:result.items as PlatformBusinessListResponse['items'],
      totalCount:result.totalCount,page:result.offset/result.limit+1,pageSize:result.limit,totalPages:Math.ceil(result.totalCount/result.limit)};
  }

  /**
   * Fetches complete detail for a specific business.
   */
  async getBusinessDetail(businessId: string): Promise<PlatformBusinessDetail> {
    const data = await platformRpcCompatibility.detail(businessId);
    return {
      devicesCount: data.devices_count,
      cloudMembershipCount: data.cloud_membership_count,
      subscriptionEvents: data.subscription_events,
      business: {
        id: data.business.id,
        name: data.business.name,
        countryCode: data.business.country_code,
        createdAt: data.business.created_at,
        updatedAt: data.business.updated_at,
      },
      owner: {
        userId: data.owner.user_id,
        email: data.owner.email,
        name: data.owner.name,
        createdAt: data.owner.created_at,
      },
      subscription: {
        id: data.subscription.id,
        planCode: data.subscription.plan_code,
        status: data.subscription.status,
        billingInterval: data.subscription.billing_interval,
        billingSource: data.subscription.billing_source,
        manualReason: data.subscription.manual_reason,
        manualNotes: data.subscription.manual_notes,
        activatedByEmail: data.subscription.activated_by_email,
        activatedByAdminId: data.subscription.activated_by_admin_id,
        manualActivatedAt: data.subscription.manual_activated_at,
        mpPreapprovalId: data.subscription.mp_preapproval_id,
        currentPeriodStart: data.subscription.current_period_start,
        currentPeriodEnd: data.subscription.current_period_end,
        cancelAtPeriodEnd: data.subscription.cancel_at_period_end,
        activeContractId: data.subscription.active_contract_id,
        updatedAt: data.subscription.updated_at,
      },
      activeContract: data.active_contract
        ? {
            id: data.active_contract.id,
            pricingVersion: data.active_contract.pricing_version,
            billingInterval: data.active_contract.billing_interval,
            finalGrossAmount: data.active_contract.final_gross_amount,
            currency: data.active_contract.currency,
            startsAt: data.active_contract.starts_at,
            endsAt: data.active_contract.ends_at,
            createdAt: data.active_contract.created_at,
            paymentMethod: data.active_contract.payment_method,
            externalReference: data.active_contract.external_reference,
          }
        : null,
      devices: (data.devices ?? []).map((d: Record<string, unknown>) => ({
        id: String(d.id),
        deviceName: String(d.device_name),
        platform: String(d.platform),
        deviceType: String(d.device_type),
        createdAt: String(d.created_at),
        lastSeenAt: String(d.last_seen_at),
        revokedAt: d.revoked_at ? String(d.revoked_at) : null,
      })),
      members: (data.members ?? []).map((m: Record<string, unknown>) => ({
        id: String(m.id),
        userId: String(m.user_id),
        role: String(m.role),
        status: String(m.status),
        createdAt: String(m.created_at),
        email: m.email ? String(m.email) : null,
        firstName: m.first_name ? String(m.first_name) : null,
        lastName: m.last_name ? String(m.last_name) : null,
      })),
      adminEvents: (data.admin_events ?? []).map((e: Record<string, unknown>) => ({
        id: String(e.id),
        action: String(e.action),
        reason: e.reason ? String(e.reason) : null,
        createdAt: String(e.created_at),
        adminEmail: e.admin_email ? String(e.admin_email) : null,
        beforeState: (e.before_state as Record<string, unknown>) || null,
        afterState: (e.after_state as Record<string, unknown>) || null,
        metadata: (e.metadata as Record<string, unknown>) || null,
      })),
      diagnostic: {
        cloudBusinessId: data.diagnostic.cloud_business_id,
        ownerUserId: data.diagnostic.owner_user_id,
        subscriptionRowExists: Boolean(data.diagnostic.subscription_row_exists),
        canonicalPlan: data.diagnostic.canonical_plan,
        canonicalStatus: data.diagnostic.canonical_status,
        canonicalSource: data.diagnostic.canonical_source,
        hasActiveContract: Boolean(data.diagnostic.has_active_contract),
        resolvedEntitlementPlan: data.diagnostic.resolved_entitlement_plan,
        diagnosticMismatch: data.diagnostic.diagnostic_mismatch,
      },
    };
  }

  /**
   * Activates Manual PRO canonically with reasons, immutable contract, and audit trail.
   */
  async activateManualPro(params: GrantInput): Promise<{success:boolean;error?:string}> {
    try { return await platformRpcCompatibility.activate(params); }
    catch(error) { return {success:false,error:error instanceof Error?error.message:platformError(null)}; }
  }

  /**
   * Terminates manual PRO access and returns business to FREE.
   */
  async endManualPro(businessId: string, reason = 'FINALIZADO_POR_ADMINISTRADOR'): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('platform_end_manual_pro', {
      p_business_id: businessId,
      p_reason: reason,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: Boolean(data?.success) };
  }

  /**
   * Updates business regional configuration (country/currency) with super admin audit.
   */
  async updateBusinessRegion(params: {
    businessId: string;
    countryCode: 'CL' | 'CO' | 'VE';
    currencyCode: 'CLP' | 'COP' | 'VES' | 'USD';
    reason: string;
    notes?: string;
  }): Promise<{ success: boolean; hasPriorFinancialOps?: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('platform_update_business_region', {
      p_business_id: params.businessId,
      p_country_code: params.countryCode,
      p_currency_code: params.currencyCode,
      p_reason: params.reason,
      p_notes: params.notes || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: Boolean(data?.success),
      hasPriorFinancialOps: Boolean(data?.has_prior_financial_ops),
    };
  }

  /**
   * Safely changes the logged-in Super Admin's password by first reauthenticating with current password,
   * updating through Supabase Auth, and logging the audit event with ZERO password data.
   */
  async changePassword(params: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();

    // 1. Retrieve current authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return { success: false, error: 'Sesión no válida o expirada.' };
    }

    // 2. Reauthenticate using current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: params.currentPassword,
    });

    if (signInError) {
      return { success: false, error: 'La contraseña actual no es correcta.' };
    }

    // 3. Update user password
    const { error: updateError } = await supabase.auth.updateUser({
      password: params.newPassword,
    });

    if (updateError) {
      return { success: false, error: 'No pudimos actualizar la contraseña. Inténtalo nuevamente.' };
    }

    // 4. Record audit event (ZERO password/credential data)
    try {
      await supabase.rpc('platform_log_password_changed');
    } catch (auditErr) {
      console.warn('[PlatformAdminService] Could not log password change audit event:', auditErr);
    }

    return { success: true };
  }
}

export const platformAdminService = new PlatformAdminService();
