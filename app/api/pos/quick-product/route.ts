import { NextResponse } from "next/server";
import { createProductAction } from "@/features/products/actions";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await createProductAction({}, formData);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "No pudimos crear el producto." },
      { status: 500 },
    );
  }
}
