import { SessionRepository, SessionState } from '../../domain/auth/SessionRepository';
import { logger } from '../logging/Logger';

const SESSION_STORAGE_KEY = 'sevenpos_ephemeral_session';

export class BrowserSessionRepository implements SessionRepository {
  private inMemoryFallback: SessionState = { status: 'locked' };

  private isStorageAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
    } catch {
      return false;
    }
  }

  async getSession(): Promise<SessionState> {
    if (!this.isStorageAvailable()) {
      return { ...this.inMemoryFallback };
    }

    try {
      const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) {
        return { status: 'locked' };
      }

      const parsed = JSON.parse(raw);
      if (parsed && parsed.status === 'unlocked') {
        return {
          status: 'unlocked',
          unlockedUserId: typeof parsed.unlockedUserId === 'string' ? parsed.unlockedUserId : undefined,
          unlockedAt: typeof parsed.unlockedAt === 'string' ? parsed.unlockedAt : undefined,
        };
      }

      return { status: 'locked' };
    } catch (err) {
      logger.warn('BrowserSessionRepository', 'Failed to read ephemeral session from sessionStorage', { error: String(err) });
      return { status: 'locked' };
    }
  }

  async saveSession(session: SessionState): Promise<void> {
    this.inMemoryFallback = { ...session };

    if (!this.isStorageAvailable()) return;

    try {
      if (session.status === 'unlocked') {
        const payload = {
          status: 'unlocked',
          unlockedUserId: session.unlockedUserId,
          unlockedAt: session.unlockedAt || new Date().toISOString(),
        };
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
      } else {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (err) {
      logger.warn('BrowserSessionRepository', 'Failed to save ephemeral session to sessionStorage', { error: String(err) });
    }
  }

  async clearSession(): Promise<void> {
    this.inMemoryFallback = { status: 'locked' };

    if (!this.isStorageAvailable()) return;

    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (err) {
      logger.warn('BrowserSessionRepository', 'Failed to clear sessionStorage', { error: String(err) });
    }
  }
}
