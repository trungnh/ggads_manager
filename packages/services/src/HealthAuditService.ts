import crypto from 'crypto';
import { db, campaignsSnapshot, adsAccounts, userAdsAccounts, aiConnections, adsHealthAuditLogs, placementExclusionLogs, optimizationRules } from '@repo/db';
import { eq, and, desc, gte } from 'drizzle-orm';

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
    console.error("[HealthAuditService] Decryption error:", error);
    return text;
  }
}

export class HealthAuditService {
  /**
   * Run programmatic audit + Gemini Flash commentary and log to database
   */
  static async runAccountAudit(adsAccountId: string, triggerType: 'MANUAL' | 'AUTO'): Promise<any> {
    try {
      console.log(`[HealthAuditService] Starting audit for Account ID: ${adsAccountId}, trigger: ${triggerType}`);

      // 1. Fetch Ads Account details
      const account = await db.query.adsAccounts.findFirst({
        where: eq(adsAccounts.id, adsAccountId)
      });

      if (!account) {
        throw new Error("Ads Account không tìm thấy.");
      }

      // 2. Fetch User associated with account to get AI configurations
      const userAdsAcc = await db.query.userAdsAccounts.findFirst({
        where: eq(userAdsAccounts.adsAccountId, adsAccountId)
      });

      if (!userAdsAcc) {
        throw new Error("Không tìm thấy liên kết tài khoản cho User.");
      }

      const userId = userAdsAcc.userId;

      // 3. Fetch today's snapshots
      const todayStr = new Date().toISOString().split("T")[0];
      const todaySnapshots = await db.select()
        .from(campaignsSnapshot)
        .where(and(
          eq(campaignsSnapshot.customerId, account.customerId),
          eq(campaignsSnapshot.date, todayStr)
        ));

      // Fetch last 7 days snapshots for conversion history
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
      
      const recentSnapshots = await db.select()
        .from(campaignsSnapshot)
        .where(and(
          eq(campaignsSnapshot.customerId, account.customerId),
          gte(campaignsSnapshot.date, sevenDaysAgoStr)
        ));

      // Fetch placement logs
      const recentPlacements = await db.select()
        .from(placementExclusionLogs)
        .where(and(
          eq(placementExclusionLogs.adsAccountId, adsAccountId),
          eq(placementExclusionLogs.status, "pending")
        ));

      // Fetch optimization rules
      const activeRules = await db.query.optimizationRules.findMany({
        where: eq(optimizationRules.adsAccountId, adsAccountId)
      });

      // 4. Evaluate Technical Checklist
      const checks: any[] = [];
      let score = 100;

      // Check 1: Smart Bidding vs Manual CPC
      const hasManualBidding = todaySnapshots.some(s => 
        s.biddingStrategyType === "MANUAL_CPC" || s.biddingStrategyType === "MANUAL_CPM"
      );
      if (hasManualBidding) {
        checks.push({
          id: "smart_bidding",
          name: "Cấu hình Smart Bidding",
          status: "warning",
          message: "Phát hiện chiến dịch sử dụng đặt thầu thủ công (Manual CPC/CPM). Khuyên dùng Smart Bidding để tối ưu hóa thuật toán Google."
        });
        score -= 10;
      } else {
        checks.push({
          id: "smart_bidding",
          name: "Cấu hình Smart Bidding",
          status: "passed",
          message: "Tất cả chiến dịch đang sử dụng thầu thông minh (Smart Bidding)."
        });
      }

      // Check 2: Budget Suffocation
      const suffocatedCampaigns = todaySnapshots.filter(s => {
        const budget = Number(s.budgetMicros || 0) / 1000000;
        const targetCpa = Number(s.targetCpaMicros || 0) / 1000000;
        return targetCpa > 0 && budget < 5 * targetCpa;
      });
      if (suffocatedCampaigns.length > 0) {
        checks.push({
          id: "budget_adequacy",
          name: "Mức độ ngân sách an toàn",
          status: "warning",
          message: `Phát hiện ${suffocatedCampaigns.length} chiến dịch có ngân sách ngày thấp hơn 5 lần CPA mục tiêu, dễ gây bóp nghẹt phân phối.`
        });
        score -= 5;
      } else {
        checks.push({
          id: "budget_adequacy",
          name: "Mức độ ngân sách an toàn",
          status: "passed",
          message: "Ngân sách ngày của các chiến dịch đạt ngưỡng an toàn (>= 5x CPA mục tiêu)."
        });
      }

      // Check 3: CPA Ceiling Breach
      const highCpaCampaigns = todaySnapshots.filter(s => {
        const cost = Number(s.costMicros || 0) / 1000000;
        const conversions = s.realConversions || 0;
        const targetCpa = Number(s.targetCpaMicros || 0) / 1000000;
        if (targetCpa > 0) {
          const actualCpa = conversions > 0 ? cost / conversions : cost;
          return cost > 2 * targetCpa && actualCpa > 2 * targetCpa;
        }
        return false;
      });
      if (highCpaCampaigns.length > 0) {
        checks.push({
          id: "cpa_ceiling",
          name: "Cắt lỗ CPA trần",
          status: "failed",
          message: `Có ${highCpaCampaigns.length} chiến dịch vượt quá gấp 2 lần CPA mục tiêu hôm nay. Hãy rà soát hoặc bật 3x Kill Rule.`
        });
        score -= 15;
      } else {
        checks.push({
          id: "cpa_ceiling",
          name: "Cắt lỗ CPA trần",
          status: "passed",
          message: "Chưa phát hiện chiến dịch nào bị vượt ngưỡng CPA trần nghiêm trọng hôm nay."
        });
      }

      // Check 4: Lost IS (Budget)
      const budgetLimitedCampaigns = todaySnapshots.filter(s => {
        const lostIs = parseFloat(s.searchBudgetLostImpressionShare || "0");
        return lostIs > 0.2; 
      });
      if (budgetLimitedCampaigns.length > 0) {
        checks.push({
          id: "budget_lost_is",
          name: "Mất hiển thị do ngân sách",
          status: "warning",
          message: `Chiến dịch "${budgetLimitedCampaigns[0].name}" mất hơn 20% lượt hiển thị do giới hạn ngân sách. Xem xét tăng ngân sách để scale.`
        });
        score -= 5;
      } else {
        checks.push({
          id: "budget_lost_is",
          name: "Mất hiển thị do ngân sách",
          status: "passed",
          message: "Tỷ lệ mất hiển thị do ngân sách nằm trong ngưỡng kiểm soát (< 20%)."
        });
      }

      // Check 5: Placement Waste
      const totalWastedCost = recentPlacements.reduce((sum, p) => sum + parseFloat(p.costWasted || "0"), 0);
      if (totalWastedCost > 150000) {
        checks.push({
          id: "placement_waste",
          name: "Vị trí hiển thị rác",
          status: "warning",
          message: `Phát hiện khoảng ${recentPlacements.length} kênh/web rác đang tiêu tốn ngân sách của bạn. Hãy dọn dẹp danh sách vị trí hiển thị.`
        });
        score -= 10;
      } else {
        checks.push({
          id: "placement_waste",
          name: "Vị trí hiển thị rác",
          status: "passed",
          message: "Không phát hiện lãng phí ngân sách lớn ở các vị trí hiển thị rác."
        });
      }

      // Check 6: Broken Conversion Tracking
      const totalRecentConversions = recentSnapshots.reduce((sum, s) => sum + (s.realConversions || 0), 0);
      const totalRecentSpend = recentSnapshots.reduce((sum, s) => sum + parseFloat(s.costMicros || "0"), 0) / 1000000;
      
      if (totalRecentSpend > 100000 && totalRecentConversions === 0) {
        checks.push({
          id: "conversion_tracking",
          name: "Hệ thống Đo lường Chuyển đổi",
          status: "failed",
          message: "Tài khoản chi tiêu ngân sách trong 7 ngày qua nhưng ghi nhận 0 lượt chuyển đổi thực tế. Kiểm tra lại Pixel/CRM Sync."
        });
        score -= 20;
      } else {
        checks.push({
          id: "conversion_tracking",
          name: "Hệ thống Đo lường Chuyển đổi",
          status: "passed",
          message: "Chuyển đổi đang được ghi nhận đều đặn từ chiến dịch quảng cáo và Pancake CRM."
        });
      }

      // Check 7: Dayparting Schedule
      const hasSchedules = activeRules.some(r => r.isEnabled && r.schedule && (r.schedule as any).days);
      if (!hasSchedules) {
        checks.push({
          id: "dayparting_optimization",
          name: "Tối ưu hóa Khung giờ hoạt động",
          status: "info",
          message: "Chưa cấu hình lịch tắt/bật quảng cáo ngoài giờ làm việc. Bạn có thể thiết lập rule để tiết kiệm chi phí ban đêm."
        });
        score -= 2;
      } else {
        checks.push({
          id: "dayparting_optimization",
          name: "Tối ưu hóa Khung giờ hoạt động",
          status: "passed",
          message: "Đã bật lịch chạy/quy tắc ngày giờ tự động cho tài khoản."
        });
      }

      // Clamp score
      score = Math.max(10, Math.min(100, score));

      // 5. Request AI analysis from Gemini
      let activeConnection = await db.query.aiConnections.findFirst({
        where: and(
          eq(aiConnections.userId, userId),
          eq(aiConnections.provider, "gemini")
        )
      });

      if (!activeConnection) {
        activeConnection = await db.query.aiConnections.findFirst({
          where: and(
            eq(aiConnections.userId, userId),
            eq(aiConnections.provider, "gemini-pro")
          )
        });
      }

      const apiKey = activeConnection 
        ? decrypt(activeConnection.apiKey) 
        : process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

      let aiCritique = "Tài khoản đang hoạt động ở trạng thái tương đối ổn định. Hãy rà soát định kỳ các chiến dịch và tối ưu hóa từ khóa.";
      let actionPlan = [
        { severity: "info", task: "Rà soát định kỳ", recommendation: "Kiểm tra lại hiệu quả thầu và điều chỉnh ngân sách hợp lý." }
      ];

      if (apiKey) {
        try {
          const model = activeConnection?.provider === "gemini-pro" ? "gemini-2.5-pro" : "gemini-1.5-flash";
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

          const prompt = `Bạn là chuyên gia kiểm toán Google Ads thực chiến hàng đầu tại Việt Nam, tư vấn cho nhà quảng cáo tự chạy (in-house).
Dưới đây là kết quả kiểm tra kỹ thuật (audit checklist) của tài khoản:
Điểm số Health Score: ${score}/100
Checklist chi tiết:
${checks.map(c => `- [${c.status.toUpperCase()}] ${c.name}: ${c.message}`).join("\n")}

Hãy viết một bản phân tích chẩn đoán sức khỏe tài khoản ngắn gọn, lâm sàng và thực chiến bằng tiếng Việt.
Trả về kết quả dưới dạng cấu trúc JSON duy nhất (không bọc trong markdown \`\`\`json):
{
  "critique": "Nhận xét tổng quan sắc bén về hiện trạng tài khoản và ngân sách (dưới 4 câu). Ví dụ chỉ rõ điểm yếu cản trước hiệu năng.",
  "actionPlan": [
    {
      "severity": "critical" | "warning" | "info",
      "task": "Tên đầu việc ngắn gọn (dưới 10 từ, VD: Tạm dừng chiến dịch CPA quá cao)",
      "recommendation": "Khuyến nghị chi tiết hành động và giải thích lý do thực tế (dưới 20 từ, VD: Chuyển sang Target CPA ở mức 150k để hạn chế phân phối rác)."
    }
  ]
}`;

          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" }
            })
          });

