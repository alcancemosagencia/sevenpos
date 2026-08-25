import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.resolve(__dirname, '..');

const BASE_URL = 'http://localhost:5175';

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Set LocalStorage state for completed onboarding & authenticated session
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

  await page.evaluate(() => {
    const onboardingData = {
      countryCode: 'CL',
      businessInfo: {
        name: 'Minimarket Don Pepe',
        type: 'minimarket',
        commercialAddress: 'Av. Libertador 1234',
        rut: '76.123.456-7',
      },
      ownerInfo: {
        fullName: 'José Pérez',
        email: 'pepe@minimarket.cl',
        phone: '+56912345678',
      },
      regionalSettings: {
        countryCode: 'CL',
        primaryCurrencyCode: 'CLP',
        taxRate: 19,
        timezone: 'America/Santiago',
      },
      initialInventoryConfig: {
        preset: 'minimarket',
        createSampleProducts: true,
      },
      security: {
        pin: '1234',
      },
      status: 'completed',
    };

    localStorage.setItem('sevenpos-onboarding-v1', JSON.stringify(onboardingData));
    localStorage.setItem('sevenpos_session_status', 'unlocked');
    localStorage.setItem('sevenpos-theme', 'dark');
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  });

  // Reload to dashboard
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1000));

  // 1. Create a couple of products in Catalog if needed
  // Click on Catálogo -> Productos
  await page.evaluate(() => {
    // Navigate to products
    const navItems = Array.from(document.querySelectorAll('button, a'));
    const catItem = navItems.find((el) => el.textContent.includes('Productos') || el.textContent.includes('Catálogo'));
    if (catItem) catItem.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  // Navigate to Existencias (Inventory)
  await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
    const invItem = navItems.find((el) => el.textContent.includes('Existencias') || el.textContent.includes('Inventario'));
    if (invItem) invItem.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  // Screenshot 1: ag05-01-dark-1440-inventory-empty
  await page.screenshot({
    path: path.join(outputDir, 'ag05-01-dark-1440-inventory-empty.png'),
    fullPage: false,
  });
  console.log('Captured 1/17: ag05-01-dark-1440-inventory-empty.png');

  // Screenshot 2: Click "+ Agregar inventario"
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const addBtn = btns.find((b) => b.textContent.includes('Agregar inventario') || b.textContent.includes('+ Agregar'));
    if (addBtn) addBtn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  await page.screenshot({
    path: path.join(outputDir, 'ag05-02-dark-1440-add-inventory-modal.png'),
    fullPage: false,
  });
  console.log('Captured 2/17: ag05-02-dark-1440-add-inventory-modal.png');

  // Screenshot 3: Open Lot & Expiration accordion in Add Modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const lotToggle = btns.find((b) => b.textContent.includes('lote') || b.textContent.includes('vencimiento'));
    if (lotToggle) lotToggle.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  await page.screenshot({
    path: path.join(outputDir, 'ag05-03-dark-1440-add-with-lot.png'),
    fullPage: false,
  });
  console.log('Captured 3/17: ag05-03-dark-1440-add-with-lot.png');

  // Fill in and submit an entry with lot
  await page.evaluate(() => {
    // Select first product in autocomplete
    const searchInput = document.querySelector('input[placeholder*="Buscar por nombre"]');
    if (searchInput) {
      searchInput.click();
    }
  });
  await new Promise((r) => setTimeout(r, 500));

  await page.evaluate(() => {
    const options = Array.from(document.querySelectorAll('div[class*="cursor-pointer"]'));
    if (options.length > 0) options[0].click();
  });
  await new Promise((r) => setTimeout(r, 400));

  // Type quantity 20, unit cost 1200, lot LOT-2026-A, expiration 2026-12-31
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const qtyInput = inputs.find((i) => i.placeholder === '0.00' || i.placeholder === '0');
    if (qtyInput) {
      qtyInput.value = '20';
      qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
      qtyInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const costInput = inputs.find((i) => i.placeholder && i.placeholder.includes('1200'));
    if (costInput) {
      costInput.value = '1200';
      costInput.dispatchEvent(new Event('input', { bubbles: true }));
      costInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const lotInput = inputs.find((i) => i.placeholder && i.placeholder.includes('LOTE-2026'));
    if (lotInput) {
      lotInput.value = 'LOT-2026-A';
      lotInput.dispatchEvent(new Event('input', { bubbles: true }));
      lotInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const dateInput = inputs.find((i) => i.type === 'date');
    if (dateInput) {
      dateInput.value = '2026-12-31';
      dateInput.dispatchEvent(new Event('input', { bubbles: true }));
      dateInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Submit
    const submitBtn = Array.from(document.querySelectorAll('button')).find((b) => b.type === 'submit' || b.textContent.includes('Guardar'));
    if (submitBtn) submitBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  // Add another entry for a second product (e.g. 5 units at 2500)
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const addBtn = btns.find((b) => b.textContent.includes('Agregar inventario') || b.textContent.includes('+ Agregar'));
    if (addBtn) addBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  await page.evaluate(() => {
    const searchInput = document.querySelector('input[placeholder*="Buscar por nombre"]');
    if (searchInput) searchInput.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  await page.evaluate(() => {
    const options = Array.from(document.querySelectorAll('div[class*="cursor-pointer"]'));
    if (options.length > 1) options[1].click();
    else if (options.length > 0) options[0].click();
  });
  await new Promise((r) => setTimeout(r, 400));

  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const qtyInput = inputs.find((i) => i.placeholder === '0.00' || i.placeholder === '0');
    if (qtyInput) {
      qtyInput.value = '5';
      qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
      qtyInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const costInput = inputs.find((i) => i.placeholder && i.placeholder.includes('1200'));
    if (costInput) {
      costInput.value = '2500';
      costInput.dispatchEvent(new Event('input', { bubbles: true }));
      costInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const submitBtn = Array.from(document.querySelectorAll('button')).find((b) => b.type === 'submit' || b.textContent.includes('Guardar'));
    if (submitBtn) submitBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  // Screenshot 4: Populated inventory table
  await page.screenshot({
    path: path.join(outputDir, 'ag05-04-dark-1440-inventory-table-populated.png'),
    fullPage: false,
  });
  console.log('Captured 4/17: ag05-04-dark-1440-inventory-table-populated.png');

  // Screenshot 5: Adjust Modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const adjBtn = btns.find((b) => b.textContent.includes('Ajustar inventario') || b.textContent.includes('Ajustar'));
    if (adjBtn) adjBtn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  await page.evaluate(() => {
    const searchInput = document.querySelector('input[placeholder*="Buscar por nombre"]');
    if (searchInput) searchInput.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  await page.evaluate(() => {
    const options = Array.from(document.querySelectorAll('div[class*="cursor-pointer"]'));
    if (options.length > 0) options[0].click();
  });
  await new Promise((r) => setTimeout(r, 400));

  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const countInput = inputs.find((i) => i.placeholder === '0.00' || i.placeholder === '0' || i.value === '20');
    if (countInput) {
      countInput.value = '18';
      countInput.dispatchEvent(new Event('input', { bubbles: true }));
      countInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise((r) => setTimeout(r, 500));

  await page.screenshot({
    path: path.join(outputDir, 'ag05-05-dark-1440-adjust-modal.png'),
    fullPage: false,
  });
  console.log('Captured 5/17: ag05-05-dark-1440-adjust-modal.png');

  // Close adjust modal without submitting or submit
  await page.evaluate(() => {
    const submitBtn = Array.from(document.querySelectorAll('button')).find((b) => b.type === 'submit' || b.textContent.includes('Aplicar'));
    if (submitBtn) submitBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  // Screenshot 6: Waste Modal
  // Find row with stock and click Merma (or three dots action)
  await page.evaluate(() => {
    const rowWasteBtns = Array.from(document.querySelectorAll('button[title*="merma"], button[title*="Merma"], button'));
    const wasteBtn = rowWasteBtns.find((b) => b.textContent.includes('Merma') || b.title?.includes('Merma') || b.title?.includes('merma'));
    if (wasteBtn) wasteBtn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  await page.screenshot({
    path: path.join(outputDir, 'ag05-06-dark-1440-waste-modal.png'),
    fullPage: false,
  });
  console.log('Captured 6/17: ag05-06-dark-1440-waste-modal.png');

  // Close waste modal
  await page.evaluate(() => {
    const cancelBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Cancelar') || b.querySelector('svg.lucide-x'));
    if (cancelBtn) cancelBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  // Screenshot 7: Product Inventory Detail
  await page.evaluate(() => {
    const detailLinks = Array.from(document.querySelectorAll('button[title*="Ver detalle"], button[title*="detalle"], button'));
    const detBtn = detailLinks.find((b) => b.title?.includes('detalle') || b.title?.includes('Detalle'));
    if (detBtn) detBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  await page.screenshot({
    path: path.join(outputDir, 'ag05-07-dark-1440-product-inventory-detail.png'),
    fullPage: false,
  });
  console.log('Captured 7/17: ag05-07-dark-1440-product-inventory-detail.png');

  // Screenshot 8: Movements Ledger
  await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
    const movItem = navItems.find((el) => el.textContent.includes('Movimientos'));
    if (movItem) movItem.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  await page.screenshot({
    path: path.join(outputDir, 'ag05-08-dark-1440-movements-ledger.png'),
    fullPage: false,
  });
  console.log('Captured 8/17: ag05-08-dark-1440-movements-ledger.png');

  // Toggle to Light Mode
  await page.evaluate(() => {
    localStorage.setItem('sevenpos-theme', 'light');
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  });
  await new Promise((r) => setTimeout(r, 500));

  // Screenshot 9: Light mode inventory table
  await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
    const invItem = navItems.find((el) => el.textContent.includes('Existencias'));
    if (invItem) invItem.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  await page.screenshot({
    path: path.join(outputDir, 'ag05-09-light-1440-inventory-table.png'),
    fullPage: false,
  });
  console.log('Captured 9/17: ag05-09-light-1440-inventory-table.png');

  // Screenshot 10: Light mode product detail
  await page.evaluate(() => {
    const detBtn = Array.from(document.querySelectorAll('button')).find((b) => b.title?.includes('detalle') || b.title?.includes('Detalle'));
    if (detBtn) detBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  await page.screenshot({
    path: path.join(outputDir, 'ag05-10-light-1440-product-inventory-detail.png'),
    fullPage: false,
  });
  console.log('Captured 10/17: ag05-10-light-1440-product-inventory-detail.png');

  // Screenshot 11: Light mode movements ledger
  await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
    const movItem = navItems.find((el) => el.textContent.includes('Movimientos'));
    if (movItem) movItem.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  await page.screenshot({
    path: path.join(outputDir, 'ag05-11-light-1440-movements-ledger.png'),
    fullPage: false,
  });
  console.log('Captured 11/17: ag05-11-light-1440-movements-ledger.png');

  // Switch back to Dark Mode for Mobile series
  await page.evaluate(() => {
    localStorage.setItem('sevenpos-theme', 'dark');
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  });

  // Mobile Viewport 390x844
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  // Screenshot 12: Mobile inventory cards
  await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
    const invItem = navItems.find((el) => el.textContent.includes('Existencias') || el.textContent.includes('Inventario'));
    if (invItem) invItem.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  await page.screenshot({
    path: path.join(outputDir, 'ag05-12-mobile-390-inventory-cards.png'),
    fullPage: false,
  });
  console.log('Captured 12/17: ag05-12-mobile-390-inventory-cards.png');

  // Screenshot 13: Mobile add modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const addBtn = btns.find((b) => b.textContent.includes('Agregar') || b.textContent.includes('+'));
    if (addBtn) addBtn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  await page.screenshot({
    path: path.join(outputDir, 'ag05-13-mobile-390-add-modal.png'),
    fullPage: false,
  });
  console.log('Captured 13/17: ag05-13-mobile-390-add-modal.png');

  // Close modal
  await page.evaluate(() => {
    const cancelBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Cancelar') || b.querySelector('svg.lucide-x'));
    if (cancelBtn) cancelBtn.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // Screenshot 14: Mobile adjust modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const adjBtn = btns.find((b) => b.textContent.includes('Ajustar'));
    if (adjBtn) adjBtn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  await page.screenshot({
    path: path.join(outputDir, 'ag05-14-mobile-390-adjust-modal.png'),
    fullPage: false,
  });
  console.log('Captured 14/17: ag05-14-mobile-390-adjust-modal.png');

  // Close adjust modal
  await page.evaluate(() => {
    const cancelBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Cancelar') || b.querySelector('svg.lucide-x'));
    if (cancelBtn) cancelBtn.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // Screenshot 15: Mobile waste modal
  await page.evaluate(() => {
    const cardWasteBtns = Array.from(document.querySelectorAll('button'));
    const wasteBtn = cardWasteBtns.find((b) => b.textContent.includes('Merma'));
    if (wasteBtn) wasteBtn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  await page.screenshot({
    path: path.join(outputDir, 'ag05-15-mobile-390-waste-modal.png'),
    fullPage: false,
  });
  console.log('Captured 15/17: ag05-15-mobile-390-waste-modal.png');

  // Close waste modal
  await page.evaluate(() => {
    const cancelBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Cancelar') || b.querySelector('svg.lucide-x'));
    if (cancelBtn) cancelBtn.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // Screenshot 16: Mobile product detail
  await page.evaluate(() => {
    const detBtns = Array.from(document.querySelectorAll('button'));
    const detBtn = detBtns.find((b) => b.textContent.includes('Ver detalle') || b.title?.includes('detalle'));
    if (detBtn) detBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  await page.screenshot({
    path: path.join(outputDir, 'ag05-16-mobile-390-product-detail.png'),
    fullPage: false,
  });
  console.log('Captured 16/17: ag05-16-mobile-390-product-detail.png');

  // Screenshot 17: Dashboard low stock KPI (Desktop 1440x900)
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
    const dashItem = navItems.find((el) => el.textContent.includes('Panel') || el.textContent.includes('Dashboard'));
    if (dashItem) dashItem.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  await page.screenshot({
    path: path.join(outputDir, 'ag05-17-dashboard-low-stock-kpi.png'),
    fullPage: false,
  });
  console.log('Captured 17/17: ag05-17-dashboard-low-stock-kpi.png');

  await browser.close();
  console.log('All 17 screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
