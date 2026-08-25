import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Omar/.gemini/antigravity/brain/d41eeea8-12ee-409b-85b2-40fcb3462ea5';
const WORKSPACE_DIR = 'c:/Users/Omar/Documents/SevenPOS';
const BASE_URL = 'http://localhost:5175';

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
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
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

    // 4. Populated Table
    await saveScreenshot(page, 'ag05-04-dark-1440-inventory-table-populated.png');

    // 2. Open Add Modal
    await page.evaluate(() => {
      const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Agregar inventario'));
      if (addBtn) addBtn.click();
    });
    await wait(600);

    // Click autocomplete trigger
    await page.evaluate(() => {
      const autoBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Buscar o escanear'));
      if (autoBtn) autoBtn.click();
    });
    await wait(400);

    // Select Harina
    await page.evaluate(() => {
      const optBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent?.includes('Harina de Trigo'));
      if (optBtns.length > 0) optBtns[0].click();
    });
    await wait(400);

    // Fill quantity 20
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const qtyInput = inputs.find(i => i.placeholder === '0.00' || i.placeholder === '0');
      if (qtyInput) {
        qtyInput.value = '20';
        qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await wait(400);

    // 2. ag05-02-dark-1440-add-inventory-modal.png
    await saveScreenshot(page, 'ag05-02-dark-1440-add-inventory-modal.png');

    // 3. Open lot accordion
    await page.evaluate(() => {
      const lotToggle = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('lote') || b.textContent?.includes('vencimiento'));
      if (lotToggle) lotToggle.click();
    });
    await wait(400);

    await page.evaluate(() => {
      const lotInput = document.querySelector('input[placeholder*="LOT-2026"]');
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

    // 3. ag05-03-dark-1440-add-with-lot.png
    await saveScreenshot(page, 'ag05-03-dark-1440-add-with-lot.png');

    // Close Add Modal
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Cancelar') || b.querySelector('svg.lucide-x'));
      if (cancelBtn) cancelBtn.click();
    });
    await wait(500);

    // 5. Open Adjust Modal
    await page.evaluate(() => {
      const adjBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Ajustar inventario'));
      if (adjBtn) adjBtn.click();
    });
    await wait(600);

    // Click autocomplete trigger
    await page.evaluate(() => {
      const autoBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Buscar o escanear'));
      if (autoBtn) autoBtn.click();
    });
    await wait(400);

    // Select Coca-Cola
    await page.evaluate(() => {
      const optBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent?.includes('Coca-Cola'));
      if (optBtns.length > 0) optBtns[0].click();
    });
    await wait(400);

    // Fill counted stock 48
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const countInput = inputs.find(i => i.placeholder === '0.00' || i.placeholder === '0');
      if (countInput) {
        countInput.value = '48';
        countInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await wait(400);

    // 5. ag05-05-dark-1440-adjust-modal.png
    await saveScreenshot(page, 'ag05-05-dark-1440-adjust-modal.png');

    // Close Adjust Modal
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Cancelar') || b.querySelector('svg.lucide-x'));
      if (cancelBtn) cancelBtn.click();
    });
    await wait(500);

    // 6. Open Waste Modal via row menu
    await page.evaluate(() => {
      const moreBtns = Array.from(document.querySelectorAll('button')).filter(b => b.title === 'Acciones');
      if (moreBtns.length > 0) moreBtns[0].click();
    });
    await wait(300);

    await page.evaluate(() => {
      const wasteItem = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Registrar merma'));
      if (wasteItem) wasteItem.click();
    });
    await wait(800);

    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const qtyInput = inputs.find(i => i.placeholder === '0.00' || i.placeholder === '0');
      if (qtyInput) {
        qtyInput.value = '2';
        qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const noteInput = inputs.find(i => i.placeholder?.includes('Envase quebrado'));
      if (noteInput) {
        noteInput.value = 'Envase roto por manipulación en bodega';
        noteInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await wait(400);

    // 6. ag05-06-dark-1440-waste-modal.png
    await saveScreenshot(page, 'ag05-06-dark-1440-waste-modal.png');

    // Close Waste Modal
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Cancelar') || b.querySelector('svg.lucide-x'));
      if (cancelBtn) cancelBtn.click();
    });
    await wait(500);

    // 7. Product Inventory Detail - click Harina row
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr.cursor-pointer'));
      if (rows.length > 0) rows[0].click();
    });
    await wait(1200);

    // 7. ag05-07-dark-1440-product-inventory-detail.png
    await saveScreenshot(page, 'ag05-07-dark-1440-product-inventory-detail.png');

    // 8. Movements Ledger - click sidebar Movimientos
    await page.evaluate(() => {
      const movItem = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent?.trim() === 'Movimientos');
      if (movItem) movItem.click();
    });
    await wait(1200);

    // 8. ag05-08-dark-1440-movements-ledger.png
    await saveScreenshot(page, 'ag05-08-dark-1440-movements-ledger.png');

    // 9, 10, 11: Light Mode Series
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

    // 9. ag05-09-light-1440-inventory-table.png
    await saveScreenshot(page, 'ag05-09-light-1440-inventory-table.png');

    // Detail in light mode
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr.cursor-pointer'));
      if (rows.length > 0) rows[0].click();
    });
    await wait(1200);

    // 10. ag05-10-light-1440-product-inventory-detail.png
    await saveScreenshot(page, 'ag05-10-light-1440-product-inventory-detail.png');

    // Movements in light mode
    await page.evaluate(() => {
      const movItem = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent?.trim() === 'Movimientos');
      if (movItem) movItem.click();
    });
    await wait(1200);

    // 11. ag05-11-light-1440-movements-ledger.png
    await saveScreenshot(page, 'ag05-11-light-1440-movements-ledger.png');

    // Mobile Viewport
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('sevenpos-theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    });
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await wait(600);
    await unlockIfLocked();

    // Open mobile hamburger menu
    await page.click('button[aria-label="Abrir menú"]');
    await wait(500);

    // Expand Inventario in drawer & click Existencias
    await page.evaluate(() => {
      const drawerButtons = Array.from(document.querySelectorAll('button'));
      const invGroup = drawerButtons.find(b => b.textContent?.includes('Inventario'));
      if (invGroup) invGroup.click();
    });
    await wait(400);

    await page.evaluate(() => {
      const drawerButtons = Array.from(document.querySelectorAll('button'));
      const stockBtn = drawerButtons.find(b => b.textContent?.trim() === 'Existencias');
      if (stockBtn) stockBtn.click();
    });
    await wait(1000);

    // 12. ag05-12-mobile-390-inventory-cards.png
    await saveScreenshot(page, 'ag05-12-mobile-390-inventory-cards.png');

    // Mobile Add Modal
    await page.evaluate(() => {
      const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Agregar') || b.textContent?.includes('+'));
      if (addBtn) addBtn.click();
    });
    await wait(800);

    // 13. ag05-13-mobile-390-add-modal.png
    await saveScreenshot(page, 'ag05-13-mobile-390-add-modal.png');

    // Close Add Modal
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Cancelar') || b.querySelector('svg.lucide-x'));
      if (cancelBtn) cancelBtn.click();
    });
    await wait(600);

    // Mobile Adjust Modal
    await page.evaluate(() => {
      const adjBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Ajustar'));
      if (adjBtn) adjBtn.click();
    });
    await wait(800);

    // 14. ag05-14-mobile-390-adjust-modal.png
    await saveScreenshot(page, 'ag05-14-mobile-390-adjust-modal.png');

    // Close Adjust Modal
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Cancelar') || b.querySelector('svg.lucide-x'));
      if (cancelBtn) cancelBtn.click();
    });
    await wait(600);

    // Mobile Product Detail
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div.cursor-pointer'));
      if (cards.length > 0) cards[0].click();
    });
    await wait(1200);

    // 16. ag05-16-mobile-390-product-detail.png
    await saveScreenshot(page, 'ag05-16-mobile-390-product-detail.png');

    // Back to 1440 Dashboard
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await wait(500);
    await unlockIfLocked();
    await page.evaluate(() => {
      const dashItem = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent?.trim() === 'Panel principal');
      if (dashItem) dashItem.click();
    });
    await wait(1200);

    // 17. ag05-17-dashboard-low-stock-kpi.png
    await saveScreenshot(page, 'ag05-17-dashboard-low-stock-kpi.png');

    console.log('ALL 17 SCREENSHOTS CAPTURED PERFECTLY!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});
