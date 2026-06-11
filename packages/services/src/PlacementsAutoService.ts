import crypto from 'crypto';
import { db, adsAccounts, userAdsAccounts, aiConnections, placementExclusionLogs } from '@repo/db';
import { eq, and } from 'drizzle-orm';
import { PlacementsService } from '@repo/google-ads/src/placements';
import { MutationsService } from '@repo/google-ads/src/mutations';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? process.env.ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)
  : 'default_secret_key_needs_32_byte';
const IV_LENGTH = 16; 

function decrypt(text: string): string {
  if (!text || !text.includes(':')) return text;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift() as string, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error("[PlacementsAutoService] Decryption error:", error);
    return text;
  }
}

// Zero-auth YouTube Video-to-Channel Resolver
async function resolveChannelFromVideo(videoId: string): Promise<{ channelId: string; channelTitle: string; videoTitle: string } | null> {
  try {
    if (!videoId || videoId.length !== 11) return null;

    const apiKey = process.env.GOOGLE_SHEET_API_KEY;
    if (apiKey && apiKey.startsWith("AIzaSy")) {
      try {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const item = data.items?.[0];
          if (item) {
            return {
              channelId: item.snippet.channelId,
              channelTitle: item.snippet.channelTitle,
              videoTitle: item.snippet.title
            };
          }
        }
      } catch (e) {
        console.error("[PlacementsAutoService] API Resolver failed, fallback to scraper:", e);
      }
    }

    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(watchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });

    if (!response.ok) return null;
    const html = await response.text();

    let channelIdMatch = html.match(/itemprop="channelId"\s+content="(UC[A-Za-z0-9_-]{22})"/);
    let channelId = channelIdMatch ? channelIdMatch[1] : null;

    if (!channelId) {
      const jsonMatch = html.match(/"channelId"\s*:\s*"(UC[A-Za-z0-9_-]{22})"/);
      channelId = jsonMatch ? jsonMatch[1] : null;
    }

    if (!channelId) return null;

    const titleMatch = html.match(/<meta\s+name="title"\s+content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
    const videoTitle = titleMatch ? titleMatch[1].replace(" - YouTube", "").trim() : "Video YouTube";

    const nameMatch = html.match(/<link\s+itemprop="name"\s+content="([^"]+)"/i);
    let channelTitle = nameMatch ? nameMatch[1].trim() : "";

    if (!channelTitle) {
      const authorMatch = html.match(/"author"\s*:\s*"([^"]+)"/);
      channelTitle = authorMatch ? authorMatch[1].trim() : "Kênh YouTube";
    }

    return { channelId, channelTitle, videoTitle };
  } catch (error) {
    console.error("[PlacementsAutoService] Video resolution error:", error);
    return null;
  }
}

