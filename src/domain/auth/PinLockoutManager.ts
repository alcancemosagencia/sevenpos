export interface LockoutStatus {
  isLocked: boolean;
  remainingSeconds: number;
  attemptsLeft: number;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds

class PinLockoutManager {
  private failedAttempts: Map<string, { count: number; lockedUntil: number | null }> = new Map();

  getStatus(key: string): LockoutStatus {
    const record = this.failedAttempts.get(key);
    if (!record) {
      return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_ATTEMPTS };
    }

    const now = Date.now();
    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { isLocked: true, remainingSeconds, attemptsLeft: 0 };
    }

    if (record.lockedUntil && record.lockedUntil <= now) {
      // Lockout expired, reset attempts
      this.failedAttempts.delete(key);
      return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_ATTEMPTS };
    }

    return {
      isLocked: false,
      remainingSeconds: 0,
      attemptsLeft: Math.max(0, MAX_ATTEMPTS - record.count),
    };
  }

  recordFailedAttempt(key: string): LockoutStatus {
    const now = Date.now();
    const current = this.getStatus(key);

    if (current.isLocked) {
      return current;
    }

    const record = this.failedAttempts.get(key) || { count: 0, lockedUntil: null };
    record.count += 1;

    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_DURATION_MS;
      this.failedAttempts.set(key, record);
      return {
        isLocked: true,
        remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
        attemptsLeft: 0,
      };
    }

    this.failedAttempts.set(key, record);
    return {
      isLocked: false,
      remainingSeconds: 0,
      attemptsLeft: MAX_ATTEMPTS - record.count,
    };
  }

  recordSuccess(key: string): void {
    this.failedAttempts.delete(key);
  }

  reset(): void {
    this.failedAttempts.clear();
  }

  resetAll(): void {
    this.failedAttempts.clear();
  }
}

export const pinLockoutManager = new PinLockoutManager();
