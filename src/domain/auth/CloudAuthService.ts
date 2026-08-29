import { DeviceType } from './DeviceEnrollment';

export interface CloudUser {
  id: string;
  email: string;
  emailConfirmed: boolean;
}

export interface CloudBusinessMembership {
  businessId: string;
  businessName: string;
  countryCode: string;
  role: 'OWNER';
  status: 'ACTIVE' | 'INACTIVE' | 'REVOKED';
}

export interface BootstrapOwnerResult {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  businessId: string;
  businessName: string;
  countryCode: string;
  role: 'OWNER';
  bootstrapCreated: boolean;
}

export interface CloudDeviceRecord {
  id: string;
  businessId: string;
  userId: string;
  deviceName: string;
  platform: string;
  deviceType: DeviceType;
  createdAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
}

export interface SignUpParams {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
}

export interface CloudAuthService {
  getUser(): Promise<CloudUser | null>;
  signInWithPassword(email: string, password: string): Promise<CloudUser>;
  signUp(params: SignUpParams): Promise<{ user: CloudUser | null; requiresEmailVerification: boolean }>;
  signOut(): Promise<void>;
  resendVerificationEmail(email: string): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  checkEmailVerified(): Promise<boolean>;
  getMemberships(): Promise<CloudBusinessMembership[]>;
  bootstrapOwnerBusiness(params: {
    firstName: string;
    lastName?: string;
    businessName: string;
    countryCode?: string;
  }): Promise<BootstrapOwnerResult>;
  enrollDevice(params: {
    businessId: string;
    deviceName: string;
    platform: string;
    deviceType: DeviceType;
  }): Promise<CloudDeviceRecord>;
  getDevice(deviceId: string): Promise<CloudDeviceRecord | null>;
}