export class PlacementsAutoService {
  /**
   * Executes scheduled scan and auto-exclusion for a single ads account
   */
  static async runAutoExclusion(accountId: string): Promise<boolean> {
    try {
      console.log(`[PlacementsAutoService] Starting scheduled exclusion for Account ID: ${accountId}`);

      // 1. Fetch Ads Account details
      const account = await db.query.adsAccounts.findFirst({
        where: eq(adsAccounts.id, accountId)
      });

      if (!account || !account.oauthConnectionId) {
        console.warn(`[PlacementsAutoService] Account ${accountId} not found or OAuth connection missing. skipping...`);
        return false;
      }

      // 2. Fetch User associated with account to retrieve AI configurations
      const userAccount = await db.query.userAdsAccounts.findFirst({
        where: eq(userAdsAccounts.adsAccountId, account.id)
      });

      if (!userAccount) {
        console.warn(`[PlacementsAutoService] User account mapping not found for Account ID: ${accountId}`);
        return false;
      }

      // 3. Retrieve and decrypt active Gemini AI Connection
      let activeConnection = await db.query.aiConnections.findFirst({
        where: and(
          eq(aiConnections.userId, userAccount.userId),
          eq(aiConnections.provider, "gemini")
        )
      });

      let isPro = false;
      if (!activeConnection) {
        activeConnection = await db.query.aiConnections.findFirst({
          where: and(
            eq(aiConnections.userId, userAccount.userId),
            eq(aiConnections.provider, "gemini-pro")
          )
        });
        isPro = true;
      }

      if (!activeConnection) {
        console.warn(`[PlacementsAutoService] AI API connection not configured for User: ${userAccount.userId}`);
        return false;
      }

      const apiKey = decrypt(activeConnection.apiKey);
      if (!apiKey) {
        console.warn(`[PlacementsAutoService] Failed to decrypt AI API Key for User: ${userAccount.userId}`);
        return false;
      }

      const model = isPro ? "gemini-2.5-pro" : "gemini-3.1-flash";
      const range = account.placementsAutoExcludeRange || "YESTERDAY";
      const productContext = account.placementsProductContext || "";

      // 4. Query placement performance data from Google Ads API
      console.log(`[PlacementsAutoService] Fetching Google Ads Placements. range: ${range}`);
      const placementsService = new PlacementsService(
        account.oauthConnectionId,
        account.customerId,
        account.loginCustomerId || undefined
      );

      const rawPlacements = await placementsService.getPlacementsPerformance(range);

      if (!rawPlacements || rawPlacements.length === 0) {
        console.log(`[PlacementsAutoService] No placements found for account: ${account.customerId}`);
        return true;
      }

      // 5. Apply Heuristics Filtering
      const wastefulCandidates = rawPlacements
        .filter((p: any) => {
          const impressions = parseInt(p.metrics?.impressions || "0");
          const conversions = parseInt(p.metrics?.conversions || "0");
          const rawCost = parseFloat(p.metrics?.costMicros || "0");
          const costVal = Math.round(rawCost / 1000000);

          if (impressions > 0 && conversions === 0) return true;

          if (conversions > 0) {
            if (costVal > 0) {
              const cpa = costVal / conversions;
              return cpa > 200000;
            }
            const estimatedCost = Math.round((impressions / 1000) * 25000);
            const estimatedCpa = estimatedCost / conversions;
            return estimatedCpa > 200000;
          }
          return false;
        })
        .map((p: any) => {
          const impressions = parseInt(p.metrics?.impressions || "0");
          const clicks = parseInt(p.metrics?.clicks || "0");
          const conversions = parseInt(p.metrics?.conversions || "0");
          const rawCost = parseFloat(p.metrics?.costMicros || "0");
          
          let costVal = Math.round(rawCost / 1000000);
          if (costVal === 0 && impressions > 0) {
            costVal = Math.round((impressions / 1000) * 25000);
          }

          return {
            url: p.detailPlacementView?.placement || "",
            displayName: p.detailPlacementView?.displayName || "Unknown Placement",
            type: p.detailPlacementView?.placementType || "WEBSITE",
            cost: costVal.toString(),
            clicks,
            conversions,
            impressions
          };
        })
        .sort((a, b) => parseFloat(b.cost) - parseFloat(a.cost));

      if (wastefulCandidates.length === 0) {
        console.log(`[PlacementsAutoService] No wasteful candidates identified.`);
        return true;
      }

      // Take the top 100 wasteful ones
      const batchToAnalyze = wastefulCandidates.slice(0, 100);

      // 6. Resolve YouTube Video-to-Channel and filter out malformed or raw youtube.com domains
      const resolvedBatch: any[] = [];
      await Promise.all(
        batchToAnalyze.map(async (p) => {
          const isVideoId = p.url.length === 11 && !p.url.includes(".");
          const cleanVideoId = isVideoId ? p.url : null;

          if (cleanVideoId) {
            const resolved = await resolveChannelFromVideo(cleanVideoId);
            if (resolved) {
              resolvedBatch.push({
                ...p,
                url: `youtube.com/channel/${resolved.channelId}`,
                displayName: `${resolved.channelTitle} (Kênh chứa video rác: "${resolved.videoTitle}")`,
                type: "YOUTUBE_CHANNEL"
              });
            } else {
              console.log(`[PlacementsAutoService] Skipped unresolved YouTube Video ID: ${cleanVideoId}`);
            }
            return;
          }

          // Skip raw youtube.com pages that cannot be excluded in neg criteria
          const cleanUrl = p.url.toLowerCase().trim();
          if (cleanUrl === "youtube.com" || cleanUrl === "www.youtube.com" || cleanUrl.startsWith("youtube.com/")) {
            const isChannel = cleanUrl.includes("youtube.com/channel/") || 
                              cleanUrl.includes("youtube.com/c/") || 
                              cleanUrl.includes("youtube.com/user/");
            if (!isChannel) {
              console.log(`[PlacementsAutoService] Skipped invalid raw youtube placement: ${p.url}`);
              return;
            }
          }

          // Skip invalid placements lacking dots
          if (!p.url.includes(".")) {
            console.log(`[PlacementsAutoService] Skipped invalid format placement: ${p.url}`);
            return;
          }

          resolvedBatch.push(p);
        })
      );

      // Deduplicate resolved candidates
      const uniqueResolvedBatch: any[] = [];
      const seenUrls = new Set<string>();
      for (const item of resolvedBatch) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          uniqueResolvedBatch.push(item);
        }
      }

