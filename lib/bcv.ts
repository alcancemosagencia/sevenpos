type BcvRateResult = {
  provider: "BCV";
  currency: "BS";
  rate: number | null;
  fetchedAt: string;
  sourceUrl: string | null;
  error?: string;
};

export async function fetchBcvRate(): Promise<BcvRateResult> {
  const sourceUrl = process.env.BCV_RATE_URL ?? null;

  if (!sourceUrl) {
    return {
      provider: "BCV",
      currency: "BS",
      rate: null,
      fetchedAt: new Date().toISOString(),
      sourceUrl,
      error: "BCV_RATE_URL no configurado. Usando fallback manual.",
    };
  }

  try {
    const response = await fetch(sourceUrl, {
      next: { revalidate: Number(process.env.BCV_RATE_REVALIDATE_SECONDS ?? 3600) },
    });
    if (!response.ok) throw new Error(`BCV response ${response.status}`);
    const payload = await response.json() as { rate?: number; usd?: number; bcv?: number };
    const rate = Number(payload.rate ?? payload.usd ?? payload.bcv);

    return {
      provider: "BCV",
      currency: "BS",
      rate: Number.isFinite(rate) && rate > 0 ? rate : null,
      fetchedAt: new Date().toISOString(),
      sourceUrl,
      error: Number.isFinite(rate) && rate > 0 ? undefined : "Respuesta BCV sin tasa valida.",
    };
  } catch (error) {
    return {
      provider: "BCV",
      currency: "BS",
      rate: null,
      fetchedAt: new Date().toISOString(),
      sourceUrl,
      error: error instanceof Error ? error.message : "No se pudo consultar BCV.",
    };
  }
}

export const bcvSchedulerConfig = {
  envUrl: "BCV_RATE_URL",
  envSecret: "BCV_SYNC_SECRET",
  envInterval: "BCV_RATE_REVALIDATE_SECONDS",
  note: "Preparado para cron futuro. No ejecuta jobs automaticos en runtime web.",
};
