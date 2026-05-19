import { money } from "@/features/pos/format";
import type { ReceiptData } from "@/features/receipts/types";

function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function receiptNumber(id: string) {
  return id.slice(-8).toUpperCase();
}

export function ReceiptTemplate({ receipt, size = "58" }: { receipt: ReceiptData; size?: "58" | "80" }) {
  return (
    <article className={`receipt-ticket receipt-ticket-${size}`} aria-label="Ticket de venta">
      <header className="receipt-center receipt-section">
        {receipt.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={receipt.logoUrl} alt={receipt.businessName} className="receipt-logo-img" />
        ) : (
          <div className="receipt-logo">S7</div>
        )}
        <h2>{receipt.businessName}</h2>
        {receipt.businessAddress ? <p>{receipt.businessAddress}</p> : null}
        {receipt.businessPhone ? <p>Tel: {receipt.businessPhone}</p> : null}
        {receipt.businessEmail ? <p>{receipt.businessEmail}</p> : null}
        {receipt.businessTaxId ? <p>RIF/RUT: {receipt.businessTaxId}</p> : null}
        <p>Ticket #{receiptNumber(receipt.id)}</p>
      </header>

      <section className="receipt-section receipt-meta">
        <div>
          <span>Fecha</span>
          <strong>{formatDate(receipt.createdAt)}</strong>
        </div>
        <div>
          <span>Cajero</span>
          <strong>{receipt.cashierName}</strong>
        </div>
        {receipt.branchName ? (
          <div>
            <span>Sucursal</span>
            <strong>{receipt.branchName}</strong>
          </div>
        ) : null}
      </section>

      <section className="receipt-section">
        <div className="receipt-row receipt-head">
          <span>Producto</span>
          <span>Total</span>
        </div>
        {receipt.items.map((item, index) => (
          <div key={`${item.name}-${index}`} className="receipt-item">
            <div className="receipt-row">
              <strong>{item.name}</strong>
              <strong>{money(item.subtotalUsd, "USD")}</strong>
            </div>
            <p>
              {item.quantity} x {money(item.unitPriceUsd, "USD")}
            </p>
          </div>
        ))}
      </section>

      <section className="receipt-section receipt-totals">
        <div className="receipt-row">
          <span>Subtotal</span>
          <strong>{money(receipt.subtotalUsd, "USD")}</strong>
        </div>
        <div className="receipt-row">
          <span>Impuestos</span>
          <strong>{money(receipt.taxUsd ?? 0, "USD")}</strong>
        </div>
        <div className="receipt-row">
          <span>Descuento</span>
          <strong>{money(receipt.discountUsd ?? 0, "USD")}</strong>
        </div>
        <div className="receipt-row">
          <span>Tasa del dia</span>
          <strong>1 USD = {receipt.exchangeRate.toFixed(2)} Bs</strong>
        </div>
        <div className="receipt-row receipt-total">
          <span>Total USD</span>
          <strong>{money(receipt.totalUsd, "USD")}</strong>
        </div>
        <div className="receipt-row receipt-total">
          <span>Total Bs</span>
          <strong>Bs {receipt.totalBs.toFixed(2)}</strong>
        </div>
      </section>

      <section className="receipt-section receipt-totals">
        <div className="receipt-row">
          <span>Método</span>
          <strong>{receipt.payment.method}</strong>
        </div>
        {receipt.payment.reference ? (
          <div className="receipt-row">
            <span>Referencia</span>
            <strong>{receipt.payment.reference}</strong>
          </div>
        ) : null}
        {receipt.payment.receivedUsd !== undefined ? (
          <div className="receipt-row">
            <span>Recibido USD</span>
            <strong>{money(receipt.payment.receivedUsd, "USD")}</strong>
          </div>
        ) : null}
        {receipt.payment.receivedBs !== undefined ? (
          <div className="receipt-row">
            <span>Recibido Bs</span>
            <strong>Bs {receipt.payment.receivedBs.toFixed(2)}</strong>
          </div>
        ) : null}
        {(receipt.payment.changeUsd ?? 0) > 0 || (receipt.payment.changeBs ?? 0) > 0 ? (
          <>
            <div className="receipt-row">
              <span>Vuelto USD</span>
              <strong>{money(receipt.payment.changeUsd ?? 0, "USD")}</strong>
            </div>
            <div className="receipt-row">
              <span>Vuelto Bs</span>
              <strong>Bs {(receipt.payment.changeBs ?? 0).toFixed(2)}</strong>
            </div>
          </>
        ) : null}
      </section>

      <footer className="receipt-center receipt-footer">
        {receipt.qrValue ? <div className="receipt-qr">{receipt.qrValue.slice(0, 18)}</div> : null}
        <p>{receipt.footer ?? "Gracias por su compra"}</p>
        <p>SevenPOS</p>
      </footer>
    </article>
  );
}
