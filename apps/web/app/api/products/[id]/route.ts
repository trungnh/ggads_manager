import { NextResponse } from "next/server";
import { db, products } from "@repo/db";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      code, 
      name, 
      shippingFee, 
      importPriceMicros, 
      sellingPriceMicros, 
      returnRate, 
      keywordCampaign, 
      adsAccountIds 
    } = body;

    const updatePayload: any = {
      updatedAt: new Date()
    };

    if (code !== undefined) updatePayload.code = code;
    if (name !== undefined) updatePayload.name = name;
    if (shippingFee !== undefined) updatePayload.shippingFee = String(shippingFee);
    if (importPriceMicros !== undefined) updatePayload.importPriceMicros = String(importPriceMicros);
    if (sellingPriceMicros !== undefined) updatePayload.sellingPriceMicros = String(sellingPriceMicros);
    if (returnRate !== undefined) updatePayload.returnRate = String(returnRate);
    if (keywordCampaign !== undefined) updatePayload.keywordCampaign = keywordCampaign;
    if (adsAccountIds !== undefined) updatePayload.adsAccountIds = Array.isArray(adsAccountIds) ? adsAccountIds : [];

    const updatedProduct = await db.update(products)
      .set(updatePayload)
      .where(and(eq(products.id, id), eq(products.userId, session.user.id)))
      .returning();

    return NextResponse.json({ product: updatedProduct[0] });
  } catch (error: any) {
    console.error("Failed to update product:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await db.delete(products)
      .where(and(eq(products.id, id), eq(products.userId, session.user.id)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete product:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
