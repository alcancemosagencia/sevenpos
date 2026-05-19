export const allowedImageTypes = ["image/png", "image/jpeg", "image/webp"] as const;

export type ImageUploadKind = "product" | "logo" | "cover" | "generic";

export const imageUploadLimitsMb: Record<ImageUploadKind, number> = {
  product: 3,
  logo: 2,
  cover: 5,
  generic: 3,
};

export function isAllowedImageType(type: string) {
  return allowedImageTypes.includes(type as (typeof allowedImageTypes)[number]);
}

export function imageExtensionForType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export function imageLimitBytes(kind: ImageUploadKind) {
  return imageUploadLimitsMb[kind] * 1024 * 1024;
}
