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
        firstName: 'José',
        lastName: 'Pérez',
        displayName: 'José Pérez',
        role: 'OWNER',
        pinVault: vaultData,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const categories = [
        {
          id: 'cat-bebidas',
          businessId: 'primary-business',
          name: 'Bebidas',
          slug: 'bebidas',
          color: '#3B82F6',
          icon: 'CupSoda',
          sortOrder: 1,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const products = [
        {
          id: 'prod-cola',
          businessId: 'primary-business',
          categoryId: 'cat-bebidas',
          name: 'Bebida Cola 1.5L',
          baseUnit: 'UNIT',
          salePrice: 3030,
          costPrice: 1800,
          sku: 'BEB-001',
          barcode: '7801234567890',
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod-agua',
          businessId: 'primary-business',
          categoryId: 'cat-bebidas',
          name: 'Agua Mineral 500ml',
          baseUnit: 'UNIT',
          salePrice: 1000,
          costPrice: 500,
          sku: 'BEB-002',
          barcode: '7801234567891',
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const movements = [
        {
          id: 'mov-1',
          businessId: 'primary-business',
          productId: 'prod-cola',
          movementType: 'OPENING',
          quantityDelta: 50000,
          occurredAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          createdByUserId: 'primary-user',
        },
        {
          id: 'mov-2',
          businessId: 'primary-business',
          productId: 'prod-agua',
          movementType: 'OPENING',
          quantityDelta: 100000,
          occurredAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          createdByUserId: 'primary-user',
        },
      ];

      const defaultRegister = {
        id: 'register-main',
        businessId: 'primary-business',
        name: 'Caja principal',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Set items
      localStorage.setItem('sevenpos-dev-business', JSON.stringify(business));
      localStorage.setItem('sevenpos-dev-settings', JSON.stringify(settings));
      localStorage.setItem('sevenpos-dev-users', JSON.stringify([owner]));
      localStorage.setItem('sevenpos-dev-vault:primary-user', JSON.stringify(vaultData));
      localStorage.setItem('sevenpos-dev-categories', JSON.stringify(categories));
      localStorage.setItem('sevenpos-dev-products', JSON.stringify(products));
      localStorage.setItem('sevenpos-dev-movements', JSON.stringify(movements));
      localStorage.setItem('sevenpos-dev-cash-registers', JSON.stringify([defaultRegister]));
      // Ensure NO active cash session initially
      localStorage.removeItem('sevenpos-dev-cash-sessions');
      localStorage.removeItem('sevenpos-dev-cash-movements');
      localStorage.removeItem('sevenpos-dev-sales');
    }, { hash, salt });

    async function unlockIfLocked() {
      await wait(800);
      const isLocked = await page.evaluate(() =>
        document.body.textContent?.includes('Ingrese su PIN') || document.body.textContent?.includes('Bloqueado')
      );
      if (isLocked) {
        console.log('Unlocking with PIN 1234...');
        for (const digit of ['1', '2', '3', '4']) {
          await page.click(`button[aria-label="Número ${digit}"]`);
          await wait(150);
        }
        await wait(1200);
      }
    }

    async function navigateTo(navName) {
      if (navName === 'pos') {
        await page.evaluate(() => {
          const items = Array.from(document.querySelectorAll('button, a'));
          const btn = items.find((el) => el.textContent?.trim().includes('Punto de venta'));
          if (btn) btn.click();
        });
      } else if (navName === 'cash') {
        await page.evaluate(() => {
          let cashItem = Array.from(document.querySelectorAll('button, a')).find((el) =>
            el.textContent?.trim().includes('Caja y turnos')
          );
          if (!cashItem) {
            const finGroup = Array.from(document.querySelectorAll('button')).find((el) =>
              el.textContent?.trim().includes('Finanzas')
            );
            if (finGroup) finGroup.click();
          }
        });
        await wait(400);
        await page.evaluate(() => {
          const cashItem = Array.from(document.querySelectorAll('button, a')).find((el) =>
            el.textContent?.trim().includes('Caja y turnos')
          );
          if (cashItem) cashItem.click();
        });
      }
      await wait(1000);
    }

    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await unlockIfLocked();
    await navigateTo('pos');

    // 1. POS with closed cash
    await saveScreenshot(page, 'ag07-01-pos-caja-cerrada-1440-dark.png');

    // 2. Open Cash Modal from POS
    await page.evaluate(() => {
      const openBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Abrir caja')
      );
      if (openBtn) openBtn.click();
    });
    await wait(600);

    // Type 20000 in MoneyInput inside modal
    const modalInput = await page.$('.fixed.inset-0 input');
    if (modalInput) {
      await modalInput.click({ clickCount: 3 });
      await modalInput.type('20000');
      await wait(300);
    }
    await saveScreenshot(page, 'ag07-02-modal-apertura-caja-1440-dark.png');

    // Confirm open cash
    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find((b) =>
        b.textContent?.includes('Confirmar apertura')
      );
      if (submitBtn) submitBtn.click();
    });
    await wait(1000);

    // 3. POS with cash open
    await saveScreenshot(page, 'ag07-03-pos-caja-abierta-1440-dark.png');

    // 4. Navigate to /cash
    await navigateTo('cash');
    await saveScreenshot(page, 'ag07-04-caja-estado-inicial-1440-dark.png');

    // 5. Navigate to /pos and perform cash sale
    await navigateTo('pos');

    // Click product card (Bebida Cola 1.5L)
    await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('div, button')).find((el) =>
        el.textContent?.includes('Bebida Cola 1.5L') && el.classList.contains('cursor-pointer')
      );
      if (card) (card).click();
    });
    await wait(500);

    // Click Cobrar
    await page.evaluate(() => {
      const cobrarBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Cobrar')
      );
      if (cobrarBtn) cobrarBtn.click();
    });
    await wait(600);

    // In checkout modal, confirm sale
    await page.evaluate(() => {
      const confirmBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Confirmar venta') || b.textContent?.includes('Completar')
      );
      if (confirmBtn) confirmBtn.click();
    });
    await wait(800);

    await saveScreenshot(page, 'ag07-05-pos-venta-efectivo-1440-dark.png');

    // Close Receipt Modal
    await page.evaluate(() => {
      const modalBtn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find((b) =>
        b.textContent?.includes('Nueva venta')
      );
      if (modalBtn) modalBtn.click();
    });
    await wait(500);

    // 6. Navigate to /cash (post-sale)
    await navigateTo('cash');
    await saveScreenshot(page, 'ag07-06-caja-post-venta-1440-dark.png');

    async function setModalInput(val) {
      const input = await page.$('.fixed.inset-0 input');
      if (input) {
        await input.focus();
        await page.keyboard.down('Control');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await wait(100);
        await page.keyboard.type(val);
        await wait(300);
      }
    }

    // 7. Open Cash In Modal ($5.000)
    await page.evaluate(() => {
      const inBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Ingresar efectivo')
      );
      if (inBtn) inBtn.click();
    });
    await wait(600);

    await setModalInput('5000');
    await saveScreenshot(page, 'ag07-07-modal-ingreso-efectivo-1440-dark.png');

    // Submit Cash In
    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find((b) =>
        b.textContent?.includes('Registrar ingreso')
      );
      if (submitBtn) submitBtn.click();
    });
    await wait(800);

    // 8. Open Cash Out Modal ($2.000)
    await page.evaluate(() => {
      const outBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Retirar efectivo')
      );
      if (outBtn) outBtn.click();
    });
    await wait(600);

    await setModalInput('2000');
    await saveScreenshot(page, 'ag07-08-modal-retiro-efectivo-1440-dark.png');

    // Submit Cash Out
    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find((b) =>
        b.textContent?.includes('Registrar retiro')
      );
      if (submitBtn) submitBtn.click();
    });
    await wait(800);

    // 9. /cash post movements (Expected = $23.000 if initial was 20.000 + 5.000 - 2.000)
    await saveScreenshot(page, 'ag07-09-caja-post-movimientos-1440-dark.png');

    // 10. Open Close Cash Modal (Step 1: Blind Count)
    await page.evaluate(() => {
      const closeBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Cerrar caja')
      );
      if (closeBtn) closeBtn.click();
    });
    await wait(600);

    // Type 23000
    await setModalInput('23000');
    await saveScreenshot(page, 'ag07-10-modal-cierre-paso1-conteo-1440-dark.png');

    // 11. Continue to Step 2 (Exact $23.000 -> $0 difference)
    await page.evaluate(() => {
      const nextBtn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find((b) =>
        b.textContent?.includes('Continuar a conciliación')
      );
      if (nextBtn) nextBtn.click();
    });
    await wait(600);
    await saveScreenshot(page, 'ag07-11-modal-cierre-paso2-exacto-1440-dark.png');

    // 12. Go back to count step, change to 22500 (-$500 Faltante)
    await page.evaluate(() => {
      const backBtn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find((b) =>
        b.textContent?.includes('Recontar') || b.textContent?.includes('Volver')
      );
      if (backBtn) backBtn.click();
    });
    await wait(400);

    await setModalInput('22500');

    await page.evaluate(() => {
      const nextBtn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find((b) =>
        b.textContent?.includes('Continuar a conciliación')
      );
      if (nextBtn) nextBtn.click();
    });
    await wait(600);
    await saveScreenshot(page, 'ag07-12-modal-cierre-paso2-diferencia-1440-dark.png');

    // Submit closing
    await page.evaluate(() => {
      const closeShiftBtn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find((b) =>
        b.textContent?.includes('Confirmar y cerrar turno')
      );
      if (closeShiftBtn) closeShiftBtn.click();
    });
    await wait(1000);

    // 13. /cash closed state with historical session
    await saveScreenshot(page, 'ag07-13-caja-cerrada-resumen-1440-dark.png');

    // 14. View historical shift detail modal
    await page.evaluate(() => {
      const detailBtn = document.querySelector('button[title="Ver detalle del turno"]');
      if (detailBtn) (detailBtn).click();
    });
    await wait(600);
    await saveScreenshot(page, 'ag07-14-modal-detalle-turno-1440-dark.png');

    // Close detail modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.fixed.inset-0 button.rounded-lg');
      if (closeBtn) (closeBtn).click();
    });
    await wait(400);

    // 15. Light mode /cash
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      localStorage.setItem('sevenpos-theme', 'light');
    });
    await wait(500);
    await saveScreenshot(page, 'ag07-15-caja-1440-light.png');

    // 16. Light mode Open Cash Modal
    await page.evaluate(() => {
      const openBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Abrir caja')
      );
      if (openBtn) openBtn.click();
    });
    await wait(600);
    await saveScreenshot(page, 'ag07-16-modal-apertura-1440-light.png');

    // Close open modal and switch back to dark mode
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find((b) =>
        b.textContent?.includes('Cancelar')
      );
      if (cancelBtn) cancelBtn.click();
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('sevenpos-theme', 'dark');
    });
    await wait(400);

    // 17. Tablet 768px Dark
    await page.setViewport({ width: 768, height: 1024, deviceScaleFactor: 2 });
    await navigateTo('cash');
    await saveScreenshot(page, 'ag07-17-caja-tablet-768-dark.png');

    // 18. Mobile 390px Dark (/cash)
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await navigateTo('cash');
    await saveScreenshot(page, 'ag07-18-caja-mobile-390-dark.png');

    // 19. Mobile 390px Dark (Open Cash then Close modal)
    await page.evaluate(() => {
      const openBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Abrir caja')
      );
      if (openBtn) openBtn.click();
    });
    await wait(600);

    const mobileOpenInput = await page.$('.fixed.inset-0 input');
    if (mobileOpenInput) {
      await mobileOpenInput.click({ clickCount: 3 });
      await mobileOpenInput.type('20000');
      await wait(300);
    }

    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find((b) =>
        b.textContent?.includes('Confirmar apertura') || b.textContent?.includes('Abrir')
      );
      if (submitBtn) submitBtn.click();
    });
    await wait(800);

    // Open Close Modal on mobile
    await page.evaluate(() => {
      const closeBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Cerrar caja')
      );
      if (closeBtn) closeBtn.click();
    });
    await wait(600);
    await saveScreenshot(page, 'ag07-19-modal-cierre-mobile-390-dark.png');

    // Close modal
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find((b) =>
        b.textContent?.includes('Cancelar')
      );
      if (cancelBtn) cancelBtn.click();
    });
    await wait(400);

    // 20. POS closed cash on mobile (close shift first)
    await page.evaluate(() => {
      const closeBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Cerrar caja')
      );
      if (closeBtn) closeBtn.click();
    });
    await wait(500);
    await page.evaluate(() => {
      const nextBtn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find((b) =>
        b.textContent?.includes('Continuar a conciliación')
      );
      if (nextBtn) nextBtn.click();
    });
    await wait(500);
    await page.evaluate(() => {
      const closeShiftBtn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find((b) =>
        b.textContent?.includes('Confirmar y cerrar turno')
      );
      if (closeShiftBtn) closeShiftBtn.click();
    });
    await wait(800);

    await navigateTo('pos');
    await saveScreenshot(page, 'ag07-20-pos-caja-cerrada-mobile-390-dark.png');

    console.log('ALL 20 AG-07 SCREENSHOTS CAPTURED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
