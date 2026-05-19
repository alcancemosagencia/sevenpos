import { NextResponse } from "next/server";
import { createQuickExpenseAction } from "@/features/cash/actions";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await createQuickExpenseAction({}, formData);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "No pudimos registrar el gasto." },
      { status: 500 },
    );
  }
}
