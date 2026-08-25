import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Omar/.gemini/antigravity/brain/d41eeea8-12ee-409b-85b2-40fcb3462ea5';
const WORKSPACE_DIR = 'c:/Users/Omar/Documents/SevenPOS';
const BASE_URL = 'http://127.0.0.1:5175';

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

async function saveScreenshot(page, filename) {
  const artifactPath = path.join(ARTIFACT_DIR, filename);
  const workspacePath = path.join(WORKSPACE_DIR, filename);
  await page.screenshot({ path: artifactPath });
  await page.screenshot({ path: workspacePath });
  console.log(`Captured: ${filename}`);
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    const salt = 'sevenpos-salt-owner';
    const hash = await sha256Hex(`${salt}:1234`);

    await page.evaluateOnNewDocument((vaultData) => {
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('sevenpos-theme', 'dark');
      localStorage.setItem('sevenpos-onboarding-status', 'completed');
      localStorage.setItem('sevenpos-session-status', 'unlocked');
      localStorage.setItem('sevenpos_session_status', 'unlocked');
      localStorage.setItem('sevenpos-active-business-name', 'Minimarket Don Pepe');
      localStorage.setItem('sevenpos-active-owner-name', 'José Pérez');
      localStorage.setItem('sevenpos-regional-settings', JSON.stringify({
        countryCode: 'CL',
        primaryCurrencyCode: 'CLP',
      }));

      const business = {
        id: 'primary-business',
        name: 'Minimarket Don Pepe',
        slug: 'minimarket-don-pepe',
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
        id: 'primary-user',
        businessId: 'primary-business',
        name: 'José Pérez',
        role: 'OWNER',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const cat1 = {
        id: 'cat-1',
        businessId: 'primary-business',
        name: 'Abarrotes y Harinas',
        description: 'Productos de despensa',
        color: '#10b981',
        active: true,
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const cat2 = {
        id: 'cat-2',
        businessId: 'primary-business',
        name: 'Bebidas y Refrescos',
        description: 'Gaseosas y jugos',
        color: '#3b82f6',
        active: true,
        sortOrder: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const cat3 = {
        id: 'cat-3',
        businessId: 'primary-business',
        name: 'Lácteos y Huevos',
        description: 'Lácteos frescos',
        color: '#f59e0b',
        active: true,
        sortOrder: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const prod1 = {
        id: 'prod-1',
        businessId: 'primary-business',
        categoryId: 'cat-1',
        name: 'Harina de Trigo Especial 1kg',
        description: 'Harina sin polvos de hornear',
        baseUnit: 'KG',
        salePrice: 1200,
        costPrice: 800,
        sku: 'ABA-HAR-001',
        barcode: '7801234560012',
        minimumStock: 5000,
        active: true,
        hasLots: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const prod2 = {
        id: 'prod-2',
        businessId: 'primary-business',
        categoryId: 'cat-2',
        name: 'Coca-Cola Original 350ml',
        description: 'Bebida gaseosa en lata',
        baseUnit: 'UNIT',
        salePrice: 1000,
        costPrice: 650,
        sku: 'BEB-COC-350',
        barcode: '7801234560029',
        minimumStock: 10000,
        active: true,
        hasLots: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const prod3 = {
        id: 'prod-3',
        businessId: 'primary-business',
        categoryId: 'cat-1',
        name: 'Aceite Vegetal 900ml',
        description: 'Aceite maravilla 100% puro',
        baseUnit: 'UNIT',
        salePrice: 2200,
        costPrice: 1500,
        sku: 'ABA-ACE-900',
        barcode: '7801234560036',
        minimumStock: 4000,
        active: true,
        hasLots: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const prod4 = {
        id: 'prod-4',
        businessId: 'primary-business',
        categoryId: 'cat-3',
        name: 'Leche Entera 1L',
        description: 'Leche natural UHT',
        baseUnit: 'UNIT',
        salePrice: 1100,
        costPrice: 750,
        sku: 'LAC-LEC-001',
        barcode: '7801234560043',
        minimumStock: 8000,
        active: true,
        hasLots: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const lot1 = {
        id: 'lot-1',
        businessId: 'primary-business',
        productId: 'prod-1',
        lotCode: 'LOT-HAR-2026',
        expirationDate: '2026-11-30',
        createdAt: '2026-08-20T10:00:00.000Z',
        updatedAt: '2026-08-20T10:00:00.000Z',
      };
      const lot2 = {
        id: 'lot-2',
        businessId: 'primary-business',
        productId: 'prod-2',
        lotCode: 'LOT-COC-2026',
        expirationDate: '2026-10-15',
        createdAt: '2026-08-21T11:30:00.000Z',
        updatedAt: '2026-08-21T11:30:00.000Z',
      };

      const now = new Date().toISOString();
      const movements = [
        {
          id: 'mov-1',
          businessId: 'primary-business',
          productId: 'prod-1',
          lotId: 'lot-1',
          movementType: 'OPENING',
          quantityDelta: 20000, // 20 KG
          unitCost: 800,
          totalCost: 16000,
          reasonCode: 'INITIAL_COUNT',
          referenceType: 'MANUAL',
          referenceId: 'REF-001',
          createdByUserId: 'primary-user',
          note: 'Apertura inicial de inventario',
          occurredAt: '2026-08-20T10:00:00.000Z',
          createdAt: '2026-08-20T10:00:00.000Z',
        },
        {
          id: 'mov-2',
          businessId: 'primary-business',
          productId: 'prod-2',
          lotId: 'lot-2',
          movementType: 'ENTRY',
          quantityDelta: 50000, // 50 UNIT
          unitCost: 650,
          totalCost: 32500,
          reasonCode: 'PURCHASE_RECEIPT',
          referenceType: 'MANUAL',
          referenceId: 'REF-002',
          createdByUserId: 'primary-user',
          note: 'Compra reposición Coca-Cola',
          occurredAt: '2026-08-21T11:30:00.000Z',
          createdAt: '2026-08-21T11:30:00.000Z',
        },
        {
          id: 'mov-3',
          businessId: 'primary-business',
          productId: 'prod-3',
          lotId: null,
          movementType: 'ENTRY',
          quantityDelta: 15000, // 15 UNIT
          unitCost: 1500,
          totalCost: 22500,
          reasonCode: 'PURCHASE_RECEIPT',
          referenceType: 'MANUAL',
          referenceId: 'REF-003',
          createdByUserId: 'primary-user',
          note: 'Compra mensual de aceite',
          occurredAt: '2026-08-21T12:00:00.000Z',
          createdAt: '2026-08-21T12:00:00.000Z',
        },
        {
          id: 'mov-4',
          businessId: 'primary-business',
          productId: 'prod-4',
          lotId: null,
          movementType: 'ENTRY',
          quantityDelta: 3000, // 3 UNIT (min 8 -> LOW_STOCK)
          unitCost: 750,
          totalCost: 2250,
          reasonCode: 'PURCHASE_RECEIPT',
          referenceType: 'MANUAL',
          referenceId: 'REF-004',
          createdByUserId: 'primary-user',
          note: 'Ingreso semanal de leche',
          occurredAt: now,
          createdAt: now,
        },
        {
          id: 'mov-5',
          businessId: 'primary-business',
          productId: 'prod-2',
          lotId: 'lot-2',
          movementType: 'ADJUSTMENT_OUT',
          quantityDelta: -2000, // -2 UNIT
          unitCost: 650,
          totalCost: 1300,
          reasonCode: 'PHYSICAL_COUNT',
          referenceType: 'MANUAL',
          referenceId: 'REF-005',
          createdByUserId: 'primary-user',
          note: 'Ajuste por conteo físico en estantería',
          occurredAt: now,
          createdAt: now,
        },
        {
          id: 'mov-6',
          businessId: 'primary-business',
          productId: 'prod-1',
          lotId: 'lot-1',
          movementType: 'WASTE',
          quantityDelta: -2000, // -2 KG
          unitCost: 800,
          totalCost: 1600,
          reasonCode: 'DAMAGED',
          referenceType: 'MANUAL',
          referenceId: 'REF-006',
          createdByUserId: 'primary-user',
          note: 'Envase roto por manipulación en bodega',
          occurredAt: now,
          createdAt: now,
        },
      ];

      localStorage.setItem('sevenpos-dev-business', JSON.stringify(business));
      localStorage.setItem('sevenpos-dev-settings', JSON.stringify(settings));
      localStorage.setItem('sevenpos-dev-users', JSON.stringify([owner]));
      localStorage.setItem('sevenpos-dev-vault:primary-user', JSON.stringify(vaultData));
      localStorage.setItem('sevenpos-dev-categories', JSON.stringify([cat1, cat2, cat3]));
      localStorage.setItem('sevenpos-dev-products', JSON.stringify([prod1, prod2, prod3, prod4]));
      localStorage.setItem('sevenpos-dev-presentations', JSON.stringify([]));
      localStorage.setItem('sevenpos-dev-lots', JSON.stringify([lot1, lot2]));
      localStorage.setItem('sevenpos-dev-movements', JSON.stringify(movements));
    }, { hash, salt });

    async function unlockIfLocked() {
      await wait(800);
      const isLocked = await page.evaluate(() => document.body.textContent?.includes('Ingrese su PIN') || document.body.textContent?.includes('Bloqueado'));
      if (isLocked) {
        console.log('Unlocking with PIN 1234...');
        for (const digit of ['1', '2', '3', '4']) {
          await page.click(`button[aria-label="Número ${digit}"]`);
          await wait(150);
        }
        await wait(1200);
      }
    }

    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await unlockIfLocked();

    // 1. Dashboard Dark Baseline
    await saveScreenshot(page, 'ag05_1-01-dark-1440-dashboard-baseline.png');

    // Navigate to Existencias
    await page.evaluate(() => {
      const invGroup = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('Inventario'));
      if (invGroup) invGroup.click();
    });
    await wait(300);

    await page.evaluate(() => {
      const stockItem = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent?.trim() === 'Existencias');
      if (stockItem) stockItem.click();
    });
    await wait(1200);

    // 2. Inventory / Existencias Dark
    await saveScreenshot(page, 'ag05_1-02-dark-1440-inventory-existencias.png');

    // 3. Add Inventory Modal
    await page.evaluate(() => {
      const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Agregar inventario'));
      if (addBtn) addBtn.click();
    });
    await wait(600);

    // Click autocomplete trigger and select Harina
    await page.evaluate(() => {
      const autoBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Buscar o escanear'));
      if (autoBtn) autoBtn.click();
    });
    await wait(400);

    await page.evaluate(() => {
      const optBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent?.includes('Harina de Trigo'));
      if (optBtns.length > 0) optBtns[0].click();
    });
    await wait(400);

    // Fill quantity 20
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const qtyInput = inputs.find(i => i.placeholder === 'Ej. 1.250' || i.placeholder === 'Ej. 20');
      if (qtyInput) {
        qtyInput.value = '20';
        qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await wait(400);

    // Open lot accordion
    await page.evaluate(() => {
      const lotToggle = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('lote') || b.textContent?.includes('vencimiento'));
      if (lotToggle) lotToggle.click();
    });
    await wait(400);

    await page.evaluate(() => {
      const lotInput = document.querySelector('input[placeholder*="L-0826"]');
      if (lotInput) {
        lotInput.value = 'LOT-HAR-2026';
        lotInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const dateInput = document.querySelector('input[type="date"]');
      if (dateInput) {
        dateInput.value = '2026-11-30';
        dateInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await wait(400);

    // 3. Add Modal Dark Screenshot
    await saveScreenshot(page, 'ag05_1-03-dark-1440-add-inventory-modal.png');

    // Close Add Modal
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Cancelar') || b.querySelector('svg.lucide-x'));
      if (cancelBtn) cancelBtn.click();
    });
    await wait(600);

    // 4. Product Inventory Detail - click Harina row
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr.cursor-pointer'));
      if (rows.length > 0) rows[0].click();
    });
    await wait(1200);

    // 4. Product Detail Dark Screenshot
    await saveScreenshot(page, 'ag05_1-04-dark-1440-product-inventory-detail.png');

    // 5. Movements Dark - click sidebar Movimientos
    await page.evaluate(() => {
      const movItem = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent?.trim() === 'Movimientos');
      if (movItem) movItem.click();
    });
    await wait(1200);

    // 5. Movements Dark Screenshot
    await saveScreenshot(page, 'ag05_1-05-dark-1440-movements.png');

    // 6, 7, 8: Light Mode Series
    await page.evaluate(() => {
      localStorage.setItem('theme', 'light');
      localStorage.setItem('sevenpos-theme', 'light');
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    });
    await wait(600);

    // Navigate to Existencias in light mode
    await page.evaluate(() => {
      const stockItem = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent?.trim() === 'Existencias');
      if (stockItem) stockItem.click();
    });
    await wait(1200);

    // 6. Inventory Light Screenshot
    await saveScreenshot(page, 'ag05_1-06-light-1440-inventory-existencias.png');

    // Detail in light mode
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr.cursor-pointer'));
      if (rows.length > 0) rows[0].click();
    });
    await wait(1200);

    // 7. Product Detail Light Screenshot
    await saveScreenshot(page, 'ag05_1-07-light-1440-product-inventory-detail.png');

    // Movements in light mode
    await page.evaluate(() => {
      const movItem = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent?.trim() === 'Movimientos');
      if (movItem) movItem.click();
    });
    await wait(1200);

    // 8. Movements Light Screenshot
    await saveScreenshot(page, 'ag05_1-08-light-1440-movements.png');

    console.log('ALL AG-05.1 SCREENSHOTS CAPTURED PERFECTLY!');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Execution error:', err);
  process.exit(1);
});
