export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
}

export async function uniqueSlug(
  value: string,
  exists: (slug: string) => Promise<boolean>,
) {
  const base = slugify(value) || "business";
  let slug = base;
  let index = 2;

  while (await exists(slug)) {
    slug = `${base}-${index}`;
    index += 1;
  }

  return slug;
}
