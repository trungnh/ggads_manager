const { db } = require("./packages/db/dist/index.js");
const { adsAccounts } = require("./packages/db/src/schema.ts");
const { eq } = require("drizzle-orm");
const { GoogleAdsClient } = require("./packages/google-ads/src/client.ts");
const dotenv = require("dotenv");

dotenv.config({ path: "./apps/web/.env" });

async function main() {
  console.log("=== BẮT ĐẦU CHẨN ĐOÁN REAL ASSETS ===");
  
  // Find customer 5084310313
  const account = await db.query.adsAccounts.findFirst({
    where: eq(adsAccounts.customerId, "5084310313")
  });

  if (!account) {
    console.error("Không tìm thấy tài khoản Ads 5084310313 trong DB!");
    return;
  }

  console.log("Tìm thấy tài khoản:", account.name, account.id);

  const client = new GoogleAdsClient(
    account.oauthConnectionId,
    account.customerId,
    account.loginCustomerId || undefined
  );

  // Fetch campaigns to find the selected one
  const campaignsQuery = `
    SELECT campaign.id, campaign.name 
    FROM campaign 
    LIMIT 20
  `;
  const campaigns = await client.searchStream(campaignsQuery);
  console.log("\nDanh sách chiến dịch:");
  campaigns.forEach(c => {
    console.log(`- ID: ${c.campaign.id}, Name: ${c.campaign.name}`);
  });

  const targetCampaign = campaigns.find(c => c.campaign.name.includes("Cây trồng trong nhà"));
  if (!targetCampaign) {
    console.log("Không tìm thấy chiến dịch 'Cây trồng trong nhà'!");
    return;
  }

  const campaignId = targetCampaign.campaign.id;
  console.log(`\nChiến dịch mục tiêu: ID: ${campaignId}, Name: ${targetCampaign.campaign.name}`);

  // Fetch ALL fields under asset_group_asset to see the field types and JSON payload
  const query = `
    SELECT
      asset_group.id,
      asset_group.name,
      asset_group_asset.asset,
      asset_group_asset.field_type,
      asset_group_asset.performance_label,
      asset.id,
      asset.name,
      asset.type,
      asset.image_asset.full_size.url,
      asset.youtube_video_asset.youtube_video_title,
      asset.youtube_video_asset.youtube_video_id,
      asset.text_asset.text
    FROM asset_group_asset
    WHERE campaign.id = '${campaignId}'
  `;

  const results = await client.searchStream(query);
  console.log(`\nTìm thấy ${results.length} assets trong asset_group_asset:`);
  
  results.forEach((item, idx) => {
    const asset = item.asset || {};
    const aga = item.assetGroupAsset || {};
    console.log(`${idx + 1}. ID: ${asset.id}, Name: ${asset.name}, Type: ${asset.type}, FieldType: ${aga.fieldType}, Performance: ${aga.performanceLabel}`);
    if (asset.imageAsset) {
      console.log(`   -> ImageAsset url:`, asset.imageAsset.fullSize?.url || "null");
    }
    if (asset.youtubeVideoAsset) {
      console.log(`   -> VideoAsset:`, asset.youtubeVideoAsset.youtubeVideoId);
    }
  });
}

main().catch(console.error);
