import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db, crmConnections, telegramConnections, aiConnections } from "@repo/db";
import { eq } from "drizzle-orm";
import ConnectionsPageClient from "./ConnectionsPageClient";

export default async function ConnectionsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Query CRM connections
  const connections = await db.select()
    .from(crmConnections)
    .where(eq(crmConnections.userId, session.user.id))
    .orderBy(crmConnections.createdAt);

  // Query Telegram connections
  const telegramConns = await db.select()
    .from(telegramConnections)
    .where(eq(telegramConnections.userId, session.user.id))
    .orderBy(telegramConnections.createdAt);

  // Query AI Connections
  const aiConns = await db.select()
    .from(aiConnections)
    .where(eq(aiConnections.userId, session.user.id))
    .orderBy(aiConnections.createdAt);

  return (
    <div style={{ padding: '24px' }}>
      <ConnectionsPageClient 
        initialConnections={connections} 
        initialTelegramConnections={telegramConns}
        initialAiConnections={aiConns}
      />
    </div>
  );
}
