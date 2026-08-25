import puppeteer from 'puppeteer';
import path from 'path';

const outputDir = 'C:/Users/Omar/.gemini/antigravity/brain/d41eeea8-12ee-409b-85b2-40fcb3462ea5';
const BASE_URL = 'http://127.0.0.1:4173';

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Set LocalStorage & SessionStorage state
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 400));

  await page.evaluate(() => {
    const onboardingState = {
      onboardingStatus: 'completed',
      sessionStatus: 'unlocked',
      currentStep: 1,
      countryCode: 'CL',
      business: {
        name: 'Minimarket Don Pepe',
        fiscalId: '76.123.456-7',
        phone: '912345678',
        phonePrefix: '+56',
        address: 'Av. Libertador 1234',
      },
      regionalSettings: {
        primaryCurrencyCode: 'CLP',
        enableSecondaryUSD: false,
      },
      owner: {
        firstName: 'José',
        lastName: 'Pérez',
        email: 'pepe@minimarket.cl',
        role: 'Dueño',
      },
    };

    const sampleCustomers = [
      {
        id: 'cust-1',
        businessId: 'primary-business',
        name: 'Carolina Valenzuela',
        documentType: 'RUT',
        documentNumber: '15.489.123-K',
        documentNormalized: '15489123K',
        phone: '+56 9 8765 4321',
        phoneNormalized: '56987654321',
        email: 'carolina.v@gmail.com',
        emailNormalized: 'carolina.v@gmail.com',
        address: 'Av. Las Condes 9820, Depto 402',
        notes: 'Cliente frecuente',
        active: true,
        salesCount: 14,
        totalSpent: 184500,
        lastPurchaseAt: '2026-08-24T18:30:00.000Z',
        createdAt: '2026-06-15T10:00:00.000Z',
        updatedAt: '2026-08-24T18:30:00.000Z',
      },
      {
        id: 'cust-2',
        businessId: 'primary-business',
        name: 'Esteban Morales',
        documentType: 'RUT',
        documentNumber: '18.234.567-8',
        documentNormalized: '182345678',
        phone: '+56 9 7654 3210',
        phoneNormalized: '56976543210',
        email: 'esteban.m@empresa.cl',
        emailNormalized: 'esteban.m@empresa.cl',
        address: 'Providencia 1420',
        notes: null,
        active: true,
        salesCount: 6,
        totalSpent: 72400,
        lastPurchaseAt: '2026-08-22T14:15:00.000Z',
        createdAt: '2026-07-01T12:00:00.000Z',
        updatedAt: '2026-08-22T14:15:00.000Z',
      },
      {
        id: 'cust-3',
        businessId: 'primary-business',
        name: 'Roberto Muñoz',
        documentType: 'RUT',
        documentNumber: '12.987.654-3',
        documentNormalized: '129876543',
        phone: null,
        phoneNormalized: null,
        email: null,
        emailNormalized: null,
        address: null,
        notes: null,
        active: true,
        salesCount: 2,
        totalSpent: 15000,
        lastPurchaseAt: '2026-08-10T11:00:00.000Z',
        createdAt: '2026-08-01T09:00:00.000Z',
        updatedAt: '2026-08-10T11:00:00.000Z',
      },
    ];

    const sampleProducts = [
      {
        id: 'prod-1',
        businessId: 'primary-business',
        categoryId: null,
        name: 'Bebida Cola 1.5L',
        description: null,
        baseUnit: 'UNIT',
        price: 3170,
        cost: 2000,
        sku: 'BEB-COLA-15',
        barcode: '780123456789',
        hasPresentations: false,
        allowFractional: false,
        trackInventory: true,
        isFeatured: true,
        active: true,
        createdAt: '2026-06-15T10:00:00.000Z',
        updatedAt: '2026-06-15T10:00:00.000Z',
      },
      {
        id: 'prod-2',
        businessId: 'primary-business',
        categoryId: null,
        name: 'Café Grano 250g',
        description: null,
        baseUnit: 'UNIT',
        price: 3190,
        cost: 1800,
        sku: 'CAF-GRA-250',
        barcode: '780987654321',
        hasPresentations: false,
        allowFractional: false,
        trackInventory: true,
        isFeatured: true,
        active: true,
        createdAt: '2026-06-15T10:00:00.000Z',
        updatedAt: '2026-06-15T10:00:00.000Z',
      },
    ];

    const sampleSales = [
      {
        id: 'sale-001',
        businessId: 'primary-business',
        saleNumber: 'V-000008',
        saleSequence: 8,
        status: 'COMPLETED',
        subtotal: 15850,
        discountTotal: 0,
        taxTotal: 0,
        total: 15850,
        currencyCode: 'CLP',
        customerId: 'cust-1',
        customerNameSnapshot: 'Carolina Valenzuela',
        idempotencyKey: 'idem-1',
        createdByUserId: 'user-1',
        createdByNameSnapshot: 'José Pérez',
        cashSessionId: 'session-1',
        completedAt: '2026-08-24T18:30:00.000Z',
        createdAt: '2026-08-24T18:30:00.000Z',
      },
    ];

    const sampleItems = [
      {
        id: 'item-1',
        businessId: 'primary-business',
        saleId: 'sale-001',
        productId: 'prod-1',
        productNameSnapshot: 'Bebida Cola 1.5L',
        presentationId: null,
        presentationNameSnapshot: null,
        baseUnit: 'UNIT',
        presentationFactor: 1000,
        quantity: 5000,
        inventoryQuantityDelta: -5000,
        unitPrice: 3170,
        discountTotal: 0,
        lineTotal: 15850,
        costQualitySnapshot: 'REAL',
        createdAt: '2026-08-24T18:30:00.000Z',
      },
    ];

    const samplePayments = [
      {
        id: 'pay-1',
        businessId: 'primary-business',
        saleId: 'sale-001',
        paymentMethodId: 'pm-cash',
        paymentMethodCode: 'CASH',
        paymentMethodNameSnapshot: 'Efectivo',
        amount: 15850,
        currencyCode: 'CLP',
        receivedAmount: 20000,
        changeAmount: 4150,
        createdAt: '2026-08-24T18:30:00.000Z',
      },
    ];

    localStorage.setItem('sevenpos-onboarding-state', JSON.stringify(onboardingState));
    localStorage.setItem('sevenpos-dev-customers', JSON.stringify(sampleCustomers));
    localStorage.setItem('sevenpos-dev-products', JSON.stringify(sampleProducts));
    localStorage.setItem('sevenpos-dev-sales', JSON.stringify(sampleSales));
    localStorage.setItem('sevenpos-dev-sale-items', JSON.stringify(sampleItems));
    localStorage.setItem('sevenpos-dev-sale-payments', JSON.stringify(samplePayments));
    localStorage.setItem('sevenpos-theme', 'dark');
    sessionStorage.setItem('sevenpos_ephemeral_session', JSON.stringify({ status: 'unlocked' }));
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  });

  // Reload to hydrate
  await page.reload({ waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1200));

  // 1. Customers List (No avatars)
  await page.goto(`${BASE_URL}/customers`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({
    path: path.join(outputDir, 'ag09a-05-customers-list-no-avatars-1440-dark.png'),
    fullPage: false,
  });
  console.log('Saved ag09a-05');

  // 2. Customer Detail (No avatar)
  const customerRow = await page.$('table tbody tr');
  if (customerRow) {
    await customerRow.click();
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({
      path: path.join(outputDir, 'ag09a-06-customer-detail-no-avatar-1440-dark.png'),
      fullPage: false,
    });
    console.log('Saved ag09a-06');
  }

  // 3. POS Customer Selector (No avatar)
  await page.goto(`${BASE_URL}/pos`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1200));

  const allButtons = await page.$$('button');
  for (const b of allButtons) {
    const text = await page.evaluate((el) => el.textContent, b);
    if (text && text.includes('Consumidor final')) {
      await b.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({
    path: path.join(outputDir, 'ag09a-07-pos-customer-selector-no-avatar-1440-dark.png'),
    fullPage: false,
  });
  console.log('Saved ag09a-07');

  // 4. Sales History & Historical Reprint (ag09a-01, ag09a-04, ag09a-02)
  await page.goto(`${BASE_URL}/sales`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1000));

  const salesButtons = await page.$$('button');
  for (const b of salesButtons) {
    const text = await page.evaluate((el) => el.textContent, b);
    if (text && text.includes('Comprobante')) {
      await b.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 800));

  // ag09a-01 & ag09a-04: Receipt Modal Preview in Dark Mode
  await page.screenshot({
    path: path.join(outputDir, 'ag09a-01-receipt-modal-1440-dark.png'),
    fullPage: false,
  });
  console.log('Saved ag09a-01');

  await page.screenshot({
    path: path.join(outputDir, 'ag09a-04-historical-reprint.png'),
    fullPage: false,
  });
  console.log('Saved ag09a-04');

  // ag09a-02: Isolated Print Preview (Emulating print media on receipt modal)
  await page.emulateMediaType('print');
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({
    path: path.join(outputDir, 'ag09a-02-print-preview-clean.png'),
    fullPage: false,
  });
  console.log('Saved ag09a-02');
  await page.emulateMediaType('screen');

  await browser.close();
  console.log('ALL AG-09A screenshots captured successfully.');
}

run().catch(console.error);
