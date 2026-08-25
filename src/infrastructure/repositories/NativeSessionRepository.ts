import { invoke } from '@tauri-apps/api/core';
import { SessionRepository, SessionState } from '../../domain/auth/SessionRepository';
import { logger } from '../logging/Logger';

interface NativePayload {
  status: string;
  unlockedUserId?: string | null;
  unlockedAt?: string | null;
}

export class NativeSessionRepository implements SessionRepository {
  private inMemoryFallback: SessionState = { status: 'locked' };

  async getSession(): Promise<SessionState> {
    try {
      const res = await invoke<NativePayload>('get_native_session');
      if (res && res.status === 'unlocked') {
        return {
          status: 'unlocked',
          unlockedUserId: res.unlockedUserId || undefined,
          unlockedAt: res.unlockedAt || undefined,
        };
      }
      return { status: 'locked' };
    } catch (err) {
      logger.warn('NativeSessionRepository', 'Failed to invoke get_native_session, falling back to memory/sessionStorage', { error: String(err) });
      return { ...this.inMemoryFallback };
    }
  }

  async saveSession(session: SessionState): Promise<void> {
    this.inMemoryFallback = { ...session };
    try {
      await invoke('save_native_session', {
        session: {
          status: session.status,
          unlockedUserId: session.unlockedUserId || null,
          unlockedAt: session.unlockedAt || new Date().toISOString(),
        },
      });
    } catch (err) {
      logger.warn('NativeSessionRepository', 'Failed to invoke save_native_session', { error: String(err) });
    }
  }

  async clearSession(): Promise<void> {
    this.inMemoryFallback = { status: 'locked' };
    try {
      await invoke('clear_native_session');
    } catch (err) {
      logger.warn('NativeSessionRepository', 'Failed to invoke clear_native_session', { error: String(err) });
    }
  }
}
