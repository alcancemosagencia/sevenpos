import { check } from '@tauri-apps/plugin-updater';
import { isTauriEnvironment } from '../runtime/environment';
import { logger } from '../logging/Logger';

export interface UpdateStatus {
  supported: boolean;
  configured: boolean;
  available: boolean;
  currentVersion: string;
  latestVersion?: string;
  error?: string;
}

export interface UpdateService {
  checkForUpdates(): Promise<UpdateStatus>;
}

export class TauriUpdateService implements UpdateService {
  async checkForUpdates(): Promise<UpdateStatus> {
    const isNative = isTauriEnvironment();

    if (!isNative) {
      return {
        supported: false,
        configured: false,
        available: false,
        currentVersion: '0.1.0 (Web Dev)',
      };
    }

    try {
      // In AG-03, updater is initialized in Cargo/Tauri but unconfigured with production signing keys
      const update = await check();
      return {
        supported: true,
        configured: true,
        available: Boolean(update?.available),
        currentVersion: '0.1.0',
        latestVersion: update?.version,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.info('TauriUpdateService', 'Updater checked (Unconfigured in development build - Expected)', { details: errorMsg });
      return {
        supported: true,
        configured: false,
        available: false,
        currentVersion: '0.1.0',
        error: 'Tauri Updater plugin integrado correctamente. Endpoint y clave de firma pública pendientes para infraestructura de release.',
      };
    }
  }
}

export const tauriUpdateService = new TauriUpdateService();
