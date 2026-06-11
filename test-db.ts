import { db, campaignsSnapshot } from "./packages/db/src";
import { config } from "dotenv";
config({ path: "./apps/web/.env" });

async function main() {
  const data = await db.select({
    campaignId: campaignsSnapshot.campaignId,
    biddingStrategyType: campaignsSnapshot.biddingStrategyType
  }).from(campaignsSnapshot).limit(5);
  
  console.log(data);
  process.exit(0);
}

main().catch(console.error);
