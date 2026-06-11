import { CampaignsService } from "./packages/google-ads/src/campaigns";
import { config } from "dotenv";
config({ path: "./apps/web/.env" });

async function main() {
  const service = new CampaignsService("dummy-user-id", "5541508335", "5541508335");
  const today = new Date().toISOString().split("T")[0];
  const campaigns = await service.getCampaignsForDate(today);
  console.log(JSON.stringify(campaigns[0], null, 2));
}

main().catch(console.error);
