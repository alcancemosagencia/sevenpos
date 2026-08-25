import { PinVault } from '../../domain/auth/PinVault';
import { hashPin, verifyPinHash } from '../../services/pinCrypto';

const FALLBACK_VAULT_KEY_PREFIX = 'sevenpos-dev-vault:';

export class WebCryptoPinVaultFallback implements PinVault {
  private inMemoryStore: Map<string, { hash: string; salt: string }> = new Map();

  async savePinCredential(userId: string, pin: string): Promise<void> {
    const { hash, salt } = await hashPin(pin);
    this.inMemoryStore.set(userId, { hash, salt });

    // In browser dev, also persist in dev localStorage if available
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`${FALLBACK_VAULT_KEY_PREFIX}${userId}`, JSON.stringify({ hash, salt }));
      } catch {
        // Ignore localStorage quota errors in tests
      }
    }
  }

  async verifyPin(userId: string, pin: string): Promise<boolean> {
    let credential = this.inMemoryStore.get(userId);

    if (!credential && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(`${FALLBACK_VAULT_KEY_PREFIX}${userId}`);
        if (raw) {
          credential = JSON.parse(raw);
          if (credential) {
            this.inMemoryStore.set(userId, credential);
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    if (!credential) {
      return false;
    }

    return verifyPinHash(pin, credential.hash, credential.salt);
  }

  async hasPinCredential(userId: string): Promise<boolean> {
    if (this.inMemoryStore.has(userId)) {
      return true;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(`${FALLBACK_VAULT_KEY_PREFIX}${userId}`) !== null;
    }
    return false;
  }

  async resetVault(): Promise<void> {
    this.inMemoryStore.clear();
    if (typeof localStorage !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(FALLBACK_VAULT_KEY_PREFIX)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {
        // Ignore
      }
    }
  }
}
