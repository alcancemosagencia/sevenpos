"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type SevenPosLogoProps = {
  className?: string;
  markClassName?: string;
  showText?: boolean;
};

export function SevenPosLogo({ className, markClassName, showText = true }: SevenPosLogoProps) {
  const [branding, setBranding] = useState({
    logoUrl: null as string | null,
    commercialName: "SevenPOS",
    slogan: "Modern point of sale",
  });

  useEffect(() => {
    let mounted = true;
    fetch("/api/branding", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (mounted) {
          setBranding({
            logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : null,
            commercialName: typeof data.commercialName === "string" ? data.commercialName : "SevenPOS",
            slogan: typeof data.slogan === "string" ? data.slogan : "Modern point of sale",
          });
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative flex size-9 overflow-hidden items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold tracking-tight text-white shadow-[0_14px_34px_hsl(220_40%_8%/0.26)] ring-1 ring-white/10",
          markClassName,
        )}
      >
        {branding.logoUrl ? (
          <Image src={branding.logoUrl} alt={branding.commercialName} fill className="object-contain p-1" sizes="36px" />
        ) : (
          "S7"
        )}
      </div>
      {showText ? (
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-tight tracking-normal">{branding.commercialName}</p>
          <p className="truncate text-[11px] font-semibold text-sidebar-foreground">{branding.slogan}</p>
        </div>
      ) : null}
    </div>
  );
}
