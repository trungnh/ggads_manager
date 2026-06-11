import { db, adsAccounts, campaignCrmLinks, crmConnections } from "./packages/db/src/index";
import { eq, and } from "drizzle-orm";

async function check() {
  const customerId = "9720114325";
  
  const [account] = await db.select().from(adsAccounts).where(eq(adsAccounts.customerId, customerId)).limit(1);
  console.log("Account:", account ? account.name : "NOT FOUND");

  const links = await db.select({
    crmName: crmConnections.name,
    crmType: crmConnections.type
  })
  .from(campaignCrmLinks)
  .innerJoin(crmConnections, eq(campaignCrmLinks.crmConnectionId, crmConnections.id))
  .where(eq(campaignCrmLinks.customerId, customerId));

  console.log("CRM Links:", links);
  process.exit(0);
}

check();
