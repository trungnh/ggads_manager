import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, budgetOptimizations, aiConnections, adsAccounts } from "@repo/db";
import { eq, inArray, and } from "drizzle-orm";
import { CampaignProfileBuilder } from "@repo/services";
import { BudgetAllocationEngine } from "@repo/services";
import { decrypt } from "@/lib/crypto";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      totalMonthlyBudget = 30000000,
      remainingBudget = 30000000,
      selectedAccountIds = [], // UUID of adsAccounts
      excludedStatuses = ["Đơn hủy", "Khách từ chối nhận", "Giao thất bại", "Đơn hoàn"],
      excludedTags = ["Đơn ảo", "Không liên lạc được", "Spam", "Trùng lặp"],
      rolloutSteps = [
        { day: 1, percentage: 130 },
        { day: 2, percentage: 160 },
        { day: 3, percentage: 200 }
      ],
      safetyBreaker = {
        cpaThresholdPct: 30,
        paceCheckEnabled: true,
        minSpendMicros: 2000000000 // 2 Million VND in micros
      },
      objective = {
        primary: "maximize_conversions",
        targetCpaMicros: 250000000 // 250k VND in micros
      }
    } = body;

    if (selectedAccountIds.length === 0) {
      return NextResponse.json({ error: "Vui lòng chọn ít nhất một tài khoản quảng cáo." }, { status: 400 });
    }

    // 1. Fetch Ads accounts details from DB
    const selectedAccounts = await db.select()
      .from(adsAccounts)
      .where(inArray(adsAccounts.id, selectedAccountIds));

    if (selectedAccounts.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy tài khoản quảng cáo hợp lệ." }, { status: 404 });
    }

    const customerIds = selectedAccounts.map(acc => acc.customerId);

    // 2. Build Historical Campaign Profiles across selected customer accounts
    const profileBuilder = new CampaignProfileBuilder();
    const campaigns = await profileBuilder.buildProfiles(
      customerIds,
      30, // 30 days lookback
      excludedStatuses,
      excludedTags
    );

    if (campaigns.length === 0) {
      return NextResponse.json({
        error: "Không tìm thấy dữ liệu chiến dịch đủ điều kiện để tối ưu hóa trong 30 ngày qua."
      }, { status: 400 });
    }

    // 3. Allocate budget optimally using Marginal CPA Bidding Engine
    const allocationEngine = new BudgetAllocationEngine();
    const horizonDays = 30; // standard month horizon

    const optimizerInput = {
      adsAccountIds: selectedAccountIds,
      userId: session.user.id,
      constraints: {
        totalMonthlyBudgetMicros: totalMonthlyBudget * 1000000,
        remainingBudgetMicros: remainingBudget * 1000000,
        minCampaignBudgetMicros: 100000000, // 100,000 VND min
        lockedCampaignIds: [],
        maxBudgetIncreasePercentage: 200, // scale up to 300%
        maxBudgetDecreasePercentage: 90,  // shrink down to 10%
        stagedRolloutDays: rolloutSteps.length
      },
      objective: {
        primary: objective.primary as any,
        targetCpaMicros: objective.targetCpaMicros,
        targetRoas: 0
      },
      campaigns,
      optimizationDate: new Date(),
      horizonDays
    };

    const optimizationOutput = allocationEngine.allocate(optimizerInput);

    // 4. Retrieve Active AI Connection for draft strategic report
    let activeConnection = await db.query.aiConnections.findFirst({
      where: and(
        eq(aiConnections.userId, session.user.id),
        eq(aiConnections.provider, "gemini")
      )
    });

    let isPro = false;
    if (!activeConnection) {
      activeConnection = await db.query.aiConnections.findFirst({
        where: and(
          eq(aiConnections.userId, session.user.id),
          eq(aiConnections.provider, "gemini-pro")
        )
      });
      isPro = true;
    }

    let aiExplanation = {
      summary: "Thuật toán đã tối ưu hóa và phân bổ lại ngân sách dựa trên hiệu suất đơn hàng thực giao thành công từ Pancake CRM. Các chiến dịch có CPA thực tế tốt được ưu tiên phân bổ ngân sách tối đa.",
      tradeoffs: "Hệ thống khuyến nghị giảm thiểu ngân sách hoặc tạm dừng các chiến dịch cắn tiền nhanh nhưng có tỷ lệ hủy đơn hàng cao trên Pancake CRM.",
      rolloutPlan: "Áp dụng lộ trình cắn ngân sách tiệm cận (Staged Rollout) trong 3 ngày để tránh sốc giá thầu và giúp thuật toán Google Ads học lại ổn định."
    };

    let tokensUsed = 0;

    if (activeConnection) {
      const apiKey = decrypt(activeConnection.apiKey);
      if (apiKey) {
        try {
          const model = isPro ? "gemini-2.5-pro" : "gemini-2.5-flash";
          const prompt = `Bạn là chuyên gia cố vấn tối ưu hóa quảng cáo Google Ads kết hợp Pancake CRM tại Việt Nam.
Dựa trên kết quả tối ưu hóa ngân sách của thuật toán Marginal CPA dưới đây, hãy viết một báo cáo phân tích chiến lược bằng tiếng Việt:

Danh sách chiến dịch đề xuất thay đổi:
${optimizationOutput.allocations.map(c => 
  `- Chiến dịch: "${c.campaignName}"
    * Hiện tại: ${(c.currentBudgetMicros / 1000000).toLocaleString()} đ/ngày
    * Khuyên dùng: ${(c.recommendedBudgetMicros / 1000000).toLocaleString()} đ/ngày (Thay đổi: ${c.budgetChangePct}%)
    * Dự báo CPA: ${(c.projectedCpaMicros / 1000000).toLocaleString()} đ/đơn
    * Lý do: ${c.rationale.primaryReason === 'cpa_below_target' ? 'CPA thực tế rẻ hơn mục tiêu' : c.rationale.primaryReason === 'high_efficiency_score' ? 'Điểm hiệu suất tổng hợp cao' : 'Hiệu suất CRM chưa đạt yêu cầu'}`
).join("\n")}

Dự báo kết quả chung:
- Tổng số đơn hàng dự báo tăng: ${optimizationOutput.projectedOutcome.vsStatusQuo.conversionDeltaPct}% (${optimizationOutput.projectedOutcome.vsStatusQuo.conversionDelta} đơn)
- CPA trung bình dự báo thay đổi: ${optimizationOutput.projectedOutcome.vsStatusQuo.cpaDelta}%

Hãy phản hồi dưới dạng đối tượng JSON duy nhất bằng tiếng Việt với cấu trúc sau:
{
  "summary": "3-4 câu tóm tắt chiến lược sắc sảo về hướng đi chung và cơ hội tối ưu hóa.",
  "tradeoffs": "Phân tích rủi ro, sự đánh đổi và các chiến dịch cần giám sát kỹ hoặc cắt giảm.",
  "rolloutPlan": "Khuyên dùng lộ trình cắn tiền tiệm cận (Staged Rollout) trong những ngày tới thế nào để ổn định."
}
Lưu ý: Chỉ trả về chuỗi JSON thô, không bọc trong khối markdown \`\`\`json.`;

          const aiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const aiRes = await fetch(aiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" }
            })
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const aiText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (aiText) {
              let jsonText = aiText.trim();
              if (jsonText.startsWith("```")) {
                jsonText = jsonText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
              }
              const parsed = JSON.parse(jsonText);
              if (parsed.summary && parsed.tradeoffs && parsed.rolloutPlan) {
                aiExplanation = parsed;
                tokensUsed = aiData?.usageMetadata?.totalTokens || 0;
              }
            }
          }
        } catch (aiErr) {
          console.error("[API/optimizer/run] Failed to generate AI explanation, falling back:", aiErr);
        }
      }
    }

    // 5. Save optimization run in DB
    const optInput = {
      totalMonthlyBudget,
      remainingBudget,
      excludedStatuses,
      excludedTags,
      rolloutSteps,
      safetyBreaker
    };

    const [inserted] = await db.insert(budgetOptimizations)
      .values({
        userId: session.user.id,
        adsAccountIds: selectedAccountIds,
        status: "done",
        optimizationInput: optInput,
        algorithmOutput: optimizationOutput,
        aiExplanation,
        tokensUsed,
        computationMs: Date.now() - startTime
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: inserted
    });

  } catch (error: any) {
    console.error("[POST /api/optimizer/run error]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
