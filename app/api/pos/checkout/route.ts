import { NextResponse } from "next/server";
import { checkoutAction, type CheckoutInput } from "@/features/pos/actions";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as CheckoutInput;
    const result = await checkoutAction(input);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "No pudimos registrar la venta." },
      { status: 500 },
    );
  }
}
