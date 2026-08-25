import { isTauriEnvironment } from '../runtime/environment';
import { writeFile, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs';
import { logger } from '../logging/Logger';

export interface SavedImageResult {
  imagePath: string;
  previewUrl: string;
}

export interface ProductImageStorage {
  saveProductImage(productId: string, file: File): Promise<SavedImageResult>;
  resolveImageUrl(imagePath?: string | null): Promise<string | null>;
  deleteProductImage(imagePath: string): Promise<void>;
}

// In-browser IndexedDB storage for Dev mode to prevent localStorage quota exhaustion
const IDB_NAME = 'sevenpos_image_store';
const IDB_STORE = 'product_images';

async function getIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Compresses and resizes an image file to max 1600px in WebP/JPEG format.
 */
async function processAndOptimizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIMENSION = 1600;
        let { width, height } = img;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('No se pudo inicializar canvas 2D para procesar imagen.'));
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP with 0.85 quality, fallback to JPEG
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              canvas.toBlob(
                (fallbackBlob) => {
                  if (fallbackBlob) resolve(fallbackBlob);
                  else reject(new Error('Fallo al comprimir imagen.'));
                },
                'image/jpeg',
                0.85
              );
            }
          },
          'image/webp',
          0.85
        );
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen seleccionada.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
    reader.readAsDataURL(file);
  });
}

export class TauriProductImageStorage implements ProductImageStorage {
  async saveProductImage(productId: string, file: File): Promise<SavedImageResult> {
    try {
      const optimizedBlob = await processAndOptimizeImage(file);
      const arrayBuffer = await optimizedBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const dir = `product-images/${productId}`;
      const fileName = `primary.webp`;
      const relativePath = `${dir}/${fileName}`;

      // Ensure directory exists in AppData
      await mkdir(dir, { baseDir: BaseDirectory.AppData, recursive: true }).catch(() => {});
      await writeFile(relativePath, bytes, { baseDir: BaseDirectory.AppData });

      const previewUrl = URL.createObjectURL(optimizedBlob);
      logger.info('TauriProductImageStorage', `Imagen de producto guardada en AppData: ${relativePath}`);

      return {
        imagePath: relativePath,
        previewUrl,
      };
    } catch (err) {
      logger.error('TauriProductImageStorage', 'Error al guardar imagen en Tauri', { error: String(err) });
      throw err;
    }
  }

  async resolveImageUrl(imagePath?: string | null): Promise<string | null> {
    if (!imagePath) return null;
    // In Tauri webview, images in AppData can be rendered with asset protocol or base64
    // If it starts with blob: or http: return as is
    if (imagePath.startsWith('blob:') || imagePath.startsWith('data:') || imagePath.startsWith('http')) {
      return imagePath;
    }
    // Tauri asset protocol representation
    return `https://asset.localhost/${imagePath}`;
  }

  async deleteProductImage(_imagePath: string): Promise<void> {
    // Optional cleanup
  }
}

export class BrowserDevProductImageStorage implements ProductImageStorage {
  private urlCache: Map<string, string> = new Map();

  async saveProductImage(productId: string, file: File): Promise<SavedImageResult> {
    try {
      const optimizedBlob = await processAndOptimizeImage(file);
      const key = `product_img_${productId}`;
      const imagePath = `idb://${key}`;

      // Revoke old object URL if cached
      const existingUrl = this.urlCache.get(imagePath);
      if (existingUrl) {
        URL.revokeObjectURL(existingUrl);
        this.urlCache.delete(imagePath);
      }

      if (typeof indexedDB !== 'undefined') {
        const db = await getIndexedDb();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          const store = tx.objectStore(IDB_STORE);
          store.put({ key, blob: optimizedBlob, updatedAt: new Date().toISOString() });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }

      const previewUrl = URL.createObjectURL(optimizedBlob);
      this.urlCache.set(imagePath, previewUrl);
      return {
        imagePath,
        previewUrl,
      };
    } catch (err) {
      logger.error('BrowserDevProductImageStorage', 'Error al guardar imagen en IDB', { error: String(err) });
      throw err;
    }
  }

  async resolveImageUrl(imagePath?: string | null): Promise<string | null> {
    if (!imagePath) return null;
    if (imagePath.startsWith('blob:') || imagePath.startsWith('data:') || imagePath.startsWith('http')) {
      return imagePath;
    }

    if (imagePath.startsWith('idb://') && typeof indexedDB !== 'undefined') {
      const cached = this.urlCache.get(imagePath);
      if (cached) return cached;

      try {
        const key = imagePath.replace('idb://', '');
        const db = await getIndexedDb();
        const blob = await new Promise<Blob | null>((resolve) => {
          const tx = db.transaction(IDB_STORE, 'readonly');
          const store = tx.objectStore(IDB_STORE);
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result?.blob || null);
          req.onerror = () => resolve(null);
        });

        if (blob) {
          const url = URL.createObjectURL(blob);
          this.urlCache.set(imagePath, url);
          return url;
        }
      } catch {
        return null;
      }
    }
    return imagePath;
  }

  async deleteProductImage(imagePath: string): Promise<void> {
    const existingUrl = this.urlCache.get(imagePath);
    if (existingUrl) {
      URL.revokeObjectURL(existingUrl);
      this.urlCache.delete(imagePath);
    }

    if (imagePath.startsWith('idb://') && typeof indexedDB !== 'undefined') {
      try {
        const key = imagePath.replace('idb://', '');
        const db = await getIndexedDb();
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(key);
      } catch {
        // Ignore
      }
    }
  }
}

export const productImageStorage: ProductImageStorage = isTauriEnvironment()
  ? new TauriProductImageStorage()
  : new BrowserDevProductImageStorage();
