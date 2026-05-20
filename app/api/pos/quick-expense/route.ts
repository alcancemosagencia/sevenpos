import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createQuickExpense } from "@/features/cash/quick-expense-service";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await createQuickExpense(formData);
    if (result.ok) {
      revalidatePath("/pos");
      revalidatePath("/dashboard");
    }
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "No pudimos registrar el gasto." },
      { status: 500 },
    );
  }
}
