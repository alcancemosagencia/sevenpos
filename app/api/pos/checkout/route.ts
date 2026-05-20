import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { performCheckout, type CheckoutInput } from "@/features/pos/checkout-service";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as CheckoutInput;
    const result = await performCheckout(input);
    if (result.ok) {
      revalidatePath("/pos");
      revalidatePath("/products");
      revalidatePath("/dashboard");
      revalidatePath("/pre-sales");
    }
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "No pudimos registrar la venta." },
      { status: 500 },
    );
  }
}
