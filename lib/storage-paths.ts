import path from "path";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export function getProductImagePath(businessId: string, fileName: string) {
  return `products/${businessId}/${sanitizeFileName(fileName)}`;
}

export function getBusinessLogoPath(businessId: string, fileName: string) {
  return `businesses/${businessId}/logo/${sanitizeFileName(fileName)}`;
}

export function getBusinessCoverPath(businessId: string, fileName: string) {
  return `businesses/${businessId}/cover/${sanitizeFileName(fileName)}`;
}

export function getGenericBusinessImagePath(businessId: string, fileName: string) {
  return `businesses/${businessId}/generic/${sanitizeFileName(fileName)}`;
}

export function localUploadFolderForObjectPath(objectPath: string) {
  const safeParts = objectPath.split("/").filter(Boolean).map(sanitizeFileName);
  return path.join(process.cwd(), "public", "uploads", ...safeParts.slice(0, -1));
}

export function localUploadUrlForObjectPath(objectPath: string) {
  return `/uploads/${objectPath.split("/").filter(Boolean).map(sanitizeFileName).join("/")}`;
}
