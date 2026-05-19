export function normalizeFeatureKey(feature: string) {
  return feature
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function featureListHas(features: string[] | null | undefined, feature: string) {
  const target = normalizeFeatureKey(feature);
  return (features ?? []).some((item) => normalizeFeatureKey(item) === target);
}
