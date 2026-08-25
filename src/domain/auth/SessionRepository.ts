export interface SessionState {
  status: 'locked' | 'unlocked';
  unlockedUserId?: string;
  unlockedAt?: string;
}

export interface SessionRepository {
  getSession(): Promise<SessionState>;
  saveSession(session: SessionState): Promise<void>;
  clearSession(): Promise<void>;
}
