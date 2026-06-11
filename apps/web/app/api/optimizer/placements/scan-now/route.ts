import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@repo/db";
import { aiConnections, placementExclusionLogs, adsAccounts } from "@repo/db/src/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import { PlacementsService } from "@repo/google-ads/src/placements";
import { resolveChannelFromVideo } from "@/lib/youtube";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountId, datePreset, customStartDate, customEndDate, productContext, aiProvider } = await req.json();

    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    // 1. Fetch the Ads Account details
    const account = await db.query.adsAccounts.findFirst({
      where: eq(adsAccounts.id, accountId)
    });

    if (!account) {
      return NextResponse.json({ error: "Ads Account không tìm thấy." }, { status: 404 });
    }

    // Ensure account is connected via Google OAuth
    if (!account.oauthConnectionId) {
      return NextResponse.json({ 
        error: `Tài khoản quảng cáo "${account.name}" chưa được liên kết Google OAuth. Vui lòng chọn tài khoản thực tế đã liên kết để quét dữ liệu thật.` 
      }, { status: 400 });
    }

    // Sync productContext to database for this account so it's persisted
    if (productContext !== undefined) {
      await db.update(adsAccounts)
        .set({ placementsProductContext: productContext })
        .where(eq(adsAccounts.id, accountId));
    }

    // 2. Fetch AI connections for the user based on dynamic provider selection
    const selectedProvider = aiProvider || "gemini";
    let activeConnection = await db.query.aiConnections.findFirst({
      where: and(
        eq(aiConnections.userId, session.user.id),
        eq(aiConnections.provider, selectedProvider)
      )
    });

    // Fallback if specific connection is not found, try to load any available AI Key
    if (!activeConnection) {
      activeConnection = await db.query.aiConnections.findFirst({
        where: and(
          eq(aiConnections.userId, session.user.id),
          eq(aiConnections.provider, selectedProvider === "gemini" ? "gemini-pro" : "gemini")
        )
      });
    }

    if (!activeConnection) {
      const providerLabel = selectedProvider === 'openai' ? 'OpenAI' : selectedProvider === 'gemini-pro' ? 'Gemini Pro' : 'Gemini Flash';
      return NextResponse.json({ 
        error: `Chưa cấu hình API Key cho nhà cung cấp AI: "${providerLabel}". Vui lòng truy cập trang "Kết nối AI" để thiết lập API Key trước.` 
      }, { status: 400 });
    }

    const apiKey = decrypt(activeConnection.apiKey);
    if (!apiKey) {
      return NextResponse.json({ error: "API Key không hợp lệ" }, { status: 400 });
    }

    const finalProvider = activeConnection.provider;
    // Define standard model based on provider
    const model = finalProvider === "gemini-pro" 
      ? "gemini-2.5-pro" 
      : finalProvider === "openai" 
        ? "gpt-4o-mini" 
        : "gemini-3.1-flash";

    // 3. Query REAL placement performance data from Google Ads API
    let rawPlacements = [];
    try {
      console.log(`[SCAN_NOW] Pulling placements from Google Ads for CustomerId: ${account.customerId}, range: ${datePreset || 'LAST_30_DAYS'}`);
      const placementsService = new PlacementsService(
        account.oauthConnectionId,
        account.customerId,
        account.loginCustomerId || undefined
      );
      rawPlacements = await placementsService.getPlacementsPerformance(
        datePreset,
        customStartDate,
        customEndDate
      );
    } catch (e: any) {
      console.error("Google Ads Placement Query failed:", e);
      return NextResponse.json({ 
        error: `Không thể kéo dữ liệu từ Google Ads API: ${e.message}` 
      }, { status: 502 });
    }

    let periodText = "trong 30 ngày qua";
    if (datePreset === "LAST_7_DAYS") periodText = "trong 7 ngày qua";
    else if (datePreset === "LAST_14_DAYS") periodText = "trong 14 ngày qua";
    else if (datePreset === "CUSTOM" && customStartDate && customEndDate) {
      periodText = `từ ${customStartDate} đến ${customEndDate}`;
    }

    if (!rawPlacements || rawPlacements.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: `Tài khoản của bạn rất sạch sẽ. Google Ads không báo nhận bất kỳ vị trí hiển thị (placement) nào phát sinh chi phí ${periodText}.`,
        count: 0
      });
    }

    // 4. Heuristic Filtering:
    // Only evaluate placements that:
    // - impressions > 0
    // - conversions == 0 (no conversions)
    // - OR conversions > 0 but CPA > placementsCpaThreshold VND (high waste)
    // - Sort by cost (real or CPM estimated) descending to analyze the most wasteful ones first.
    const cpaLimit = account.placementsCpaThreshold || 250000;
    
    const wastefulCandidates = rawPlacements
      .filter((p: any) => {
        const impressions = parseInt(p.metrics?.impressions || "0");
        const conversions = parseInt(p.metrics?.conversions || "0");
        const rawCost = parseFloat(p.metrics?.costMicros || "0");
        const costVal = Math.round(rawCost / 1000000);

        if (impressions > 0 && conversions === 0) {
          return true;
        }

        if (conversions > 0) {
          // If real cost is available, check CPA
          if (costVal > 0) {
            const cpa = costVal / conversions;
            return cpa > cpaLimit;
          }
          // If PMax (real cost is 0), estimate CPM cost
          const estimatedCost = Math.round((impressions / 1000) * 25000);
          const estimatedCpa = estimatedCost / conversions;
          return estimatedCpa > cpaLimit;
        }

        return false;
      })
      .map((p: any) => {
        const impressions = parseInt(p.metrics?.impressions || "0");
        const clicks = parseInt(p.metrics?.clicks || "0");
        const conversions = parseInt(p.metrics?.conversions || "0");
        const rawCost = parseFloat(p.metrics?.costMicros || "0");
        
        // Dynamic Wasted Cost:
        // - If rawCost > 0, use it.
        // - If rawCost === 0 (as in Performance Max / Demand Gen placement views),
        //   estimate wasted cost using a highly accurate Display/Video CPM of 25,000 VND for Vietnam.
        let costVal = Math.round(rawCost / 1000000);
        if (costVal === 0 && impressions > 0) {
          costVal = Math.round((impressions / 1000) * 25000); // 25,000đ CPM standard estimate
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
      return NextResponse.json({ 
        success: true, 
        message: `Không phát hiện vị trí nào lãng phí ngân sách hoặc có chi phí CPA cao bất thường ${periodText}.`,
        count: 0
      });
    }

    // Take the top 100 most wasteful ones to evaluate with Gemini (cost-efficient batching)
    const batchToAnalyze = wastefulCandidates.slice(0, 100);

    // 4.5. Resolve parent YouTube channels for any video placements in the batch
    const resolvedBatch: any[] = [];
    await Promise.all(
      batchToAnalyze.map(async (p) => {
        // If URL is exactly 11 characters (valid YouTube video ID) or has no dots
        const isVideoId = p.url.length === 11 && !p.url.includes(".");
        const cleanVideoId = isVideoId ? p.url : null;

        if (cleanVideoId) {
          console.log(`[SCAN_NOW] Resolving parent YouTube Channel for Video ID: ${cleanVideoId}`);
          const resolved = await resolveChannelFromVideo(cleanVideoId);
          if (resolved) {
            resolvedBatch.push({
              ...p,
              url: `youtube.com/channel/${resolved.channelId}`,
              displayName: `${resolved.channelTitle} (Kênh chứa video rác: "${resolved.videoTitle}")`,
              type: "YOUTUBE_CHANNEL"
            });
          } else {
            console.log(`[SCAN_NOW] Skipping unresolved YouTube Video ID: ${cleanVideoId}`);
          }
          return;
        }

        // Skip raw "youtube.com" or variations that cannot be excluded as standard negative placement criteria
        const cleanUrl = p.url.toLowerCase().trim();
        if (cleanUrl === "youtube.com" || cleanUrl === "www.youtube.com" || cleanUrl.startsWith("youtube.com/")) {
          const isChannel = cleanUrl.includes("youtube.com/channel/") || 
                            cleanUrl.includes("youtube.com/c/") || 
                            cleanUrl.includes("youtube.com/user/");
          
          if (!isChannel) {
            console.log(`[SCAN_NOW] Skipping invalid YouTube URL exclusion candidate: ${p.url}`);
            return;
          }
        }

        // Skip other malformed placements that lack a domain dot and are not video IDs
        if (!p.url.includes(".")) {
          console.log(`[SCAN_NOW] Skipping invalid placement format: ${p.url}`);
          return;
        }

        resolvedBatch.push(p);
      })
    );

    // Deduplicate by URL (e.g. if multiple videos belong to the same channel)
    const uniqueResolvedBatch: any[] = [];
    const seenUrls = new Set<string>();
    for (const item of resolvedBatch) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        uniqueResolvedBatch.push(item);
      }
    }

    // 5. Request classification from Gemini using User's API Key
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

    let aiResults: Array<{ url: string; category: string; reason: string }> = [];

    if (finalProvider === "openai") {
      try {
        console.log(`[SCAN_NOW] Calling OpenAI GPT-4o-mini with decrypted API key...`);
        const openaiUrl = "https://api.openai.com/v1/chat/completions";
        const response = await fetch(openaiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are an expert Google Ads placement auditor in Vietnam. You evaluate placement URLs and categorize them in raw JSON. Always respond in Vietnamese."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            response_format: { type: "json_object" }
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          return NextResponse.json({ 
            error: errData?.error?.message || `OpenAI API trả về lỗi ${response.status} khi phân tích AI.` 
          }, { status: 400 });
        }

        const resData = await response.json();
        const aiText = resData?.choices?.[0]?.message?.content;
        
        if (!aiText) {
          return NextResponse.json({ error: "Không nhận được phản hồi phân tích từ OpenAI." }, { status: 500 });
        }

        const parsedData = JSON.parse(aiText.trim());
        // Handle array root or placements object root wrapper safely
        if (Array.isArray(parsedData)) {
          aiResults = parsedData;
        } else if (parsedData.placements && Array.isArray(parsedData.placements)) {
          aiResults = parsedData.placements;
        } else {
          // If it's a standard object where placements are direct keys or inside first array
          const arrayVal = Object.values(parsedData).find(v => Array.isArray(v));
          if (arrayVal) {
            aiResults = arrayVal as any[];
          } else {
            console.error("OpenAI JSON is not in expected list format:", parsedData);
            return NextResponse.json({ error: "Dữ liệu OpenAI trả về sai cấu trúc mảng JSON." }, { status: 500 });
          }
        }
      } catch (e: any) {
        console.error("OpenAI invocation failed:", e);
        return NextResponse.json({ error: `Gọi OpenAI API thất bại: ${e.message}` }, { status: 500 });
      }
    } else {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        return NextResponse.json({ 
          error: errData?.error?.message || `Google API trả về lỗi ${response.status} khi phân tích AI.` 
        }, { status: 400 });
      }

      const resData = await response.json();
      const aiText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!aiText) {
        return NextResponse.json({ error: "Không nhận được phản hồi phân tích từ AI." }, { status: 500 });
      }

      // Clean markdown code blocks if present
      let jsonText = aiText.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }

      try {
        aiResults = JSON.parse(jsonText);
      } catch (e) {
        console.error("Failed to parse AI JSON:", aiText);
        return NextResponse.json({ error: "Dữ liệu AI trả về sai định dạng JSON." }, { status: 500 });
      }
    }

    // 6. Write to Database placementExclusionLogs
    // First, clear existing pending placements for this account to avoid duplicate logs
    await db.delete(placementExclusionLogs).where(
      and(
        eq(placementExclusionLogs.adsAccountId, accountId),
        eq(placementExclusionLogs.status, "pending")
      )
    );

    let createdCount = 0;

    for (const p of uniqueResolvedBatch) {
      const aiEval = aiResults.find(r => r.url === p.url);
      const category = aiEval?.category || "Unknown";
      
      // We skip saving if AI classifies as "Clean" or "Behavioral Niche" (keep targeted placements)
      if (category === "Clean" || category === "Behavioral Niche") continue;

      const placementName = aiEval?.reason 
        ? `${p.displayName} (${aiEval.reason})`
        : p.displayName;

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
        status: "pending"
      });

      createdCount++;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Đã quét hoàn tất! Kéo dữ liệu thực tế từ Google Ads ${periodText} và dùng AI (${model}) phân tích, phát hiện ${createdCount} kênh/web rác lãng phí ngân sách.`,
      count: createdCount
    });

  } catch (error: any) {
    console.error("POST /api/optimizer/placements/scan-now error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
