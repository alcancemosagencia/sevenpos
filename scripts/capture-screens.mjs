import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const screenshotsDir = path.resolve(projectRoot, 'docs', 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function run() {
  console.log('Starting preview server for screenshots...');
  const previewProcess = spawn('npm', ['run', 'preview', '--', '--port', '4173'], {
    cwd: projectRoot,
    shell: true,
    stdio: 'pipe',
  });

  // Wait for preview server to be available
  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const baseUrl = 'http://localhost:4173';

  // Helper to set state via localStorage directly
  async function setState(page, stateObj, theme = 'dark') {
    await page.evaluate(({ stateObj, theme }) => {
      localStorage.setItem('sevenpos-onboarding-state', JSON.stringify(stateObj));
      localStorage.setItem('sevenpos-theme-preference', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    }, { stateObj, theme });
  }

  try {
    const page = await browser.newPage();

    // 1. Dark 1440 - Welcome (Paso 1) con Theme Toggle
    console.log('Capturing 1. Dark 1440 - Welcome con Theme Toggle...');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(baseUrl);
    await setState(page, {
      onboardingStatus: 'incomplete',
      sessionStatus: 'locked',
      currentStep: 1,
      countryCode: 'CL',
      business: { name: '', fiscalId: '', phone: '', phonePrefix: '+56', address: '' },
      regionalSettings: { primaryCurrencyCode: 'CLP', enableSecondaryUSD: false },
      owner: { firstName: '', lastName: '', email: '', role: 'Dueño' },
    }, 'dark');
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(screenshotsDir, '01-dark-1440-welcome.png') });

    // 2. Dark 1440 - Owner & PIN (Paso 5) con Render Aumentado
    console.log('Capturing 2. Dark 1440 - Owner & PIN con Render Aumentado...');
    await setState(page, {
      onboardingStatus: 'incomplete',
      sessionStatus: 'locked',
      currentStep: 5,
      countryCode: 'CL',
      business: { name: 'Minimarket Los Andes', fiscalId: '76.890.123-4', phone: '9 8765 4321', phonePrefix: '+56', address: 'Av. Providencia #1420' },
      regionalSettings: { primaryCurrencyCode: 'CLP', enableSecondaryUSD: false },
      owner: { firstName: 'Omar', lastName: 'Torres', email: 'omar@losandes.cl', role: 'Dueño' },
    }, 'dark');
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(screenshotsDir, '05-dark-1440-owner.png') });

    // 3. Dark 1440 - Login PIN con Render Aumentado
    console.log('Capturing 3. Dark 1440 - Login PIN con Render Aumentado...');
    await setState(page, {
      onboardingStatus: 'completed',
      sessionStatus: 'locked',
      currentStep: 6,
      countryCode: 'CL',
      business: { name: 'Minimarket Los Andes', fiscalId: '76.890.123-4', phone: '9 8765 4321', phonePrefix: '+56', address: 'Av. Providencia #1420' },
      regionalSettings: { primaryCurrencyCode: 'CLP', enableSecondaryUSD: false },
      owner: { firstName: 'Omar', lastName: 'Torres', email: 'omar@losandes.cl', role: 'Dueño' },
      pinHash: 'dummyhash',
      pinSalt: 'dummysalt',
    }, 'dark');
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(screenshotsDir, '07-dark-1440-login-pin.png') });

    // 4. Mobile 390 - Dashboard Sidebar Cerrado (100% de ancho)
    console.log('Capturing 4. Mobile 390 - Dashboard Sidebar Cerrado...');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await setState(page, {
      onboardingStatus: 'completed',
      sessionStatus: 'unlocked',
      currentStep: 6,
      countryCode: 'CL',
      business: { name: 'Minimarket Los Andes', fiscalId: '76.890.123-4', phone: '9 8765 4321', phonePrefix: '+56', address: 'Av. Providencia #1420' },
      regionalSettings: { primaryCurrencyCode: 'CLP', enableSecondaryUSD: false },
      owner: { firstName: 'Omar', lastName: 'Torres', email: 'omar@losandes.cl', role: 'Dueño' },
      pinHash: 'dummyhash',
      pinSalt: 'dummysalt',
    }, 'dark');
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(screenshotsDir, '15-mobile-390-dashboard-closed.png') });

    // 5. Mobile 390 - Dashboard Sidebar Fullscreen Abierto
    console.log('Capturing 5. Mobile 390 - Dashboard Sidebar Fullscreen Abierto...');
    // Click on mobile hamburger menu
    await page.click('button[aria-label="Abrir menú"]');
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: path.join(screenshotsDir, '16-mobile-390-dashboard-sidebar-open.png') });

    // Close mobile sidebar
    await page.click('button[aria-label="Cerrar menú"]');
    await new Promise((r) => setTimeout(r, 400));

    // 6. Mobile 390 - Dashboard Dropdown "Hoy" Abierto
    console.log('Capturing 6. Mobile 390 - Dashboard Dropdown "Hoy" Abierto...');
    // Click on the period select button ("Hoy")
    const selectButtons = await page.$$('button');
    for (const btn of selectButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Hoy')) {
        await btn.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: path.join(screenshotsDir, '17-mobile-390-dashboard-dropdown-open.png') });

    // 7. Mobile 390 - Login PIN
    console.log('Capturing 7. Mobile 390 - Login PIN...');
    await setState(page, {
      onboardingStatus: 'completed',
      sessionStatus: 'locked',
      currentStep: 6,
      countryCode: 'CO',
      business: { name: 'Supermercado Central', fiscalId: '900.567.890-1', phone: '310 987 6543', phonePrefix: '+57', address: 'Carrera 7 #45-12' },
      regionalSettings: { primaryCurrencyCode: 'COP', enableSecondaryUSD: false },
      owner: { firstName: 'Omar', lastName: 'Torres', email: 'omar@losandes.cl', role: 'Dueño' },
      pinHash: 'dummyhash',
      pinSalt: 'dummysalt',
    }, 'dark');
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(screenshotsDir, '11-mobile-390-login-pin.png') });

    // 8. Mobile 390 - Owner Step
    console.log('Capturing 8. Mobile 390 - Owner Step...');
    await setState(page, {
      onboardingStatus: 'incomplete',
      sessionStatus: 'locked',
      currentStep: 5,
      countryCode: 'CO',
      business: { name: 'Supermercado Central', fiscalId: '900.567.890-1', phone: '310 987 6543', phonePrefix: '+57', address: 'Carrera 7 #45-12' },
      regionalSettings: { primaryCurrencyCode: 'COP', enableSecondaryUSD: false },
      owner: { firstName: 'Omar', lastName: 'Torres', email: 'omar@losandes.cl', role: 'Dueño' },
    }, 'dark');
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(screenshotsDir, '14-mobile-390-owner.png') });

    console.log('All AG-02.2 screenshots successfully captured!');
  } finally {
    await browser.close();
    previewProcess.kill();
  }
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
