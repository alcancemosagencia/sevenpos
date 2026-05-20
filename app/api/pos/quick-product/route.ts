import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createProduct } from "@/features/products/create-product-service";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await createProduct(formData);
    if (result.ok) {
      revalidatePath("/products");
      revalidatePath("/pos");
    }
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "No pudimos crear el producto." },
      { status: 500 },
    );
  }
}