          if (response.ok) {
            const resData = await response.json();
            const aiText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (aiText) {
              let jsonText = aiText.trim();
              if (jsonText.startsWith("```")) {
                jsonText = jsonText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
              }
              const parsed = JSON.parse(jsonText);
              aiCritique = parsed.critique || aiCritique;
              actionPlan = parsed.actionPlan || actionPlan;
            }
          } else {
            console.error("[HealthAuditService] Gemini API error during audit:", await response.text());
          }
        } catch (geminiErr) {
          console.error("[HealthAuditService] Failed calling Gemini API for audit report:", geminiErr);
        }
      } else {
        console.warn("[HealthAuditService] No Gemini API key found, bypassing AI critique.");
      }

      // 6. Store audit results
      const resultJson = {
        checks,
        critique: aiCritique,
        actionPlan: actionPlan
      };

      const [newLog] = await db.insert(adsHealthAuditLogs).values({
        adsAccountId,
        score,
        resultJson,
        triggerType
      }).returning();

      // Update last run time in account
      await db.update(adsAccounts)
        .set({ healthAuditLastRun: todayStr })
        .where(eq(adsAccounts.id, adsAccountId));

      console.log(`[HealthAuditService] Audit logged successfully with ID: ${newLog.id}. Score: ${score}`);
      return newLog;
    } catch (e: any) {
      console.error(`[HealthAuditService] Failed to run health audit for account ${adsAccountId}:`, e.message);
      throw e;
    }
  }
}
