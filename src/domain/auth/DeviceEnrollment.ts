export type DeviceType = 'DESKTOP' | 'TABLET' | 'MOBILE' | 'WEB';

export interface DeviceEnrollment {
  deviceId: string;
  cloudBusinessId: string;
  localBusinessId?: string;
  userId: string;
  accountEmail: string;
  businessName: string;
  displayName: string;
  platform: string;
  deviceType: DeviceType;
  enrolledAt: string;
}
