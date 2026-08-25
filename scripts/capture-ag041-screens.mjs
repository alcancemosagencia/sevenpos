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
      port: 5200,
      host: '127.0.0.1',
    },
  });
  console.log('Vite preview server running on http://127.0.0.1:5200');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    const salt = 'sevenpos-salt-owner';
    const hash = await sha256Hex(`${salt}:1234`);

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

      const categories = [
        { id: 'cat-bebidas', businessId: 'primary-business', name: 'Bebidas y Licores', description: 'Gaseosas, aguas, cervezas', color: '#3B82F6', active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'cat-abarrotes', businessId: 'primary-business', name: 'Abarrotes', description: 'Arroz, fideos, conservas', color: '#10B981', active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'cat-lacteos', businessId: 'primary-business', name: 'Lácteos y Quesos', description: 'Leche, yogurt, quesos', color: '#F59E0B', active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'cat-snacks', businessId: 'primary-business', name: 'Snacks y Galletas', description: 'Papas fritas, chocolates', color: '#EC4899', active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'cat-limpieza', businessId: 'primary-business', name: 'Limpieza y Aseo', description: 'Detergentes, jabones', color: '#8B5CF6', active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ];

      const products = [
        { id: 'prod-coca-350', businessId: 'primary-business', name: 'Coca-Cola Original 350ml', description: 'Gaseosa refrescante', categoryId: 'cat-bebidas', baseUnit: 'UNIT', salePrice: 1000, costPrice: 650, sku: 'BEB-COCA-350', barcode: '7801234567890', minimumStock: 24, imagePath: null, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'prod-arroz-1k', businessId: 'primary-business', name: 'Arroz Grado 1 1kg', description: 'Arroz grano largo', categoryId: 'cat-abarrotes', baseUnit: 'KG', salePrice: 1490, costPrice: 980, sku: 'ABA-ARROZ-1K', barcode: '7809876543210', minimumStock: 50, imagePath: null, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'prod-leche', businessId: 'primary-business', name: 'Leche Entera 1L', description: 'Leche líquida UHT', categoryId: 'cat-lacteos', baseUnit: 'L', salePrice: 1150, costPrice: 820, sku: 'LAC-LECHE-1L', barcode: '7801122334455', minimumStock: 30, imagePath: null, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'prod-papas', businessId: 'primary-business', name: 'Papas Fritas 200g', description: 'Snack sal de mar', categoryId: 'cat-snacks', baseUnit: 'UNIT', salePrice: 1890, costPrice: 1100, sku: 'SNK-PAPAS-200', barcode: '7805566778899', minimumStock: 15, imagePath: null, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ];

      localStorage.setItem('sevenpos-dev-business', JSON.stringify(business));
      localStorage.setItem('sevenpos-dev-settings', JSON.stringify(settings));
      localStorage.setItem('sevenpos-dev-users', JSON.stringify([owner]));
      localStorage.setItem('sevenpos-dev-categories', JSON.stringify(categories));
      localStorage.setItem('sevenpos-dev-products', JSON.stringify(products));
      localStorage.setItem('sevenpos-dev-vault:owner-user', JSON.stringify(vaultData));
    }, { hash, salt });

    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto('http://127.0.0.1:5200', { waitUntil: 'load' });
    await unlockIfLocked();

    // Expand Catálogo group and click Lista de productos
    console.log('Navigating to Products list...');
    await page.evaluate(() => {
      const catalogBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('Catálogo'));
      if (catalogBtn) catalogBtn.click();
    });
    await wait(400);
    await page.evaluate(() => {
      const productsSubBtn = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent?.includes('Lista de productos') || el.textContent?.includes('Productos'));
      if (productsSubBtn) productsSubBtn.click();
    });
    await wait(1000);

    // Go to New Product form
    console.log('Navigating to New Product form...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('Nuevo producto') || el.textContent?.includes('Crear producto'));
      if (btn) btn.click();
    });
    await wait(1000);

    // 1. Dark 1440: Category Autocomplete closed
    console.log('Capturing ag041-01-dark-1440-cat-closed.png...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ag041-01-dark-1440-cat-closed.png') });

    // 2. Dark 1440: Category Autocomplete open + search
    console.log('Capturing ag041-02-dark-1440-cat-open-search.png...');
    await page.click('button[aria-label="Seleccionar categoría"]');
    await wait(500);
    await page.type('input[placeholder*="Buscar categoría"]', 'Beb');
    await wait(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ag041-02-dark-1440-cat-open-search.png') });

    // Select Bebidas to close category popover
    await page.evaluate(() => {
      const option = Array.from(document.querySelectorAll('button[role="option"]')).find(b => b.textContent?.includes('Bebidas y Licores'));
      if (option) option.click();
    });
    await wait(500);

    // 3. Dark 1440: Base Unit dropdown open
    console.log('Capturing ag041-03-dark-1440-unit-open.png...');
    await page.click('button[aria-label="Seleccionar unidad base de medida"]');
    await wait(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ag041-03-dark-1440-unit-open.png') });

    // Close unit popover by clicking Kilogramo
    await page.evaluate(() => {
      const kgOption = Array.from(document.querySelectorAll('button[role="option"]')).find(b => b.textContent?.includes('Kilogramo'));
      if (kgOption) kgOption.click();
    });
    await wait(500);

    // 4. Dark 1440: Categories Table
    console.log('Capturing ag041-04-dark-1440-categories-table.png...');
    await page.evaluate(() => {
      const catNav = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent?.includes('Categorías'));
      if (catNav) catNav.click();
    });
    await wait(1200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ag041-04-dark-1440-categories-table.png') });

    // 5. Light 1440: Category Autocomplete open
    console.log('Capturing ag041-05-light-1440-cat-open.png...');
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    });
    await wait(400);
    // Go to New Product form
    await page.evaluate(() => {
      const prodNav = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent?.includes('Lista de productos') || el.textContent?.includes('Productos'));
      if (prodNav) prodNav.click();
    });
    await wait(800);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('Nuevo producto') || el.textContent?.includes('Crear producto'));
      if (btn) btn.click();
    });
    await wait(1000);
    // Open category autocomplete
    await page.click('button[aria-label="Seleccionar categoría"]');
    await wait(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ag041-05-light-1440-cat-open.png') });

    // 6. Light 1440: Categories Table
    console.log('Capturing ag041-06-light-1440-categories-table.png...');
    await page.evaluate(() => {
      const catNav = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent?.includes('Categorías'));
      if (catNav) catNav.click();
    });
    await wait(1200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ag041-06-light-1440-categories-table.png') });

    // 7. Mobile 390: Categories mobile list
    console.log('Capturing ag041-07-mobile-390-categories.png...');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await wait(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ag041-07-mobile-390-categories.png') });

    // 8. Mobile 390: New Product mobile with selector open
    console.log('Capturing ag041-08-mobile-390-product-selector.png...');
    // Open mobile navigation drawer or go to new product
    await page.evaluate(() => {
      const prodNav = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent?.includes('Lista de productos') || el.textContent?.includes('Productos'));
      if (prodNav) prodNav.click();
    });
    await wait(800);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('Nuevo producto') || el.textContent?.includes('Crear producto'));
      if (btn) btn.click();
    });
    await wait(1000);
    // Open category autocomplete on mobile
    await page.click('button[aria-label="Seleccionar categoría"]');
    await wait(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ag041-08-mobile-390-product-selector.png') });

    console.log('All 8 AG-04.1 screenshots captured successfully!');
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error('Error during AG-04.1 capture:', err);
  process.exit(1);
});
