import { writeTextFile, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs';
import { isTauriEnvironment } from '../runtime/environment';
import { logger } from '../logging/Logger';

export interface FileSystemSpikeResult {
  success: boolean;
  filePath: string;
  bytesWritten: number;
  error?: string;
}

export class TauriFileSystemAdapter {
  /**
   * Generates a small technical diagnostic test file in the AppData directory.
   */
  async generateTechnicalDiagnosticFile(): Promise<FileSystemSpikeResult> {
    const diagnosticData = {
      app: 'SevenPOS',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      platform: 'Windows',
      runtime: isTauriEnvironment() ? 'Tauri 2 Native' : 'Browser Dev',
      core: {
        database: 'SQLite (sqlite:sevenpos.db)',
        vault: 'Tauri Stronghold',
        offline: true,
      },
    };

    const payload = JSON.stringify(diagnosticData, null, 2);
    const fileName = 'diagnostics/technical-test.json';

    if (!isTauriEnvironment()) {
      logger.info('TauriFileSystemAdapter', 'Simulated file write in browser environment.');
      return {
        success: true,
        filePath: `[Browser Virtual Storage]: ${fileName}`,
        bytesWritten: payload.length,
      };
    }

    try {
      // Ensure directory exists with least privilege
      await mkdir('diagnostics', { baseDir: BaseDirectory.AppData, recursive: true }).catch(() => {});
      await writeTextFile(fileName, payload, { baseDir: BaseDirectory.AppData });
      logger.info('TauriFileSystemAdapter', `Diagnostic file written successfully: ${fileName}`);

      return {
        success: true,
        filePath: `%APPDATA%/${fileName}`,
        bytesWritten: payload.length,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error('TauriFileSystemAdapter', 'Failed to write diagnostic file', { error: errorMsg });
      return {
        success: false,
        filePath: fileName,
        bytesWritten: 0,
        error: errorMsg,
      };
    }
  }
}

export const tauriFileSystemAdapter = new TauriFileSystemAdapter();
