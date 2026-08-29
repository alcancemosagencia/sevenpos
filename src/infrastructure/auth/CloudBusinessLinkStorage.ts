import { CloudBusinessLink } from '../../domain/auth/CloudBusinessLink';

const CLOUD_LINK_KEY = 'sevenpos_cloud_business_link';
let testMemoryFallback: string | null = null;

export class CloudBusinessLinkStorage {
  static getLink(): CloudBusinessLink | null {
    if (typeof window === 'undefined') {
      if (testMemoryFallback) {
        return JSON.parse(testMemoryFallback) as CloudBusinessLink;
      }
      return null;
    }

    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        const raw = localStorage.getItem(CLOUD_LINK_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as CloudBusinessLink;
      }
      return null;
    } catch {
      return null;
    }
  }

  static saveLink(link: CloudBusinessLink): void {
    const serialized = JSON.stringify(link);

    if (typeof window === 'undefined') {
      testMemoryFallback = serialized;
      return;
    }

    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        localStorage.setItem(CLOUD_LINK_KEY, serialized);
        return;
      }
      throw new Error('localStorage is not available');
    } catch (err) {
      console.error('Failed to persist CloudBusinessLink:', err);
      throw new Error('CLOUD_BUSINESS_LINK_PERSISTENCE_ERROR', { cause: err });
    }
  }

  static clearLink(): void {
    if (typeof window === 'undefined') {
      testMemoryFallback = null;
      return;
    }

    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
        localStorage.removeItem(CLOUD_LINK_KEY);
      }
    } catch (err) {
      console.warn('Error removing CloudBusinessLink:', err);
    }
  }
}
