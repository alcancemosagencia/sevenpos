import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { imageExtensionForType, imageLimitBytes, imageUploadLimitsMb, isAllowedImageType, type ImageUploadKind } from "@/lib/image-upload";
import { getBusinessCoverPath, getBusinessLogoPath, getGenericBusinessImagePath, getProductImagePath, localUploadFolderForObjectPath, localUploadUrlForObjectPath } from "@/lib/storage-paths";
import { requireTenantContext } from "@/lib/tenant";
import { assertTenantBusinessId } from "@/lib/tenant-guards";

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
    throw new Error("No se pudo subir la imagen");
  }

  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${objectPath}`;
}

function storagePathForKind(kind: ImageUploadKind, businessId: string, fileName: string) {
  if (kind === "product") return getProductImagePath(businessId, fileName);
  if (kind === "logo") return getBusinessLogoPath(businessId, fileName);
  if (kind === "cover") return getBusinessCoverPath(businessId, fileName);
  return getGenericBusinessImagePath(businessId, fileName);
}

export async function POST(request: Request) {
  const tenant = await requireTenantContext();
  let businessId: string;
  try {
    businessId = assertTenantBusinessId(tenant);
  } catch {
    return NextResponse.json({ error: "Negocio no disponible." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = normalizeKind(formData.get("kind"));

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Archivo requerido." }, { status: 400 });
  }

  if (!isAllowedImageType(file.type)) {
    return NextResponse.json({ error: "Formato no permitido" }, { status: 400 });
  }

  if (file.size > imageLimitBytes(kind)) {
    return NextResponse.json({ error: `La imagen excede el tamaño permitido de ${imageUploadLimitsMb[kind]}MB` }, { status: 400 });
  }

  const extension = imageExtensionForType(file.type);
  const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
  const storagePath = storagePathForKind(kind, businessId, fileName);
  let supabaseUrl: string | null = null;

  try {
    supabaseUrl = await uploadToSupabaseStorage(file, storagePath);
  } catch {
    return NextResponse.json({ error: "No se pudo subir la imagen" }, { status: 500 });
  }

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

  const folder = localUploadFolderForObjectPath(storagePath);
  await fs.mkdir(folder, { recursive: true });

  const absolutePath = path.join(folder, fileName);
  await fs.writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({
    url: localUploadUrlForObjectPath(storagePath),
    path: storagePath,
  });
}
