import { PinVault } from '../../domain/auth/PinVault';
import { isTauriEnvironment } from '../runtime/environment';
import { StrongholdPinVault } from './StrongholdPinVault';
import { WebCryptoPinVaultFallback } from './WebCryptoPinVaultFallback';
import { logger } from '../logging/Logger';

class PinVaultFactory {
  private instance: PinVault | null = null;

  getPinVault(): PinVault {
    if (this.instance) {
      return this.instance;
    }

    if (isTauriEnvironment()) {
      logger.info('PinVaultFactory', 'Creating StrongholdPinVault for native Tauri runtime');
      this.instance = new StrongholdPinVault();
    } else {
      logger.info('PinVaultFactory', 'Creating WebCryptoPinVaultFallback for development/test runtime');
      this.instance = new WebCryptoPinVaultFallback();
    }

    return this.instance;
  }
}

export const pinVaultFactory = new PinVaultFactory();
