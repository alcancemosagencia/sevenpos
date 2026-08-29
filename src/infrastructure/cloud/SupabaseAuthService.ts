import { SupabaseClient } from '@supabase/supabase-js';
import {
  BootstrapOwnerResult,
  CloudAuthService,
  CloudBusinessMembership,
  CloudDeviceRecord,
  CloudUser,
  SignUpParams,
} from '../../domain/auth/CloudAuthService';
import { DeviceType } from '../../domain/auth/DeviceEnrollment';

export class SupabaseAuthService implements CloudAuthService {
  constructor(private client: SupabaseClient) {}

  async getUser(): Promise<CloudUser | null> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) {
      return null;
    }
    return {
      id: data.user.id,
      email: data.user.email || '',
      emailConfirmed: !!data.user.email_confirmed_at,
    };
  }

  async signInWithPassword(email: string, password: string): Promise<CloudUser> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('AUTH_USER_NOT_FOUND');
    }

    return {
      id: data.user.id,
      email: data.user.email || '',
      emailConfirmed: !!data.user.email_confirmed_at,
    };
  }

  async signUp(params: SignUpParams): Promise<{ user: CloudUser | null; requiresEmailVerification: boolean }> {
    const { data, error } = await this.client.auth.signUp({
      email: params.email.trim(),
      password: params.password,
      options: {
        data: {
          first_name: params.firstName.trim(),
          last_name: params.lastName ? params.lastName.trim() : '',
        },
      },
    });

    if (error) {
      throw error;
    }

    const user = data.user
      ? {
          id: data.user.id,
          email: data.user.email || '',
          emailConfirmed: !!data.user.email_confirmed_at,
        }
      : null;

    return {
      user,
      requiresEmailVerification: !user?.emailConfirmed,
    };
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const { error } = await this.client.auth.resend({
      type: 'signup',
      email: email.trim(),
    });
    if (error) {
      throw error;
    }
  }

  async sendPasswordReset(email: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email.trim());
    if (error) {
      throw error;
    }
  }

  async checkEmailVerified(): Promise<boolean> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) {
      return false;
    }
    return !!data.user.email_confirmed_at;
  }

  async getMemberships(): Promise<CloudBusinessMembership[]> {
    const { data, error } = await this.client
      .from('business_memberships')
      .select('business_id, role, status, businesses(name, country_code)')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!data) {
      return [];
    }

    return (data as Array<{
      business_id: string;
      role: string;
      status: string;
      businesses: { name: string; country_code: string } | Array<{ name: string; country_code: string }> | null;
    }>).map((row) => {
      const biz = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
      return {
        businessId: row.business_id,
        businessName: biz?.name || '',
        countryCode: biz?.country_code || 'CL',
        role: row.role as 'OWNER',
        status: row.status as 'ACTIVE' | 'INACTIVE' | 'REVOKED',
      };
    });
  }

  async bootstrapOwnerBusiness(params: {
    firstName: string;
    lastName?: string;
    businessName: string;
    countryCode?: string;
  }): Promise<BootstrapOwnerResult> {
    const { data, error } = await this.client.rpc('bootstrap_owner_business', {
      p_first_name: params.firstName.trim(),
      p_last_name: params.lastName ? params.lastName.trim() : '',
      p_business_name: params.businessName.trim(),
      p_country_code: params.countryCode || 'CL',
    });

    if (error) {
      throw error;
    }

    return {
      userId: data.user_id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      businessId: data.business_id,
      businessName: data.business_name,
      countryCode: data.country_code,
      role: data.role,
      bootstrapCreated: !!data.bootstrap_created,
    };
  }

  async enrollDevice(params: {
    businessId: string;
    deviceName: string;
    platform: string;
    deviceType: DeviceType;
  }): Promise<CloudDeviceRecord> {
    const user = await this.getUser();
    if (!user) {
      throw new Error('UNAUTHENTICATED: Must be logged in to enroll device');
    }

    const { data, error } = await this.client
      .from('devices')
      .insert({
        business_id: params.businessId,
        user_id: user.id,
        device_name: params.deviceName.trim(),
        platform: params.platform.trim(),
        device_type: params.deviceType,
      })
      .select('id, business_id, user_id, device_name, platform, device_type, created_at, last_seen_at, revoked_at')
      .single();

    if (error) {
      throw error;
    }

    return {
      id: data.id,
      businessId: data.business_id,
      userId: data.user_id,
      deviceName: data.device_name,
      platform: data.platform,
      deviceType: data.device_type as DeviceType,
      createdAt: data.created_at,
      lastSeenAt: data.last_seen_at,
      revokedAt: data.revoked_at,
    };
  }

  async getDevice(deviceId: string): Promise<CloudDeviceRecord | null> {
    const { data, error } = await this.client
      .from('devices')
      .select('id, business_id, user_id, device_name, platform, device_type, created_at, last_seen_at, revoked_at')
      .eq('id', deviceId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      businessId: data.business_id,
      userId: data.user_id,
      deviceName: data.device_name,
      platform: data.platform,
      deviceType: data.device_type as DeviceType,
      createdAt: data.created_at,
      lastSeenAt: data.last_seen_at,
      revokedAt: data.revoked_at,
    };
  }
}
