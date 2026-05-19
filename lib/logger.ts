type LogMeta = Record<string, unknown>;

function write(level: "info" | "warn" | "error", message: string, meta?: LogMeta) {
  if (process.env.NODE_ENV === "production" && level === "info") return;

  const payload = meta ? [message, meta] : [message];
  if (level === "error") {
    console.error("[SevenPOS]", ...payload);
    return;
  }
  if (level === "warn") {
    console.warn("[SevenPOS]", ...payload);
    return;
  }
  console.info("[SevenPOS]", ...payload);
}

export const logger = {
  info: (message: string, meta?: LogMeta) => write("info", message, meta),
  warn: (message: string, meta?: LogMeta) => write("warn", message, meta),
  error: (message: string, meta?: LogMeta) => write("error", message, meta),
};
