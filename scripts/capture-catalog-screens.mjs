import { preview } from 'vite';
import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Omar/.gemini/antigravity/brain/d41eeea8-12ee-409b-85b2-40fcb3462ea5';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sha256Hex(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function main() {
  console.log('Starting Vite preview server on static dist...');
  const server = await preview({
    preview: {
      port: 5199,
      host: '127.0.0.1',
    },
  });
  console.log('Vite preview server running on http://127.0.0.1:5199');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    const salt = 'sevenpos-salt-owner';
    const hash = await sha256Hex(`${salt}:1234`);

    // Helper to unlock
    async function unlockIfLocked() {
      await wait(800);
      const isLocked = await page.evaluate(() => document.body.textContent?.includes('Ingrese su PIN') || document.body.textContent?.includes('Bloqueado'));
      if (isLocked) {
        console.log('Unlocking with 1234...');
        for (const digit of ['1', '2', '3', '4']) {
          await page.click(`button[aria-label="Número ${digit}"]`);
          await wait(150);
        }
        await wait(1200);
      }
    }

    // Set complete dev state in localStorage before page load
    await page.evaluateOnNewDocument((vaultData) => {
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('sevenpos-onboarding-status', 'completed');
      localStorage.setItem('sevenpos-session-status', 'locked');
      localStorage.setItem('sevenpos-active-business-name', 'Minimarket Los Andes');
      localStorage.setItem('sevenpos-active-owner-name', 'Carlos Gómez');
      localStorage.setItem('sevenpos-regional-settings', JSON.stringify({
        countryCode: 'CL',
        primaryCurrencyCode: 'CLP',
      }));

      const business = {
        id: 'primary-business',
        name: 'Minimarket Los Andes',
        slug: 'minimarket-los-andes',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const settings = {
        id: 'settings-1',
        businessId: 'primary-business',
        countryCode: 'CL',
        primaryCurrency: 'CLP',
        defaultTaxRate: 19,
        receiptHeader: null,
        receiptFooter: null,
        updatedAt: new Date().toISOString(),
      };
      const owner = {
        id: 'owner-user',
        businessId: 'primary-business',
        name: 'Carlos Gómez',
        role: 'OWNER',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem('sevenpos-dev-business', JSON.stringify(business));
      localStorage.setItem('sevenpos-dev-settings', JSON.stringify(settings));
      localStorage.setItem('sevenpos-dev-users', JSON.stringify([owner]));
      localStorage.setItem('sevenpos-dev-vault:owner-user', JSON.stringify(vaultData));
    }, { hash, salt });

    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto('http://127.0.0.1:5199', { waitUntil: 'load' });
    await unlockIfLocked();

    // Expand Catálogo group and click Lista de productos
    console.log('Expanding Catálogo and navigating to Lista de productos...');
    await page.evaluate(() => {
      const catalogBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('Catálogo'));
      if (catalogBtn) catalogBtn.click();
    });
    await wait(500);
    await page.evaluate(() => {
      const productsSubBtn = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent?.includes('Lista de productos') || el.textContent?.includes('Productos'));
      if (productsSubBtn) productsSubBtn.click();
    });
    await wait(1200);

    // 1. 01-dark-1440-products-empty.png
    console.log('Capturing 01-dark-1440-products-empty.png...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01-dark-1440-products-empty.png') });

    // 2. 02-dark-1440-product-new-form.png
    console.log('Capturing 02-dark-1440-product-new-form.png...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('Nuevo producto') || el.textContent?.includes('Crear producto'));
      if (btn) btn.click();
    });
    await wait(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02-dark-1440-product-new-form.png') });

    // 3. 03-dark-1440-category-modal-inline.png
    console.log('Capturing 03-dark-1440-category-modal-inline.png...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('Crear categoría'));
      if (btn) btn.click();
    });
    await wait(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '03-dark-1440-category-modal-inline.png') });

    // Close category modal
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('Cancelar'));
      if (btn) btn.click();
    });
    await wait(500);

    // 4. 04-dark-1440-product-filled.png
    console.log('Capturing 04-dark-1440-product-filled.png...');
    // Fill in product form fields
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea'));
      const nameInput = inputs.find(i => i.getAttribute('placeholder')?.includes('Coca-Cola'));
      if (nameInput) {
        nameInput.value = 'Coca-Cola Original 350ml';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const priceInput = inputs.find(i => i.parentElement?.textContent?.includes('Precio de venta'));
      if (priceInput) {
        priceInput.value = '1000';
        priceInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const costInput = inputs.find(i => i.parentElement?.textContent?.includes('Costo de referencia'));
      if (costInput) {
        costInput.value = '650';
        costInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const skuInput = inputs.find(i => i.getAttribute('placeholder')?.includes('BEB-COCA-350'));
      if (skuInput) {
        skuInput.value = 'BEB-COCA-350';
        skuInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const barcodeInput = inputs.find(i => i.getAttribute('placeholder')?.includes('7801234567890'));
      if (barcodeInput) {
        barcodeInput.value = '7801234567890';
        barcodeInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const stockInput = inputs.find(i => i.getAttribute('placeholder')?.includes('10'));
      if (stockInput) {
        stockInput.value = '24';
        stockInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await wait(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04-dark-1440-product-filled.png') });

    // Seed full catalog dataset directly into localStorage
    await page.evaluate(() => {
      const categories = [
        { id: 'cat-bebidas', businessId: 'primary-business', name: 'Bebidas y Licores', description: 'Gaseosas, aguas, cervezas', color: '#3B82F6', active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'cat-abarrotes', businessId: 'primary-business', name: 'Abarrotes', description: 'Arroz, fideos, conservas', color: '#10B981', active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'cat-lacteos', businessId: 'primary-business', name: 'Lácteos y Quesos', description: 'Leche, yogurt, quesos', color: '#F59E0B', active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'cat-snacks', businessId: 'primary-business', name: 'Snacks y Galletas', description: 'Papas fritas, chocolates', color: '#EC4899', active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'cat-limpieza', businessId: 'primary-business', name: 'Limpieza y Aseo', description: 'Detergentes, jabones', color: '#8B5CF6', active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ];
      localStorage.setItem('sevenpos-dev-categories', JSON.stringify(categories));

      const products = [
        {
          id: 'prod-coca-350',
          businessId: 'primary-business',
          name: 'Coca-Cola Original 350ml',
          description: 'Gaseosa refrescante sabor original lata individual',
          categoryId: 'cat-bebidas',
          baseUnit: 'UNIT',
          salePrice: 1000,
          costPrice: 650,
          sku: 'BEB-COCA-350',
          barcode: '7801234567890',
          minimumStock: 24,
          imagePath: null,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod-arroz-1k',
          businessId: 'primary-business',
          name: 'Arroz Grado 1 Selección 1kg',
          description: 'Arroz grano largo seleccionado premium',
          categoryId: 'cat-abarrotes',
          baseUnit: 'KG',
          salePrice: 1490,
          costPrice: 980,
          sku: 'ABA-ARROZ-1K',
          barcode: '7809876543210',
          minimumStock: 50,
          imagePath: null,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod-leche-entera',
          businessId: 'primary-business',
          name: 'Leche Entera Natural 1L',
          description: 'Leche líquida UHT ultrapasteurizada',
          categoryId: 'cat-lacteos',
          baseUnit: 'L',
          salePrice: 1150,
          costPrice: 820,
          sku: 'LAC-LECHE-1L',
          barcode: '7801122334455',
          minimumStock: 30,
          imagePath: null,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod-papas-fritas',
          businessId: 'primary-business',
          name: 'Papas Fritas Corte Americano 200g',
          description: 'Snack crujiente sabor sal de mar',
          categoryId: 'cat-snacks',
          baseUnit: 'UNIT',
          salePrice: 1890,
          costPrice: 1100,
          sku: 'SNK-PAPAS-200',
          barcode: '7805566778899',
          minimumStock: 15,
          imagePath: null,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem('sevenpos-dev-products', JSON.stringify(products));

      const presentations = [
        {
          id: 'pres-coca-pack6',
          businessId: 'primary-business',
          productId: 'prod-coca-350',
          name: 'Pack x6 Latas',
          description: 'Six pack ahorro lata 350ml',
          unitFactor: 6,
          salePrice: 5500,
          sku: 'BEB-COCA-PK6',
          barcode: '7801234567896',
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'pres-coca-caja24',
          businessId: 'primary-business',
          productId: 'prod-coca-350',
          name: 'Caja x24 Latas',
          description: 'Bulto mayorista 24 unidades',
          unitFactor: 24,
          salePrice: 21000,
          sku: 'BEB-COCA-CJ24',
          barcode: '7801234567824',
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];
      localStorage.setItem('sevenpos-dev-presentations', JSON.stringify(presentations));
    });

    // Reload page so in-memory repositories rehydrate with the newly seeded data
    console.log('Rehydrating loaded catalog data...');
    await page.goto('http://127.0.0.1:5199', { waitUntil: 'load' });
    await unlockIfLocked();

    // Expand Catálogo group and click Lista de productos
    await page.evaluate(() => {
      const catalogBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('Catálogo'));
      if (catalogBtn) catalogBtn.click();
    });
    await wait(500);
    await page.evaluate(() => {
      const productsSubBtn = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent?.includes('Lista de productos') || el.textContent?.includes('Productos'));
      if (productsSubBtn) productsSubBtn.click();
    });
    await wait(1200);

    // 8. 08-dark-1440-products-table-loaded.png
    console.log('Capturing 08-dark-1440-products-table-loaded.png...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '08-dark-1440-products-table-loaded.png') });

    // 9. 09-dark-1440-products-search-filtered.png
    console.log('Capturing 09-dark-1440-products-search-filtered.png...');
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="Buscar por nombre"]');
      if (input) {
        input.value = 'Coca';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await wait(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '09-dark-1440-products-search-filtered.png') });

    // Clear search filter
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="Buscar por nombre"]');
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await wait(600);

    // 5. 05-dark-1440-product-detail-base.png (Arroz without presentations)
    console.log('Capturing 05-dark-1440-product-detail-base.png...');
    await page.evaluate(() => {
      const row = Array.from(document.querySelectorAll('tr')).find(r => r.textContent?.includes('Arroz'));
      if (row) (row).click();
    });
    await wait(1200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '05-dark-1440-product-detail-base.png') });

    // 7. 07-dark-1440-product-detail-presentations.png (Coca-Cola with presentations)
    console.log('Capturing 07-dark-1440-product-detail-presentations.png...');
    await page.evaluate(() => {
      const backBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('Volver al catálogo'));
      if (backBtn) backBtn.click();
    });
    await wait(800);
    await page.evaluate(() => {
      const row = Array.from(document.querySelectorAll('tr')).find(r => r.textContent?.includes('Coca-Cola'));
      if (row) (row).click();
    });
    await wait(1200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '07-dark-1440-product-detail-presentations.png') });

    // 6. 06-dark-1440-presentation-modal.png
    console.log('Capturing 06-dark-1440-presentation-modal.png...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('Agregar presentación'));
      if (btn) btn.click();
    });
    await wait(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '06-dark-1440-presentation-modal.png') });

    // Close presentation modal
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('Cancelar'));
      if (btn) btn.click();
    });
    await wait(500);

    // 10. 10-dark-1440-categories-page.png
    console.log('Capturing 10-dark-1440-categories-page.png...');
    await page.evaluate(() => {
      const catNav = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent?.includes('Categorías'));
      if (catNav) (catNav).click();
    });
    await wait(1200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '10-dark-1440-categories-page.png') });

    // 11. 11-light-1440-products-table.png
    console.log('Capturing 11-light-1440-products-table.png...');
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    });
    await wait(400);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent?.includes('Lista de productos') || el.textContent?.includes('Productos'));
      if (btn) (btn).click();
    });
    await wait(1200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '11-light-1440-products-table.png') });

    // 12. 12-light-1440-product-detail.png
    console.log('Capturing 12-light-1440-product-detail.png...');
    await page.evaluate(() => {
      const row = Array.from(document.querySelectorAll('tr')).find(r => r.textContent?.includes('Coca-Cola'));
      if (row) (row).click();
    });
    await wait(1200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '12-light-1440-product-detail.png') });

    // 13. 13-responsive-768-products.png
    console.log('Capturing 13-responsive-768-products.png...');
    await page.setViewport({ width: 768, height: 1024, deviceScaleFactor: 2 });
    await page.evaluate(() => {
      const backBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('Volver al catálogo'));
      if (backBtn) backBtn.click();
    });
    await wait(1200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '13-responsive-768-products.png') });

    // 14. 14-mobile-390-products-cards.png
    console.log('Capturing 14-mobile-390-products-cards.png...');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await wait(1200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '14-mobile-390-products-cards.png') });

    console.log('All 14 catalog screenshots captured successfully!');
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
