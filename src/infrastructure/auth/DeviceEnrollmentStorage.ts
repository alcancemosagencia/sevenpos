import { DeviceEnrollment } from '../../domain/auth/DeviceEnrollment';

const DEVICE_ENROLLMENT_KEY = 'sevenpos_device_enrollment';
let testMemoryFallback: string | null = null;

export class DeviceEnrollmentStorage {
  static getEnrollment(): DeviceEnrollment | null {
    if (typeof window === 'undefined') {
      if (testMemoryFallback) {
        return JSON.parse(testMemoryFallback) as DeviceEnrollment;
      }
      return null;
    }

    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        const raw = localStorage.getItem(DEVICE_ENROLLMENT_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as DeviceEnrollment;
      }
      return null;
    } catch {
      return null;
    }
  }

  static saveEnrollment(enrollment: DeviceEnrollment): void {
    const serialized = JSON.stringify(enrollment);

    if (typeof window === 'undefined') {
      testMemoryFallback = serialized;
      return;
    }

    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        localStorage.setItem(DEVICE_ENROLLMENT_KEY, serialized);
        return;
      }
      throw new Error('localStorage is not available');
    } catch (err) {
      console.error('Failed to persist DeviceEnrollment:', err);
      throw new Error('DEVICE_ENROLLMENT_PERSISTENCE_ERROR', { cause: err });
    }
  }

  static clearEnrollment(): void {
    if (typeof window === 'undefined') {
      testMemoryFallback = null;
      return;
    }

    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        localStorage.removeItem(DEVICE_ENROLLMENT_KEY);
      }
    } catch (err) {
      console.warn('Error removing DeviceEnrollment:', err);
    }
  }
}
