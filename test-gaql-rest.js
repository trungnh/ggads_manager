const postgres = require("postgres");
const dotenv = require("dotenv");

dotenv.config({ path: "./apps/web/.env" });

async function main() {
  console.log("=== BẮT ĐẦU CHẨN ĐOÁN TRỰC TIẾP QUA REST (POSTGRES DRIVER) ===");
  
  const sql = postgres(process.env.DATABASE_URL);

  // 1. Fetch ads account and its oauth connection
  const accountRes = await sql`
    SELECT a.*, o.refresh_token, o.id as conn_id
    FROM ads_accounts a
    JOIN oauth_connections o ON a.oauth_connection_id = o.id
    WHERE a.customer_id = '5084310313'
    LIMIT 1
  `;

  if (accountRes.length === 0) {
    console.error("Không tìm thấy tài khoản Ads 5084310313!");
    await sql.end();
    return;
  }

  const account = accountRes[0];
  console.log("Tìm thấy tài khoản:", account.name, account.customer_id);

  // 2. Refresh Google OAuth Access Token
  console.log("Đang lấy Access Token mới...");
  const tokenUrl = "https://oauth2.googleapis.com/token";
  const tokenParams = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: account.refresh_token,
    grant_type: "refresh_token"
  });

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString()
  });

  if (!tokenResponse.ok) {
    console.error("Lỗi refresh token:", await tokenResponse.text());
    await sql.end();
    return;
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;
  console.log("Lấy Access Token thành công.");

  // 3. Find Campaign ID in customer account
  const googleAdsUrl = `https://googleads.googleapis.com/v16/customers/${account.customer_id.replace(/-/g, "")}/googleAds:searchStream`;
  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    "Content-Type": "application/json"
  };

  const campaignsQuery = {
    query: "SELECT campaign.id, campaign.name FROM campaign LIMIT 20"
  };

  console.log("Đang quét danh sách chiến dịch...");
  const campRes = await fetch(googleAdsUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(campaignsQuery)
  });

  if (!campRes.ok) {
    console.error("Lỗi quét chiến dịch:", await campRes.text());
    await sql.end();
    return;
  }

  const campData = await campRes.json();
  let campaigns = [];
  if (Array.isArray(campData)) {
    campData.forEach(chunk => {
      if (chunk.results) campaigns.push(...chunk.results);
    });
  } else if (campData.results) {
    campaigns.push(...campData.results);
  }

  const targetCampaign = campaigns.find(c => c.campaign.name.includes("Cây trồng trong nhà"));
  if (!targetCampaign) {
    console.log("Không tìm thấy chiến dịch 'Cây trồng trong nhà'!");
    console.log("Danh sách hiện tại:");
    campaigns.forEach(c => console.log(`- ID: ${c.campaign.id}, Name: ${c.campaign.name}`));
    await sql.end();
    return;
  }

  const campaignId = targetCampaign.campaign.id;
  console.log(`Chiến dịch: ${targetCampaign.campaign.name} (ID: ${campaignId})`);

  // 4. Fetch all PMax assets and print their types, fields, and metrics!
  const query = {
    query: `
      SELECT
        campaign.id,
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
        asset.text_asset.text,
        metrics.cost_micros,
        metrics.clicks,
        metrics.conversions
      FROM asset_group_asset
      WHERE campaign.id = '${campaignId}'
    `
  };

  console.log("Đang tải dữ liệu Creative Assets...");
  const assetRes = await fetch(googleAdsUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(query)
  });

  if (!assetRes.ok) {
    console.error("Lỗi tải creative assets:", await assetRes.text());
    await sql.end();
    return;
  }

  const assetData = await assetRes.json();
  let rawAssets = [];
  if (Array.isArray(assetData)) {
    assetData.forEach(chunk => {
      if (chunk.results) rawAssets.push(...chunk.results);
    });
  } else if (assetData.results) {
    rawAssets.push(...assetData.results);
  }

  console.log(`\nTìm thấy ${rawAssets.length} records trong asset_group_asset:`);
  rawAssets.forEach((item, idx) => {
    const asset = item.asset || {};
    const aga = item.assetGroupAsset || {};
    const metrics = item.metrics || {};
    console.log(`\n${idx + 1}. ID: ${asset.id}, Name: ${asset.name}, Type: ${asset.type}`);
    console.log(`   FieldType: ${aga.fieldType}, PerformanceLabel: ${aga.performanceLabel}`);
    console.log(`   Metrics: Clicks=${metrics.clicks || 0}, Cost=${(parseFloat(metrics.costMicros || 0) / 1000000)} đ, Conversions=${metrics.conversions || 0}`);
    if (asset.imageAsset) {
      console.log(`   ImageAsset url:`, asset.imageAsset.fullSize?.url);
    }
  });

  await sql.end();
}

main().catch(console.error);
