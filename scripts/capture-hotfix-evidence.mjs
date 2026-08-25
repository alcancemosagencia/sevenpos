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

async function captureEvidence() {
  console.log('--- Starting Vite dev server for official evidence capture ---');
  const devProcess = spawn('npm', ['run', 'dev', '--', '--port', '5173'], {
    cwd: projectRoot,
    shell: true,
    stdio: 'pipe',
  });

  await new Promise((resolve) => setTimeout(resolve, 3500));

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    // Fresh start
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));

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

    // ----------------------------------------------------
    // CAPTURA A: Paso 6 inmediatamente antes del click
    // ----------------------------------------------------
    console.log('=== CAPTURA A: PASO 6 ANTES DEL CLICK ===');
    const stateBefore = await page.evaluate(() => {
      const local = JSON.parse(localStorage.getItem('sevenpos-onboarding-state') || '{}');
      return {
        pathname: window.location.pathname,
        onboardingStatus: local.onboardingStatus,
        sessionStatus: local.sessionStatus,
        currentStep: local.currentStep,
      };
    });
    console.log('Estado ANTES del click:', JSON.stringify(stateBefore, null, 2));

    const pathA = path.join(screenshotsDir, 'hotfix-ag03.1c-step6-before.png');
    await page.screenshot({ path: pathA });
    fs.copyFileSync(pathA, path.join(artifactDir, 'hotfix-ag03.1c-step6-before.png'));

    // Click "Entrar a SevenPOS"
    const buttons6 = await page.$$('button');
    for (const b of buttons6) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && text.includes('Entrar a SevenPOS')) {
        console.log('Clickeando "Entrar a SevenPOS"...');
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1500));

    // ----------------------------------------------------
    // CAPTURA B: Pantalla PIN Login inmediatamente después del click
    // ----------------------------------------------------
    console.log('=== CAPTURA B: LOGIN DESPUÉS DEL CLICK ===');
    const stateAfter = await page.evaluate(() => {
      const local = JSON.parse(localStorage.getItem('sevenpos-onboarding-state') || '{}');
      const isPinLogin = document.body.innerText.includes('Ingrese su PIN de acceso');
      const isDashboard = document.body.innerText.includes('Panel Principal');
      const isStep6 = document.body.innerText.includes('Paso 6 de 6');
      return {
        pathname: window.location.pathname,
        onboardingStatus: local.onboardingStatus,
        sessionStatus: local.sessionStatus,
        renderedView: isPinLogin ? 'PinLoginPage (/login)' : isDashboard ? 'DashboardPage (/dashboard)' : isStep6 ? 'ConfirmationStep (Step 6)' : 'Unknown',
      };
    });
    console.log('Estado DESPUÉS del click:', JSON.stringify(stateAfter, null, 2));

    const pathB = path.join(screenshotsDir, 'hotfix-ag03.1c-login-after.png');
    await page.screenshot({ path: pathB });
    fs.copyFileSync(pathB, path.join(artifactDir, 'hotfix-ag03.1c-login-after.png'));

    // ----------------------------------------------------
    // BONUS: Desbloquear con PIN 1234 y verificar entrada a Dashboard
    // ----------------------------------------------------
    console.log('=== VERIFICACIÓN DE LOGIN CON PIN 1234 ===');
    for (const digit of ['1', '2', '3', '4']) {
      await page.click(`button[aria-label="Número ${digit}"]`);
      await new Promise((r) => setTimeout(r, 150));
    }
    await new Promise((r) => setTimeout(r, 1500));

    const stateDashboard = await page.evaluate(() => {
      const local = JSON.parse(localStorage.getItem('sevenpos-onboarding-state') || '{}');
      const isDashboard = document.body.innerText.includes('Panel Principal') || document.body.innerText.includes('Punto de Venta');
      return {
        pathname: window.location.pathname,
        onboardingStatus: local.onboardingStatus,
        sessionStatus: local.sessionStatus,
        renderedView: isDashboard ? 'AppShell + DashboardPage (/dashboard)' : 'Other',
      };
    });
    console.log('Estado DESPUÉS de ingresar PIN en Login:', JSON.stringify(stateDashboard, null, 2));

    const pathC = path.join(screenshotsDir, 'hotfix-ag03.1c-dashboard-unlocked.png');
    await page.screenshot({ path: pathC });
    fs.copyFileSync(pathC, path.join(artifactDir, 'hotfix-ag03.1c-dashboard-unlocked.png'));

    console.log('Evidence capture successfully completed!');
  } finally {
    await browser.close();
    devProcess.kill();
  }
}

captureEvidence().catch(console.error);
