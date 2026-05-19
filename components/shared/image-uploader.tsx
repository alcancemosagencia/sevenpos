"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { imageUploadLimitsMb, isAllowedImageType, type ImageUploadKind } from "@/lib/image-upload";
import { cn } from "@/lib/utils";

type ImageUploaderProps = {
  name: string;
  label: string;
  value?: string | null;
  kind?: ImageUploadKind;
  onChange?: (url: string) => void;
  className?: string;
  previewClassName?: string;
  variant?: "default" | "compact" | "avatar";
};

function uploadErrorMessage(message: string | undefined, maxMb: number) {
  const normalized = (message ?? "").toLowerCase();

  if (normalized.includes("size") || normalized.includes("large") || normalized.includes("max") || normalized.includes("excede")) {
    return `⚠️ La imagen excede el tamaño máximo permitido de ${maxMb}MB`;
  }

  if (normalized.includes("tipo") || normalized.includes("format") || normalized.includes("mime")) {
    return "⚠️ Formato no permitido. Usa PNG, JPG o WEBP.";
  }

  return "No pudimos subir la imagen. Intenta nuevamente.";
}

export function ImageUploader({
  name,
  label,
  value,
  kind = "generic",
  onChange,
  className,
  previewClassName,
  variant = "default",
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(value ?? "");
  const [preview, setPreview] = useState(value ?? "");
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAvatar = variant === "avatar";

  useEffect(() => {
    setUrl(value ?? "");
    setPreview(value ?? "");
  }, [value]);

  async function upload(file: File | null | undefined) {
    if (!file) return;
    setError(null);
    const maxMb = imageUploadLimitsMb[kind];

    if (!isAllowedImageType(file.type)) {
      setError("⚠️ Formato no permitido. Usa PNG, JPG o WEBP.");
      return;
    }

    if (file.size > maxMb * 1024 * 1024) {
      setError(`⚠️ La imagen excede el tamaño máximo permitido de ${maxMb}MB`);
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setPending(true);

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("kind", kind);
      const response = await fetch("/api/uploads/image", {
        method: "POST",
        body: formData,
      });
      const text = await response.text();
      let payload: { url?: string; error?: string } = {};

      try {
        payload = text ? (JSON.parse(text) as { url?: string; error?: string }) : {};
      } catch {
        payload = {};
      }

      if (!response.ok || !payload.url) {
        throw new Error(uploadErrorMessage(payload.error, maxMb));
      }

      setUrl(payload.url);
      setPreview(payload.url);
      onChange?.(payload.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadErrorMessage(uploadError.message, maxMb) : "No pudimos subir la imagen. Intenta nuevamente.");
      setPreview(url);
    } finally {
      setPending(false);
      URL.revokeObjectURL(localPreview);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeImage() {
    setUrl("");
    setPreview("");
    setError(null);
    onChange?.("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={cn("space-y-1.5", isAvatar && "max-w-[116px]", className)}>
      <div className={cn("flex items-center justify-between gap-3", isAvatar && "max-w-[112px]")}>
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <span className="text-[11px] font-medium text-muted-foreground">Max. {imageUploadLimitsMb[kind]}MB</span>
      </div>
      <input type="hidden" name={name} value={url} />
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => void upload(event.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void upload(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          "group relative flex w-full overflow-hidden rounded-lg border border-dashed bg-muted/25 text-left transition hover:border-primary/50 hover:bg-primary/5",
          variant === "default" && "min-h-32",
          variant === "compact" && "min-h-20",
          isAvatar && "size-24 min-h-0 shrink-0",
          dragging && "border-primary bg-primary/5",
          previewClassName,
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={label} className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className={cn("flex w-full flex-col items-center justify-center gap-2 text-center", isAvatar ? "p-2" : "p-4")}>
            <span className={cn("flex items-center justify-center rounded-lg bg-primary/10 text-primary", isAvatar ? "size-8" : "size-10")}>
              <ImageIcon className={cn(isAvatar ? "size-4" : "size-5")} />
            </span>
            <span className={cn("font-medium text-slate-800", isAvatar ? "text-xs" : "text-sm")}>Subir imagen</span>
            {!isAvatar ? <span className="text-xs text-muted-foreground">Click o arrastra aquí</span> : null}
          </div>
        )}
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-slate-950/72 px-3 py-2 text-xs font-medium text-white opacity-100 backdrop-blur-sm transition sm:opacity-0 sm:group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5">
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />}
            {pending ? "Subiendo..." : preview ? "Reemplazar" : "Seleccionar"}
          </span>
          {preview ? (
            <span
              role="button"
              tabIndex={0}
              className="inline-flex items-center gap-1 rounded-md bg-white/12 px-2 py-1"
              onClick={(event) => {
                event.stopPropagation();
                removeImage();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") removeImage();
              }}
            >
              <Trash2 className="size-3.5" />
              Quitar
            </span>
          ) : null}
        </span>
      </button>
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
      {preview ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={cn("h-8", isAvatar ? "w-auto px-3 text-xs" : "w-full")}
          onClick={() => inputRef.current?.click()}
          disabled={pending}
        >
          {pending ? "Subiendo..." : "Cambiar imagen"}
        </Button>
      ) : null}
    </div>
  );
}