      if (uniqueResolvedBatch.length === 0) {
        console.log(`[PlacementsAutoService] No unique placements to evaluate after resolution and filters.`);
        return true;
      }

      // 7. Call Gemini for AI Classification using product context
      console.log(`[PlacementsAutoService] Sending ${uniqueResolvedBatch.length} placements to Gemini AI (${model})`);
      const contextSection = productContext 
        ? `
Đặc biệt, Nhà quảng cáo hiện tại đang chạy chiến dịch quảng cáo với sản phẩm/ngữ cảnh sau:
"${productContext}"

Nhiệm vụ phân tích chân dung & lọc vị trí ngách cho bạn:
1. Hãy tự động phân tích chân dung, công việc, thói quen sinh hoạt và phong cách sống của tệp khách hàng tiềm năng mua sản phẩm trên.
2. Từ đó, hãy tự suy luận ra những chủ đề vlog, sở thích phụ, tin tức, mẹo vặt hoặc hoạt động đời sống nào mà tệp khách hàng này sẽ hay theo dõi trong đời sống thường ngày (ví dụ: nếu bán sản phẩm nông nghiệp thì họ xem vlogs chăn nuôi, ao cá, trồng trọt, tin địa phương; nếu bán mỹ phẩm thì họ xem vlogs skincare, trang điểm, mẹ bé, thời trang; nếu bán đồ gia dụng thì họ xem mẹo vặt nấu ăn, dọn dẹp nhà cửa...).
3. Phân loại theo tiêu chí:
   - Nếu vị trí hiển thị nào trùng khớp chủ đề trực tiếp của sản phẩm, hãy phân loại vị trí đó là "Clean" (giữ lại).
   - Nếu vị trí hiển thị nào trùng khớp với hành vi, thói quen sinh hoạt, sở thích phụ hoặc đời sống sinh hoạt của tệp khách hàng tiềm năng đã suy luận ở trên, hãy phân loại vị trí đó là "Behavioral Niche" (giữ lại).
`
        : `
Nhà quảng cáo chưa cung cấp ngữ cảnh sản phẩm cụ thể. Hãy mặc định họ đang bán các sản phẩm gia dụng, mỹ phẩm hoặc thương mại điện tử phổ thông cho người mua sắm online đại trà tại Việt Nam.
Do đó:
- Các kênh vlogs đời sống gia đình thiết thực, chia sẻ mẹo vặt hàng ngày, nấu ăn, hoặc tin tức địa phương chất lượng cao vẫn nên được phân loại là "Behavioral Niche" hoặc "Clean" (giữ lại) vì tệp khách hàng đại trà vẫn theo dõi những nội dung này.
- Chỉ loại bỏ các vị trí lãng phí thực sự gây lãng phí như kênh trẻ em (Kids Content), ứng dụng game di động (Casual Games) dễ bấm nhầm, hoặc các trang web/kênh tin giật gân, spam câu view (Spam/Clickbait).
`;

