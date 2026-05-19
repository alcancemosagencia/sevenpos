import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { imageExtensionForType, imageLimitBytes, isAllowedImageType, type ImageUploadKind } from "@/lib/image-upload";
import { requireTenantContext } from "@/lib/tenant";

const validKinds = new Set<ImageUploadKind>(["product", "logo", "cover", "generic"]);

function normalizeKind(value: FormDataEntryValue | null): ImageUploadKind {
  return typeof value === "string" && validKinds.has(value as ImageUploadKind) ? (value as ImageUploadKind) : "generic";
}

async function uploadToSupabaseStorage(file: File, objectPath: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "sevenpos-uploads";

  if (!supabaseUrl || !serviceRoleKey) return null;

  const uploadUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${bucket}/${objectPath}`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": file.type,
      "x-upsert": "false",
    },
    body: Buffer.from(await file.arrayBuffer()),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "No pudimos subir la imagen a Supabase Storage.");
  }

  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${objectPath}`;
}

export async function POST(request: Request) {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) {
    return NextResponse.json({ error: "Negocio no disponible." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = normalizeKind(formData.get("kind"));

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Archivo requerido." }, { status: 400 });
  }

  if (!isAllowedImageType(file.type)) {
    return NextResponse.json({ error: "Formato no permitido. Usa PNG, JPG o WEBP." }, { status: 400 });
  }

  if (file.size > imageLimitBytes(kind)) {
    return NextResponse.json({ error: `La imagen supera el limite de ${imageLimitBytes(kind) / 1024 / 1024}MB.` }, { status: 400 });
  }

  const extension = imageExtensionForType(file.type);
  const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
  const storagePath = `${tenant.businessId}/${kind}/${fileName}`;
  const supabaseUrl = await uploadToSupabaseStorage(file, storagePath);

  if (supabaseUrl) {
    return NextResponse.json({
      url: supabaseUrl,
      path: storagePath,
    });
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Storage no configurado. Define NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y SUPABASE_STORAGE_BUCKET." },
      { status: 501 },
    );
  }

  const folder = path.join(process.cwd(), "public", "uploads", tenant.businessId, kind);
  await fs.mkdir(folder, { recursive: true });

  const absolutePath = path.join(folder, fileName);
  await fs.writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({
    url: `/uploads/${tenant.businessId}/${kind}/${fileName}`,
    path: storagePath,
  });
}
