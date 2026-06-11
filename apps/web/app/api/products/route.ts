import { NextResponse } from "next/server";
import { db, products } from "@repo/db";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const userProducts = await db.query.products.findMany({
      where: eq(products.userId, session.user.id)
    });

    return NextResponse.json({ products: userProducts });
  } catch (error: any) {
    console.error("Failed to fetch products:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const newProduct = await db.insert(products).values({
      userId: session.user.id,
      code,
      name,
      shippingFee: shippingFee ? String(shippingFee) : "0",
      importPriceMicros: importPriceMicros ? String(importPriceMicros) : "0",
      sellingPriceMicros: sellingPriceMicros ? String(sellingPriceMicros) : "0",
      returnRate: returnRate ? String(returnRate) : "0",
      keywordCampaign,
      adsAccountIds: Array.isArray(adsAccountIds) ? adsAccountIds : []
    }).returning();

    return NextResponse.json({ product: newProduct[0] });
  } catch (error: any) {
    console.error("Failed to create product:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
