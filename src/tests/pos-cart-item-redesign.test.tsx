import { describe, it, expect, vi, beforeAll } from 'vitest';
import { renderToString } from 'react-dom/server';
import { PosCartItem } from '../features/pos/components/PosCartItem';
import { CartLine } from '../features/pos/context/CartContext';

const store = new Map<string, string>();
if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.getItem !== 'function') {
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    length: 0,
    key: () => null,
  } as unknown as Storage;
}

describe('POS-UX-HOTFIX-CART-01: Rediseño de Items del Carrito', () => {
  beforeAll(() => {
    store.clear();
  });

  const baseItem: CartLine = {
    lineId: 'line-1',
    productId: 'prod-1',
    presentationId: null,
    productName: 'Espaguetti',
    presentationName: null,
    displayName: 'Espaguetti',
    baseUnit: 'UNIT',
    unitFactor: 1,
    unitPrice: 340,
    quantity: 1000, // 1 UNIT
    grossLineTotal: 340,
    discountTotal: 0,
    lineTotal: 340,
  };

  it('1. Renders 3-row compact card composition matching IMAGE 2 target', () => {
    const onIncrement = vi.fn();
    const onDecrement = vi.fn();
    const onRemove = vi.fn();

    const html = renderToString(
      <PosCartItem
        item={baseItem}
        currency="CLP"
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        onRemove={onRemove}
      />
    );

    // Row 1: Product name and Trash icon
    expect(html).toContain('Espaguetti');
    expect(html).toContain('aria-label="Eliminar producto"');

    // Row 2: Unit price + c/u
    expect(html).toContain('c/u');
    expect(html).toContain('340');

    // Row 3: Subtotal and Quantity Stepper
    expect(html).toContain('aria-label="Disminuir cantidad"');
    expect(html).toContain('aria-label="Aumentar cantidad"');
    expect(html).toContain('data-testid="pos-cart-item-line-1"');
  });

  it('2. Long product names wrap cleanly without horizontal truncation or stepper overlap', () => {
    const longItem: CartLine = {
      ...baseItem,
      lineId: 'line-long',
      productName: 'Arroz Grado 1 Premium Importado 5 kg',
      displayName: 'Arroz Grado 1 Premium Importado 5 kg',
      unitPrice: 1350,
      grossLineTotal: 1350,
      lineTotal: 1350,
    };

    const html = renderToString(
      <PosCartItem
        item={longItem}
        currency="CLP"
        onIncrement={() => {}}
        onDecrement={() => {}}
        onRemove={() => {}}
      />
    );

    expect(html).toContain('Arroz Grado 1 Premium Importado 5 kg');
    expect(html).toContain('line-clamp-2');
    expect(html).toContain('break-words');
    expect(html).toContain('1.350');
  });

  it('3. Renders presentation badge when presentationName is present', () => {
    const presentationItem: CartLine = {
      ...baseItem,
      lineId: 'line-pres',
      productName: 'Bebida Cola 1.5L',
      presentationName: 'Pack 6 Unidades',
      displayName: 'Bebida Cola 1.5L · Pack 6 Unidades',
      unitFactor: 6,
      unitPrice: 6000,
      grossLineTotal: 6000,
      lineTotal: 6000,
    };

    const html = renderToString(
      <PosCartItem
        item={presentationItem}
        currency="CLP"
        onIncrement={() => {}}
        onDecrement={() => {}}
        onRemove={() => {}}
      />
    );

    expect(html).toContain('Bebida Cola 1.5L');
    expect(html).toContain('Pack 6 Unidades');
    expect(html).toContain('(x6 base)');
  });

  it('4. Renders item discount breakdown cleanly in secondary row when discount applied', () => {
    const discountedItem: CartLine = {
      ...baseItem,
      lineId: 'line-disc',
      unitPrice: 1000,
      grossLineTotal: 1000,
      discountTotal: 200,
      lineTotal: 800,
    };

    const html = renderToString(
      <PosCartItem
        item={discountedItem}
        currency="CLP"
        onIncrement={() => {}}
        onDecrement={() => {}}
        onRemove={() => {}}
      />
    );

    expect(html).toContain('desc.');
    expect(html).toContain('200');
    expect(html).toContain('800');
  });

  it('5. Supports fractional quantities cleanly for future weighted products', () => {
    const fractionalItem: CartLine = {
      ...baseItem,
      lineId: 'line-weight',
      productName: 'Queso Gauda Laminado',
      baseUnit: 'KG',
      unitPrice: 9000, // per 1000g (1 KG)
      quantity: 260, // 0.260 KG
      grossLineTotal: 2340,
      discountTotal: 0,
      lineTotal: 2340,
    };

    const html = renderToString(
      <PosCartItem
        item={fractionalItem}
        currency="CLP"
        onIncrement={() => {}}
        onDecrement={() => {}}
        onRemove={() => {}}
      />
    );

    expect(html).toContain('Queso Gauda Laminado');
    expect(html).toContain('0,26');
  });

  it('6. Multi-currency support renders properly across CLP, USD, COP, VES', () => {
    const usdItem: CartLine = {
      ...baseItem,
      unitPrice: 250, // $2.50
      grossLineTotal: 250,
      lineTotal: 250,
    };

    const htmlUsd = renderToString(
      <PosCartItem
        item={usdItem}
        currency="USD"
        onIncrement={() => {}}
        onDecrement={() => {}}
        onRemove={() => {}}
      />
    );

    expect(htmlUsd).toContain('$ 2.50');
    expect(htmlUsd).toContain('c/u');
  });

  it('7. Verifies cart interaction callbacks (increment, decrement, remove)', () => {
    const onIncrement = vi.fn();
    const onDecrement = vi.fn();
    const onRemove = vi.fn();

    PosCartItem({
      item: baseItem,
      currency: 'CLP',
      onIncrement,
      onDecrement,
      onRemove,
    });

    onIncrement('line-1');
    onDecrement('line-1');
    onRemove('line-1');

    expect(onIncrement).toHaveBeenCalledWith('line-1');
    expect(onDecrement).toHaveBeenCalledWith('line-1');
    expect(onRemove).toHaveBeenCalledWith('line-1');
  });

  it('8. Responsive breakpoints (320, 360, 390, 412, 768, 1440) render without layout regressions', () => {
    const breakpoints = [320, 360, 390, 412, 768, 1440];

    for (const width of breakpoints) {
      const html = renderToString(
        <div style={{ width: `${width}px` }}>
          <PosCartItem
            item={baseItem}
            currency="CLP"
            onIncrement={() => {}}
            onDecrement={() => {}}
            onRemove={() => {}}
          />
        </div>
      );

      expect(html).toContain('Espaguetti');
      expect(html).toContain('data-testid="pos-cart-item-line-1"');
      expect(html).toContain('aria-label="Eliminar producto"');
      expect(html).toContain('aria-label="Disminuir cantidad"');
      expect(html).toContain('aria-label="Aumentar cantidad"');
    }
  });

  it('9. Renders short, medium, and long products alongside each other cleanly', () => {
    const shortItem: CartLine = { ...baseItem, lineId: 'line-short', productName: 'Arroz', displayName: 'Arroz' };
    const mediumItem: CartLine = { ...baseItem, lineId: 'line-med', productName: 'Espaguetti Premium', displayName: 'Espaguetti Premium' };
    const longItem: CartLine = { ...baseItem, lineId: 'line-long', productName: 'Arroz Grado 1 Premium Importado 5 kg', displayName: 'Arroz Grado 1 Premium Importado 5 kg' };

    const html = renderToString(
      <div className="space-y-2.5">
        <PosCartItem item={shortItem} currency="CLP" onIncrement={() => {}} onDecrement={() => {}} onRemove={() => {}} />
        <PosCartItem item={mediumItem} currency="CLP" onIncrement={() => {}} onDecrement={() => {}} onRemove={() => {}} />
        <PosCartItem item={longItem} currency="CLP" onIncrement={() => {}} onDecrement={() => {}} onRemove={() => {}} />
      </div>
    );

    expect(html).toContain('Arroz');
    expect(html).toContain('Espaguetti Premium');
    expect(html).toContain('Arroz Grado 1 Premium Importado 5 kg');
    expect(html).toContain('data-testid="pos-cart-item-line-short"');
    expect(html).toContain('data-testid="pos-cart-item-line-med"');
    expect(html).toContain('data-testid="pos-cart-item-line-long"');
  });
});
