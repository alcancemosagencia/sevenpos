import puppeteer from 'puppeteer';

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

async function runSessionReloadVerification() {
  console.log('--- STARTING SESSION RELOAD VERIFICATION ---');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  const salt = 'sevenpos-salt-owner';
  const hash = await sha256Hex(`${salt}:1234`);

  // Initial load to access context
  await page.goto('http://127.0.0.1:5175', { waitUntil: 'domcontentloaded' });
  await wait(600);

  // Seed domain state once
  await page.evaluate((vaultData) => {
    localStorage.clear();
    sessionStorage.clear();

    const business = {
      id: 'primary-business',
      name: 'Minimarket Don Pepe',
      countryCode: 'CL',
      fiscalId: '76.123.456-7',
      phone: '912345678',
      phonePrefix: '+56',
      address: 'Av. Providencia 1234, Santiago',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const settings = {
      id: 'settings-1',
      businessId: 'primary-business',
      countryCode: 'CL',
      primaryCurrency: 'CLP',
      defaultTaxRate: 19,
      updatedAt: new Date().toISOString(),
    };
    const owner = {
      id: 'primary-user',
      businessId: 'primary-business',
      firstName: 'José',
      lastName: 'Pérez',
      email: 'jose@donpepe.cl',
      role: 'OWNER',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem('sevenpos-dev-business', JSON.stringify(business));
    localStorage.setItem('sevenpos-dev-settings', JSON.stringify(settings));
    localStorage.setItem('sevenpos-dev-users', JSON.stringify([owner]));
    localStorage.setItem('sevenpos-dev-vault:primary-user', JSON.stringify(vaultData));
  }, { hash, salt });

  // 1. Initial fresh boot -> Should show PIN Login (/login)
  await page.goto('http://127.0.0.1:5175', { waitUntil: 'domcontentloaded' });
  await wait(1000);
  console.log('[TEST 1] Initial fresh load URL:', page.url());
  if (!page.url().includes('/login')) {
    throw new Error(`[TEST 1] Expected /login on fresh load, got: ${page.url()}`);
  }
  console.log('✅ PASS: Fresh process starts locked at /login.');

  // 2. Unlock with PIN 1234
  console.log('[TEST 2] Entering PIN 1234...');
  for (const digit of ['1', '2', '3', '4']) {
    await page.click(`button[aria-label="Número ${digit}"]`);
    await wait(150);
  }
  await wait(1500);
  console.log('[TEST 2] After unlock URL:', page.url());
  if (!page.url().includes('/dashboard')) {
    throw new Error(`[TEST 2] Expected /dashboard after PIN unlock, got: ${page.url()}`);
  }
  console.log('✅ PASS: Successfully unlocked and navigated to /dashboard.');

  // 3. F5 Reload on /dashboard
  console.log('[TEST 3] Performing F5 reload on /dashboard...');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await wait(1200);
  console.log('[TEST 3] After reload URL:', page.url());
  if (!page.url().includes('/dashboard')) {
    throw new Error(`[TEST 3] Expected /dashboard to survive reload, got: ${page.url()}`);
  }
  console.log('✅ PASS: /dashboard survived reload without prompting for PIN.');

  // 4. Navigate to /inventory and reload
  console.log('[TEST 4] Navigating to /inventory...');
  await page.goto('http://127.0.0.1:5175/inventory', { waitUntil: 'domcontentloaded' });
  await wait(1200);
  console.log('[TEST 4] Current URL on /inventory:', page.url());
  console.log('[TEST 4] Performing F5 reload on /inventory...');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await wait(1200);
  console.log('[TEST 4] After reload URL:', page.url());
  if (!page.url().includes('/inventory')) {
    throw new Error(`[TEST 4] Expected /inventory to survive reload, got: ${page.url()}`);
  }
  console.log('✅ PASS: /inventory survived reload without prompting for PIN and preserved route.');

  // 5. Navigate to /inventory/movements and reload
  console.log('[TEST 5] Navigating to /inventory/movements...');
  await page.goto('http://127.0.0.1:5175/inventory/movements', { waitUntil: 'domcontentloaded' });
  await wait(1200);
  console.log('[TEST 5] Current URL on movements:', page.url());
  console.log('[TEST 5] Performing F5 reload on /inventory/movements...');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await wait(1200);
  console.log('[TEST 5] After reload URL:', page.url());
  if (!page.url().includes('/inventory/movements')) {
    throw new Error(`[TEST 5] Expected /inventory/movements to survive reload, got: ${page.url()}`);
  }
  console.log('✅ PASS: /inventory/movements survived reload and preserved deep link.');

  // 6. Navigate to /catalog/products and reload
  console.log('[TEST 6] Navigating to /catalog/products...');
  await page.goto('http://127.0.0.1:5175/catalog/products', { waitUntil: 'domcontentloaded' });
  await wait(1200);
  console.log('[TEST 6] Current URL on products:', page.url());
  console.log('[TEST 6] Performing F5 reload on /catalog/products...');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await wait(1200);
  console.log('[TEST 6] After reload URL:', page.url());
  if (!page.url().includes('/catalog/products')) {
    throw new Error(`[TEST 6] Expected /catalog/products to survive reload, got: ${page.url()}`);
  }
  console.log('✅ PASS: /catalog/products survived reload and preserved route.');

  // 7. Logout test
  console.log('[TEST 7] Testing Logout...');
  await page.evaluate(() => {
    const logoutBtn = Array.from(document.querySelectorAll('button, a')).find(b => b.textContent?.includes('Cerrar sesión'));
    if (logoutBtn) logoutBtn.click();
  });
  await wait(1500);
  console.log('[TEST 7] URL after logout click:', page.url());
  if (!page.url().includes('/login')) {
    throw new Error(`[TEST 7] Expected /login after logout, got: ${page.url()}`);
  }

  // F5 reload on /login after logout
  console.log('[TEST 7] Performing F5 reload on /login after logout...');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await wait(1200);
  console.log('[TEST 7] After reload URL:', page.url());
  if (!page.url().includes('/login')) {
    throw new Error(`[TEST 7] Expected /login to persist after logout reload, got: ${page.url()}`);
  }
  console.log('✅ PASS: Logout cleared session and /login persists on reload.');

  await browser.close();
  console.log('🎉 ALL 7 SESSION RELOAD & ROUTE PRESERVATION VERIFICATION TESTS PASSED!');
}

runSessionReloadVerification().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
