import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const screenshotsDir = path.resolve(projectRoot, 'docs', 'screenshots');
const artifactDir = 'C:\\Users\\Omar\\.gemini\\antigravity\\brain\\d41eeea8-12ee-409b-85b2-40fcb3462ea5';

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function runHotfixVerification() {
  console.log('=== Starting Vite dev server for HOTFIX AG-03.1D verification ===');
  const devProcess = spawn('npm', ['run', 'dev', '--', '--port', '5173'], {
    cwd: projectRoot,
    shell: true,
    stdio: 'pipe',
  });

  await new Promise((resolve) => setTimeout(resolve, 3500));

  const userDataDir = path.resolve(projectRoot, '.puppeteer-test-profile');
  if (fs.existsSync(userDataDir)) {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }

  let browser = await puppeteer.launch({
    headless: true,
    userDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });


  try {
    let page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    // 1. Fresh start: clear all local storage
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));

    console.log('1. Executing Onboarding Steps 1 to 5...');
    // Step 1: Click "Comenzar configuración"
    const buttons1 = await page.$$('button');
    for (const b of buttons1) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && text.includes('Comenzar')) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 600));

    // Step 2: Country step -> Click "Continuar"
    const buttons2 = await page.$$('button');
    for (const b of buttons2) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && text.includes('Continuar')) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 600));

    // Step 3: Business step -> Fill name & Continuar
    const businessNameInput = await page.$('input[placeholder*="Minimarket"]');
    if (businessNameInput) {
      await businessNameInput.type('Minimarket Los Andes');
    }
    const buttons3 = await page.$$('button');
    for (const b of buttons3) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && text.includes('Continuar')) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 600));

    // Step 4: Regional step -> Click Continuar
    const buttons4 = await page.$$('button');
    for (const b of buttons4) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && text.includes('Continuar')) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 600));

    // Step 5: Owner step -> Fill owner name and PINs
    const ownerNameInput = await page.$('input[placeholder*="Omar"]');
    if (ownerNameInput) {
      await ownerNameInput.type('Omar');
    }

    const pinInputs = await page.$$('input[type="password"]');
    if (pinInputs.length >= 2) {
      await pinInputs[0].type('1234');
      await pinInputs[1].type('1234');
    }
    await new Promise((r) => setTimeout(r, 400));

    // Click Continuar in Step 5 (Commits to SQLite & Stronghold, opens Step 6)
    const buttons5 = await page.$$('button');
    for (const b of buttons5) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && (text.includes('Continuar') || text.includes('Guardar'))) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1500));

    // Verify Step 6 is visible before closing
    const isStep6Visible = await page.evaluate(() => document.body.innerText.includes('Paso 6 de 6') && document.body.innerText.includes('Todo está listo'));
    console.log('Step 6 visible before closing:', isStep6Visible);
    if (!isStep6Visible) {
      throw new Error('Step 6 celebration was not rendered after Step 5 submit!');
    }

    // ----------------------------------------------------
    // TEST CRÍTICO: CERRAR APLICACIÓN / BROWSER DURANTE EL PASO 6
    // ----------------------------------------------------
    console.log('2. SIMULATING APP CLOSE DURING STEP 6 (Closing Browser)...');
    await browser.close();
    await new Promise((r) => setTimeout(r, 1000));

    console.log('3. SIMULATING FRESH REOPEN (Launching new browser session)...');
    browser = await puppeteer.launch({
      headless: true,
      userDataDir,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();

    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    // Open root URL
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));

    const stateOnReopen = await page.evaluate(() => {
      const local = JSON.parse(localStorage.getItem('sevenpos-onboarding-state') || '{}');
      const isPinLogin = document.body.innerText.includes('Ingrese su PIN de acceso');
      const isDashboard = document.body.innerText.includes('Panel Principal');
      const isStep6 = document.body.innerText.includes('Paso 6 de 6') || document.body.innerText.includes('Todo está listo');
      return {
        pathname: window.location.pathname,
        onboardingStatus: local.onboardingStatus,
        sessionStatus: local.sessionStatus,
        isStep6Rendered: isStep6,
        isPinLoginRendered: isPinLogin,
        isDashboardRendered: isDashboard,
        renderedView: isPinLogin ? 'PinLoginPage (/login)' : isDashboard ? 'DashboardPage (/dashboard)' : isStep6 ? 'Step 6 (FORBIDDEN)' : 'Unknown',
      };
    });

    console.log('Estado tras CERRAR y REABRIR la app:', JSON.stringify(stateOnReopen, null, 2));

    if (stateOnReopen.isStep6Rendered) {
      throw new Error('FAILED: Step 6 was rendered on fresh boot after closing app!');
    }
    if (!stateOnReopen.isPinLoginRendered || stateOnReopen.pathname !== '/login') {
      throw new Error(`FAILED: Expected /login with PinLoginPage, got pathname: ${stateOnReopen.pathname}, view: ${stateOnReopen.renderedView}`);
    }

    // CAPTURA OBLIGATORIA: Login PIN tras reabrir la app
    const reopenScreenshot = path.join(screenshotsDir, 'hotfix-ag03.1d-reopen-login.png');
    await page.screenshot({ path: reopenScreenshot });
    fs.copyFileSync(reopenScreenshot, path.join(artifactDir, 'hotfix-ag03.1d-reopen-login.png'));
    console.log('Saved mandatory screenshot: hotfix-ag03.1d-reopen-login.png');

    // ----------------------------------------------------
    // TEST DE RUTAS DIRECTAS EN INSTALACIÓN CONFIGURADA
    // ----------------------------------------------------
    console.log('4. Testing direct navigation to /dashboard while locked...');
    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));
    const pathAfterDashboardNav = await page.evaluate(() => window.location.pathname);
    console.log('Path after direct /dashboard:', pathAfterDashboardNav);
    if (pathAfterDashboardNav !== '/login') {
      throw new Error(`FAILED: Direct /dashboard resolved to ${pathAfterDashboardNav} instead of /login`);
    }

    console.log('5. Testing direct navigation to /register while configured + locked...');
    await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));
    const pathAfterRegisterNav = await page.evaluate(() => window.location.pathname);
    console.log('Path after direct /register:', pathAfterRegisterNav);
    if (pathAfterRegisterNav !== '/login') {
      throw new Error(`FAILED: Direct /register resolved to ${pathAfterRegisterNav} instead of /login`);
    }

    // ----------------------------------------------------
    // TEST DE DESBLOQUEO CON PIN
    // ----------------------------------------------------
    console.log('6. Unlocking session with PIN 1234...');
    for (const digit of ['1', '2', '3', '4']) {
      await page.click(`button[aria-label="Número ${digit}"]`);
      await new Promise((r) => setTimeout(r, 120));
    }
    await new Promise((r) => setTimeout(r, 1500));

    const stateAfterUnlock = await page.evaluate(() => {
      const isDashboard = document.body.innerText.includes('Punto de Venta') || document.body.innerText.includes('Panel Principal');
      return {
        pathname: window.location.pathname,
        isDashboardRendered: isDashboard,
      };
    });
    console.log('Estado tras desbloquear con PIN:', JSON.stringify(stateAfterUnlock, null, 2));

    if (stateAfterUnlock.pathname !== '/dashboard' || !stateAfterUnlock.isDashboardRendered) {
      throw new Error('FAILED: Session did not unlock to /dashboard');
    }

    console.log('ALL HOTFIX AG-03.1D CHECKS PASSED PERFECTLY!');
  } finally {
    await browser.close();
    devProcess.kill();
  }
}

runHotfixVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
