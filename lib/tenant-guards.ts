import type { TenantContextValue } from "@/types/auth";

export function assertTenantBusinessId(tenant: Pick<TenantContextValue, "businessId">): string {
  if (!tenant.businessId) {
    throw new Error("Tenant businessId requerido.");
  }

  return tenant.businessId;
}

export function assertBelongsToBusiness<T extends { businessId: string | null | undefined }>(
  record: T | null | undefined,
  businessId: string,
  message = "El recurso no pertenece al negocio actual.",
): T {
  if (!record || record.businessId !== businessId) {
    throw new Error(message);
  }

  return record;
}

export function buildTenantWhere<T extends Record<string, unknown>>(businessId: string, where?: T) {
  return {
    ...(where ?? {}),
    businessId,
  };
}

export function buildTenantBranchWhere<T extends Record<string, unknown>>(businessId: string, branchId: string | null | undefined, where?: T) {
  return {
    ...(where ?? {}),
    businessId,
    ...(branchId ? { branchId } : {}),
  };
}