      const prompt = `Bạn là chuyên gia phân tích tối ưu hóa chiến dịch Google Ads tại thị trường Việt Nam.
Hãy phân loại các Vị trí hiển thị (Placement URL) dưới đây thành một trong năm nhóm phân loại sau:
- "Kids Content" (Kênh hoạt hình, đồ chơi, nhạc thiếu nhi, Peppa Pig, v.v. gây lãng phí do trẻ em bấm nhầm)
- "Casual Games" (Ứng dụng trò chơi di động thông thường, game nuôi thú, game mini dễ kích nhầm quảng cáo)
- "Spam/Clickbait" (Các website tin tức lá cải giật gân, website spam nội dung, quảng cáo pop-under)
- "Clean" (Trang web tin tức chính thống chất lượng hoặc nội dung chất lượng cao, HOẶC kênh chuyên môn/vlog ngách trùng khớp trực tiếp với ngữ cảnh của sản phẩm quảng cáo)
- "Behavioral Niche" (Các vị trí hiển thị, kênh YouTube, video hoặc website chia sẻ về sở thích, đời sống, vlogs cá nhân hoặc tin tức địa phương/chuyên ngành gắn liền với hành vi, thói quen sinh hoạt và mối quan tâm phụ của đối tượng khách hàng mục tiêu được suy luận từ Ngữ cảnh sản phẩm)
${contextSection}
Danh sách Placements cần đánh giá:
${uniqueResolvedBatch.map((p, idx) => `${idx + 1}. URL: ${p.url} (${p.displayName})`).join("\n")}

Hãy trả về kết quả dưới dạng JSON duy nhất, dạng mảng các đối tượng chứa:
[
  { "url": "url_ở_trên", "category": "Kids Content | Casual Games | Spam/Clickbait | Clean | Behavioral Niche", "reason": "Lý do phân tích bằng tiếng Việt ngắn gọn dưới 15 từ" }
]
Lưu ý: Chỉ trả về chuỗi JSON thô, không viết thêm lời bình luận, không bọc trong khối code block markdown (\`\`\`json).`;

      const aiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(aiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!response.ok) {
        console.error(`[PlacementsAutoService] Gemini API returned error: ${response.status}`);
        return false;
      }

      const resData = await response.json();
      const aiText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!aiText) return false;

      let jsonText = aiText.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }

      let aiResults: Array<{ url: string; category: string; reason: string }> = JSON.parse(jsonText);

      // 8. Filter exclusions (exclude anything that is NOT "Clean" or "Behavioral Niche")
      const exclusionsToRun = uniqueResolvedBatch.filter(p => {
        const evalRes = aiResults.find(r => r.url === p.url);
        const category = evalRes?.category || "Unknown";
        return category !== "Clean" && category !== "Behavioral Niche";
      });

      if (exclusionsToRun.length === 0) {
        console.log(`[PlacementsAutoService] All candidates classified as Clean. No exclusions required.`);
        return true;
      }

      const urlsToExclude = exclusionsToRun.map(p => p.url);
      console.log(`[PlacementsAutoService] Automating exclusion for ${urlsToExclude.length} placements:`, urlsToExclude);

      // 9. Execute exclusion via MutationsService
      if (!account.customerId.startsWith("123")) {
        const mutationsService = new MutationsService(
          account.oauthConnectionId,
          account.customerId,
          account.loginCustomerId || undefined
        );
        await mutationsService.excludePlacementsAtAccountLevel(urlsToExclude);
      } else {
        console.log(`[PlacementsAutoService] Demo customer ID detected. Exclusion SIMULATED.`);
      }

      // 10. Record exclusions into database logs with resolved status
      for (const p of exclusionsToRun) {
        const aiEval = aiResults.find(r => r.url === p.url);
        const category = aiEval?.category || "Unknown";
        const placementName = aiEval?.reason ? `${p.displayName} (${aiEval.reason})` : p.displayName;

        await db.insert(placementExclusionLogs).values({
          adsAccountId: accountId,
          placementUrl: p.url,
          placementType: p.type === "MOBILE_APPLICATION" ? "MOBILE_APP" : p.type,
          placementName: placementName,
          costWasted: p.cost,
          impressions: p.impressions,
          clicks: p.clicks,
          conversions: p.conversions,
          aiCategory: category,
          status: "excluded",
          resolvedAt: new Date()
        });
      }

      console.log(`[PlacementsAutoService] Auto-exclusion successfully executed!`);
      return true;

    } catch (e: any) {
      console.error(`[PlacementsAutoService] Failed to run automated exclusions:`, e.message);
      return false;
    }
  }
}
