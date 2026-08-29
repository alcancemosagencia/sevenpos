import { CloudAuthService } from '../../domain/auth/CloudAuthService';
import { getSupabaseClient } from './supabaseClient';
import { SupabaseAuthService } from './SupabaseAuthService';

class CloudAuthServiceFactory {
  private instance: CloudAuthService | null = null;

  getService(): CloudAuthService {
    if (this.instance) {
      return this.instance;
    }
    const client = getSupabaseClient();
    this.instance = new SupabaseAuthService(client);
    return this.instance;
  }

  setMockService(mockService: CloudAuthService | null): void {
    this.instance = mockService;
  }
}

export const cloudAuthServiceFactory = new CloudAuthServiceFactory();
