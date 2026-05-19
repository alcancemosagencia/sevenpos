"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Download, Eye, Printer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintReceiptButton({
  label = "Imprimir ticket",
  variant = "default",
  className,
}: {
  label?: string;
  variant?: "default" | "secondary" | "ghost" | "outline";
  className?: string;
}) {
  return (
    <Button type="button" variant={variant} className={className} onClick={() => window.print()}>
      <Printer className="size-4" />
      {label}
    </Button>
  );
}

export function NewSaleButton({ className }: { className?: string }) {
  return (
    <Button type="button" variant="secondary" className={className} onClick={() => window.location.assign("/pos")}>
      <RotateCcw className="size-4" />
      Nueva venta
    </Button>
  );
}

export function ReceiptRowActions({ saleId }: { saleId: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
        <Link href={`/receipts/${saleId}`}>
          <Eye className="size-4" />
          Ver
        </Link>
      </Button>
      <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
        <Link href={`/receipts/${saleId}?print=1`}>
          <Printer className="size-4" />
          Reimprimir
        </Link>
      </Button>
      <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
        <Link href={`/receipts/${saleId}?print=1`}>
          <Download className="size-4" />
          PDF
        </Link>
      </Button>
    </div>
  );
}

export function AutoPrint({ enabled, copies = 1 }: { enabled: boolean; copies?: number }) {
  if (!enabled) return null;

  return <PrintOnMount copies={copies} />;
}

function PrintOnMount({ copies }: { copies: number }) {
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      for (let index = 0; index < Math.max(1, copies); index += 1) {
        window.print();
      }
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [copies]);

  return null;
}
