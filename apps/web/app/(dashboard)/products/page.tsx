import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db, products, adsAccounts, userAdsAccounts } from "@repo/db";
import { eq } from "drizzle-orm";
import { ProductsClient } from "./ProductsClient";

export default async function ProductsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch products
  const userProducts = await db.query.products.findMany({
    where: eq(products.userId, session.user.id),
    orderBy: (products, { desc }) => [desc(products.createdAt)]
  });

  // Fetch connected ads accounts
  let accountsList = await db.select({
    id: adsAccounts.id,
    name: adsAccounts.name,
    customerId: adsAccounts.customerId,
    status: adsAccounts.status
  })
  .from(adsAccounts)
  .innerJoin(userAdsAccounts, eq(userAdsAccounts.adsAccountId, adsAccounts.id))
  .where(eq(userAdsAccounts.userId, session.user.id));

  // Fallback: If no accounts linked directly, return all ACTIVE accounts
  if (accountsList.length === 0) {
    accountsList = await db.select({
      id: adsAccounts.id,
      name: adsAccounts.name,
      customerId: adsAccounts.customerId,
      status: adsAccounts.status
    })
    .from(adsAccounts)
    .where(eq(adsAccounts.status, 'ACTIVE'));
  }

  // Serialize decimal values or other fields if needed, but Next.js Server Components pass them safely
  const serializedProducts = userProducts.map(p => ({
    ...p,
    // Convert Dates to string if needed, or Next.js can pass date objects for initial render
    createdAt: p.createdAt ? new Date(p.createdAt) : null,
    updatedAt: p.updatedAt ? new Date(p.updatedAt) : null,
  }));

  return (
    <ProductsClient 
      initialProducts={serializedProducts}
      adsAccounts={accountsList}
    />
  );
}

