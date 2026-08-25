import { BusinessRepository } from '../../domain/business/BusinessRepository';
import { UserRepository } from '../../domain/user/UserRepository';
import { PinVault } from '../../domain/auth/PinVault';
import { SessionRepository } from '../../domain/auth/SessionRepository';
import { Business } from '../../domain/business/Business';
import { BusinessSettings } from '../../domain/business/BusinessSettings';
import { User } from '../../domain/user/User';
import { DatabaseManager } from '../../infrastructure/database/DatabaseManager';
import { repositoryFactory } from '../../infrastructure/repositories/RepositoryFactory';
import { isTauriEnvironment } from '../../infrastructure/runtime/environment';
import { LegacyOnboardingMigrator } from '../migration/LegacyOnboardingMigrator';
import { logger } from '../../infrastructure/logging/Logger';

export type BootStatus = 'INITIALIZING' | 'READY' | 'BOOT_FAILURE';

export interface ApplicationBootResult {
  status: BootStatus;
  isTauriNative: boolean;
  business: Business | null;
  settings: BusinessSettings | null;
  owner: User | null;
  onboardingStatus: 'incomplete' | 'completed';
  sessionStatus: 'locked' | 'unlocked';
  error?: string;
}

export class BootApplication {
  constructor(
    private dbManager: DatabaseManager,
    private businessRepo: BusinessRepository,
    private userRepo: UserRepository,
    private pinVault: PinVault,
    private sessionRepo?: SessionRepository
  ) {}

  async execute(): Promise<ApplicationBootResult> {
    const isNative = isTauriEnvironment();
    logger.info('BootApplication', `Booting SevenPOS Technical Core (Runtime: ${isNative ? 'Tauri Native' : 'Browser Development'})`);

    // 1. Initialize SQLite Database (if native)
    if (isNative) {
      try {
        const db = await this.dbManager.getDatabase();
        if (!db) {
          throw new Error('No se pudo inicializar la conexión con el motor SQLite de Tauri.');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error('BootApplication', 'CRITICAL: Native SQLite database boot failed', { error: errorMsg });
        // Native Tauri boot failure must NOT fall back to localStorage
        return {
          status: 'BOOT_FAILURE',
          isTauriNative: true,
          business: null,
          settings: null,
          owner: null,
          onboardingStatus: 'incomplete',
          sessionStatus: 'locked',
          error: `Error al abrir base de datos local SQLite: ${errorMsg}`,
        };
      }
    }

    // 2. Execute Legacy Migration if needed
    try {
      const migrator = new LegacyOnboardingMigrator(this.businessRepo, this.userRepo, this.pinVault);
      await migrator.migrateIfNeeded();
    } catch (migErr) {
      logger.warn('BootApplication', 'Legacy migration encountered non-fatal error', { error: String(migErr) });
    }

    // 3. Hydrate Business & Owner from Repositories (SQLite Source of Truth)
    try {
      const business = await this.businessRepo.getPrimaryBusiness();
      let settings: BusinessSettings | null = null;
      let owner: User | null = null;

      if (business) {
        settings = await this.businessRepo.getBusinessSettings(business.id);
        owner = await this.userRepo.getOwnerUser();
      }

      const isCompleted = Boolean(business && owner);

      // 4. Hydrate ephemeral session status (survives reload within active session, locks on fresh process / logout)
      const sessionRepository = this.sessionRepo || repositoryFactory.getSessionRepository();
      const currentSession = isCompleted ? await sessionRepository.getSession() : { status: 'locked' as const };
      const effectiveSessionStatus = isCompleted && currentSession.status === 'unlocked' ? 'unlocked' : 'locked';

      logger.info('BootApplication', `Boot hydration complete: Onboarding is ${isCompleted ? 'COMPLETED' : 'INCOMPLETE'}, Session is ${effectiveSessionStatus.toUpperCase()}`);

      return {
        status: 'READY',
        isTauriNative: isNative,
        business,
        settings,
        owner,
        onboardingStatus: isCompleted ? 'completed' : 'incomplete',
        sessionStatus: effectiveSessionStatus,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error('BootApplication', 'Error hydrating domain entities during boot', { error: errorMsg });
      return {
        status: isNative ? 'BOOT_FAILURE' : 'READY',
        isTauriNative: isNative,
        business: null,
        settings: null,
        owner: null,
        onboardingStatus: 'incomplete',
        sessionStatus: 'locked',
        error: errorMsg,
      };
    }
  }
}
