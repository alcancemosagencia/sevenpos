import { NextResponse } from "next/server";
import { getAdminSettings } from "@/features/admin/admin-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getAdminSettings();

  return NextResponse.json(settings.branding, {
    headers: { "cache-control": "no-store" },
  });
}
