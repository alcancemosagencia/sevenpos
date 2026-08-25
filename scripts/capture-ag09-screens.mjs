import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Omar/.gemini/antigravity/brain/d41eeea8-12ee-409b-85b2-40fcb3462ea5';
const WORKSPACE_DIR = 'c:/Users/Omar/Documents/SevenPOS';
const BASE_URL = 'http://localhost:5173';

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
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err));

    const salt = 'sevenpos-salt-owner';
    const hash = await sha256Hex(`${salt}:1234`);
    const vaultData = {
      salt,
      hash,
      iterations: 100000,
      updatedAt: new Date().toISOString(),
    };

    const setupAuthAndData = async () => {
      await page.evaluate((vault) => {
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

        sessionStorage.setItem('sevenpos_ephemeral_session', JSON.stringify({
          status: 'unlocked',
          unlockedUserId: 'primary-user',
          unlockedAt: new Date().toISOString(),
        }));

        const business = {
          id: 'primary-business',
          name: 'Minimarket Don Pepe',
          slug: 'minimarket-don-pepe',
          countryCode: 'CL',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('sevenpos-dev-business', JSON.stringify(business));
        localStorage.setItem('sevenpos-dev-businesses', JSON.stringify([business]));

        const settings = {
          businessId: 'primary-business',
          primaryCurrency: 'CLP',
          secondaryCurrency: null,
          secondaryCurrencyEnabled: false,
          exchangeRateProvider: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('sevenpos-dev-settings', JSON.stringify(settings));
        localStorage.setItem('sevenpos-dev-business-settings', JSON.stringify([settings]));

        const owner = {
          id: 'primary-user',
          businessId: 'primary-business',
          firstName: 'José',
          lastName: 'Pérez',
          displayName: 'José Pérez',
          role: 'OWNER',
          pinVault: vault,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('sevenpos-dev-users', JSON.stringify([owner]));
        localStorage.setItem('sevenpos-dev-current-user', JSON.stringify(owner));

        const categories = [
          { id: 'cat-1', businessId: 'primary-business', name: 'Bebidas', sortOrder: 0, active: true },
          { id: 'cat-2', businessId: 'primary-business', name: 'Abarrotes', sortOrder: 1, active: true },
        ];
        localStorage.setItem('sevenpos-dev-categories', JSON.stringify(categories));

        const products = [
          {
            id: 'prod-1',
            businessId: 'primary-business',
            name: 'Coca Cola 1.5L',
            categoryId: 'cat-1',
            salePrice: 1800,
            costPrice: 1200,
            baseUnit: 'UNIT',
            active: true,
            featured: true,
            sku: 'CC-1500',
            barcode: '7801234567890',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'prod-2',
            businessId: 'primary-business',
            name: 'Pan Hallulla',
            categoryId: 'cat-2',
            salePrice: 2100,
            costPrice: 1400,
            baseUnit: 'KG',
            active: true,
            featured: true,
            sku: 'PAN-HAL',
            barcode: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
        localStorage.setItem('sevenpos-dev-products', JSON.stringify(products));

        // Stock movements
        const movements = [
          {
            id: 'mov-1',
            businessId: 'primary-business',
            productId: 'prod-1',
            movementType: 'ENTRY',
            quantityDelta: 100000,
            unitCost: 1200,
            totalCost: 120000,
            occurredAt: new Date().toISOString(),
            createdByUserId: 'primary-user',
          },
          {
            id: 'mov-2',
            businessId: 'primary-business',
            productId: 'prod-2',
            movementType: 'ENTRY',
            quantityDelta: 50000,
            unitCost: 1400,
            totalCost: 70000,
            occurredAt: new Date().toISOString(),
            createdByUserId: 'primary-user',
          }
        ];
        localStorage.setItem('sevenpos-dev-movements', JSON.stringify(movements));

        // Cash register & session
        const registers = [
          {
            id: 'reg-1',
            businessId: 'primary-business',
            name: 'Caja Principal',
            isDefault: true,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ];
        localStorage.setItem('sevenpos-dev-cash-registers', JSON.stringify(registers));

        const cashSessions = [
          {
            id: 'session-1',
            businessId: 'primary-business',
            cashRegisterId: 'reg-1',
            openedByUserId: 'primary-user',
            openedByNameSnapshot: 'José Pérez',
            openedAt: new Date().toISOString(),
            status: 'OPEN',
            openingAmount: 50000,
            currencyCode: 'CLP',
            closedAt: null,
            closedByUserId: null,
            closedByNameSnapshot: null,
            expectedAmount: 50000,
            actualAmount: null,
            differenceAmount: null,
            notes: null,
          }
        ];
        localStorage.setItem('sevenpos-dev-cash-sessions', JSON.stringify(cashSessions));

        // Customers Seed Data
        const customers = [
          {
            id: 'cust-1',
            businessId: 'primary-business',
            name: 'Carolina',
            lastName: 'Valenzuela',
            documentType: 'RUT',
            documentNumber: '15.432.890-K',
            documentNormalized: '15432890K',
            phone: '+56 9 8765 4321',
            phoneNormalized: '56987654321',
            email: 'carolina.valenzuela@gmail.com',
            emailNormalized: 'carolina.valenzuela@gmail.com',
            address: 'Av. Providencia 1234, Depto 502, Santiago',
            notes: 'Cliente preferente de los viernes. Paga preferentemente con Débito.',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'cust-2',
            businessId: 'primary-business',
            name: 'Roberto',
            lastName: 'Muñoz',
            documentType: 'RUT',
            documentNumber: '12.876.543-2',
            documentNormalized: '128765432',
            phone: '+56 9 7654 3210',
            phoneNormalized: '56976543210',
            email: 'roberto.munoz@empresa.cl',
            emailNormalized: 'roberto.munoz@empresa.cl',
            address: 'Calle Los Alerces 456, Ñuñoa',
            notes: 'Compra pan y bebidas para oficina.',
            active: true,
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'cust-3',
            businessId: 'primary-business',
            name: 'Empresa Constructora Los Andes SpA',
            lastName: null,
            documentType: 'RUT',
            documentNumber: '76.987.654-3',
            documentNormalized: '769876543',
            phone: '+56 2 2345 6789',
            phoneNormalized: '56223456789',
            email: 'facturacion@losandes.cl',
            emailNormalized: 'facturacion@losandes.cl',
            address: 'Parque Industrial 789, San Bernardo',
            notes: 'Cliente corporativo con compras recurrentes.',
            active: true,
            createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'cust-4',
            businessId: 'primary-business',
            name: 'Patricio',
            lastName: 'Araya',
            documentType: 'RUT',
            documentNumber: '9.876.543-1',
            documentNormalized: '98765431',
            phone: null,
            email: null,
            address: null,
            notes: null,
            active: false,
            createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ];
        localStorage.setItem('sevenpos-dev-customers', JSON.stringify(customers));

        // Sales Seed for Customers
        const sales = [
          {
            id: 'sale-1',
            businessId: 'primary-business',
            saleNumber: 'V-000101',
            saleSequence: 101,
            status: 'COMPLETED',
            subtotal: 5700,
            discountTotal: 0,
            taxTotal: 0,
            total: 5700,
            costTotalSnapshot: 3800,
            costQuality: 'COMPLETE',
            profitMinorSnapshot: 1900,
            currencyCode: 'CLP',
            customerId: 'cust-1',
            customerNameSnapshot: 'Carolina Valenzuela',
            userId: 'primary-user',
            userNameSnapshot: 'José Pérez',
            cashSessionId: 'session-1',
            cashRegisterId: 'reg-1',
            completedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
            createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
          },
          {
            id: 'sale-2',
            businessId: 'primary-business',
            saleNumber: 'V-000102',
            saleSequence: 102,
            status: 'COMPLETED',
            subtotal: 9000,
            discountTotal: 0,
            taxTotal: 0,
            total: 9000,
            costTotalSnapshot: 6000,
            costQuality: 'COMPLETE',
            profitMinorSnapshot: 3000,
            currencyCode: 'CLP',
            customerId: 'cust-1',
            customerNameSnapshot: 'Carolina Valenzuela',
            userId: 'primary-user',
            userNameSnapshot: 'José Pérez',
            cashSessionId: 'session-1',
            cashRegisterId: 'reg-1',
            completedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
            createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          },
          {
            id: 'sale-3',
            businessId: 'primary-business',
            saleNumber: 'V-000103',
            saleSequence: 103,
            status: 'COMPLETED',
            subtotal: 4200,
            discountTotal: 0,
            taxTotal: 0,
            total: 4200,
            costTotalSnapshot: 2800,
            costQuality: 'COMPLETE',
            profitMinorSnapshot: 1400,
            currencyCode: 'CLP',
            customerId: 'cust-2',
            customerNameSnapshot: 'Roberto Muñoz',
            userId: 'primary-user',
            userNameSnapshot: 'José Pérez',
            cashSessionId: 'session-1',
            cashRegisterId: 'reg-1',
            completedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          }
        ];
        localStorage.setItem('sevenpos-dev-sales', JSON.stringify(sales));
      }, vaultData);
    };

    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('sevenpos-theme', 'dark');
    });

    // 1. Customers List Page (1440x900 Dark)
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/customers`, { waitUntil: 'networkidle0' });
    await setupAuthAndData();
    await page.goto(`${BASE_URL}/customers`, { waitUntil: 'networkidle0' });
    await wait(1000);
    await saveScreenshot(page, 'ag09-01-customers-list-1440-dark.png');

    // 2. Customers List Page (1440x900 Light)
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      localStorage.setItem('sevenpos-theme', 'light');
    });
    await wait(400);
    await saveScreenshot(page, 'ag09-02-customers-list-1440-light.png');

    // 3. Customers List Page (390x844 Dark Mobile)
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('sevenpos-theme', 'dark');
    });
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(`${BASE_URL}/customers`, { waitUntil: 'networkidle0' });
    await wait(800);
    await saveScreenshot(page, 'ag09-03-customers-list-390-dark.png');

    // 4. Customer Modal - Create (1440x900 Dark)
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/customers`, { waitUntil: 'networkidle0' });
    await wait(800);
    const newCustBtn = await page.$('button ::-p-text(Nuevo cliente)');
    if (newCustBtn) await newCustBtn.click();
    await wait(600);
    await saveScreenshot(page, 'ag09-04-customer-modal-create-1440-dark.png');

    // 5. Customer Modal - Duplicate Detection Warning (1440x900 Dark)
    const nameInput = await page.$('input[placeholder="Ej. Juan"]');
    if (nameInput) await nameInput.type('Carolina Andrea');
    const lastNameInput = await page.$('input[placeholder="Ej. Pérez"]');
    if (lastNameInput) await lastNameInput.type('Valenzuela');
    const docInput = await page.$('input[placeholder="Ej. 12.345.678-9 / NIT"]');
    if (docInput) await docInput.type('15.432.890-K');
    const phoneInput = await page.$('input[placeholder="Ej. +56 9 1234 5678"]');
    if (phoneInput) await phoneInput.type('+56 9 8765 4321');
    
    // Click Crear Cliente to trigger duplicate warnings
    const createSubmitBtn = await page.$('button ::-p-text(Crear Cliente)');
    if (createSubmitBtn) await createSubmitBtn.click();
    await wait(800);
    await saveScreenshot(page, 'ag09-05-customer-modal-duplicate-warning-1440-dark.png');

    // Close modal
    const cancelBtn = await page.$('button ::-p-text(Cancelar)');
    if (cancelBtn) await cancelBtn.click();
    await wait(400);

    // 6. Customer Detail Page (1440x900 Dark)
    // Click on Carolina Valenzuela "Detalle" button
    const detailButtons = await page.$$('button ::-p-text(Detalle)');
    if (detailButtons.length > 0) {
      await detailButtons[0].click();
      await wait(1000);
    }
    await saveScreenshot(page, 'ag09-06-customer-detail-1440-dark.png');

    // 7. Customer Detail Page (1440x900 Light)
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      localStorage.setItem('sevenpos-theme', 'light');
    });
    await wait(400);
    await saveScreenshot(page, 'ag09-07-customer-detail-1440-light.png');

    // 8. POS Screen with Customer Selector Modal (1440x900 Dark)
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('sevenpos-theme', 'dark');
    });
    await page.goto(`${BASE_URL}/pos`, { waitUntil: 'networkidle0' });
    await wait(1000);
    // Click Customer selection button in POS Cart Panel
    const custSelectBtn = await page.$('button ::-p-text(Consumidor final)');
    if (custSelectBtn) await custSelectBtn.click();
    await wait(600);
    await saveScreenshot(page, 'ag09-08-pos-customer-selector-modal-1440-dark.png');

    // 9. POS Screen with Quick Create Customer Modal (1440x900 Dark)
    const quickCreateBtn = await page.$('button ::-p-text(Nuevo cliente)');
    if (quickCreateBtn) await quickCreateBtn.click();
    await wait(600);
    await saveScreenshot(page, 'ag09-09-pos-quick-create-modal-1440-dark.png');

    // Close quick create and assign customer
    const closeBtn = await page.$('button ::-p-text(Cancelar)');
    if (closeBtn) await closeBtn.click();
    await wait(400);

    // Select Carolina Valenzuela
    const selectCust1 = await page.$('div ::-p-text(Carolina Valenzuela)');
    if (selectCust1) await selectCust1.click();
    await wait(400);

    // Add a product to cart
    const prodCard = await page.$('div ::-p-text(Coca Cola 1.5L)');
    if (prodCard) await prodCard.click();
    await wait(500);
    await saveScreenshot(page, 'ag09-10-pos-cart-with-customer-1440-dark.png');

    // 11. Auth Hotfix - PIN Login page with new links
    await page.evaluate(() => {
      sessionStorage.removeItem('sevenpos_ephemeral_session');
      localStorage.setItem('sevenpos-session-status', 'locked');
      localStorage.setItem('sevenpos_session_status', 'locked');
    });
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await wait(800);
    await saveScreenshot(page, 'ag09-11-auth-login-with-hotfix-links-1440-dark.png');

    // 12. Auth Hotfix - Register / Welcome page with new login link
    await page.evaluate(() => {
      localStorage.removeItem('sevenpos-dev-business');
      localStorage.removeItem('sevenpos-dev-businesses');
      localStorage.removeItem('sevenpos-dev-users');
      localStorage.setItem('sevenpos-onboarding-status', 'not_started');
    });
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle0' });
    await wait(800);
    await saveScreenshot(page, 'ag09-12-auth-register-with-hotfix-links-1440-dark.png');

    console.log('All AG-09 screenshots successfully captured!');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
