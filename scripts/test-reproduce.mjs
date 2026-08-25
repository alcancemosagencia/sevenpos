import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function debugFlow() {
  console.log('--- Starting Vite dev server for reproduction test ---');
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
    page.on('console', (msg) => console.log(`[Browser Console ${msg.type()}]:`, msg.text()));
    page.on('pageerror', (err) => console.error('[Browser PageError]:', err));

    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    // Clear any previous state to ensure fresh start
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));

    console.log('Initial URL:', page.url());

    // Step 1: Click "Comenzar configuración"
    console.log('Step 1: Finding and clicking "Comenzar configuración"...');
    const buttons1 = await page.$$('button');
    for (const b of buttons1) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && text.includes('Comenzar')) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 600));

    // Step 2: Select Country (Chile is default), click "Continuar"
    console.log('Step 2: Clicking Continuar...');
    const buttons2 = await page.$$('button');
    for (const b of buttons2) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && text.includes('Continuar')) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 600));

    // Step 3: Fill Business name
    console.log('Step 3: Filling Business form...');
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

    // Step 4: Regional settings, click "Continuar"
    console.log('Step 4: Clicking Continuar on Regional step...');
    const buttons4 = await page.$$('button');
    for (const b of buttons4) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && text.includes('Continuar')) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 600));

    // Step 5: Owner and PIN
    console.log('Step 5: Filling Owner Name and PIN...');
    const ownerNameInput = await page.$('input[placeholder*="Omar"]');
    if (ownerNameInput) {
      await ownerNameInput.type('Omar');
    }

    const pinInputs = await page.$$('input[type="password"]');
    console.log(`Found ${pinInputs.length} password inputs`);
    if (pinInputs.length >= 2) {
      await pinInputs[0].type('1234');
      await pinInputs[1].type('1234');
    }

    await new Promise((r) => setTimeout(r, 400));

    console.log('Step 5: Submitting Owner and PIN (triggering handleOwnerStepSubmit)...');
    const buttons5 = await page.$$('button');
    for (const b of buttons5) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && (text.includes('Continuar') || text.includes('Guardar'))) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1500));

    // Step 6: Confirmation step
    console.log('\n================== AT STEP 6 ==================');
    console.log('Current URL:', page.url());
    const step6Content = await page.evaluate(() => document.body.innerText);
    console.log('Page text snippet at Step 6:\n', step6Content.substring(0, 400));
    await page.screenshot({ path: path.join(projectRoot, 'docs', 'screenshots', 'test_step6_before_click.png') });

    // Inspect localStorage
    const localState = await page.evaluate(() => localStorage.getItem('sevenpos-onboarding-state'));
    console.log('localStorage state at Step 6:', localState);

    // Find and Click "Entrar a SevenPOS"
    console.log('\nFinding button "Entrar a SevenPOS"...');
    const buttons6 = await page.$$('button');
    let enterButton = null;
    for (const b of buttons6) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && text.includes('Entrar a SevenPOS')) {
        enterButton = b;
        console.log('Found "Entrar a SevenPOS" button!');
        break;
      }
    }

    if (enterButton) {
      console.log('Clicking "Entrar a SevenPOS"...');
      await enterButton.click();
      await new Promise((r) => setTimeout(r, 2000));
    } else {
      console.log('ERROR: "Entrar a SevenPOS" button not found!');
    }

    console.log('\n================== AFTER CLICKING "Entrar a SevenPOS" ==================');
    console.log('URL after click:', page.url());
    const afterContent = await page.evaluate(() => document.body.innerText);
    console.log('Page text snippet after click:\n', afterContent.substring(0, 400));
    await page.screenshot({ path: path.join(projectRoot, 'docs', 'screenshots', 'test_after_click.png') });

  } finally {
    await browser.close();
    devProcess.kill();
  }
}

debugFlow().catch(console.error);
