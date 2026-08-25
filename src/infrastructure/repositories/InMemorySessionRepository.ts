import { SessionRepository, SessionState } from '../../domain/auth/SessionRepository';

export class InMemorySessionRepository implements SessionRepository {
  private session: SessionState;

  constructor(initialState?: SessionState) {
    this.session = initialState || { status: 'locked' };
  }

  async getSession(): Promise<SessionState> {
    return { ...this.session };
  }

  async saveSession(session: SessionState): Promise<void> {
    this.session = { ...session };
  }

  async clearSession(): Promise<void> {
    this.session = { status: 'locked' };
  }
}
