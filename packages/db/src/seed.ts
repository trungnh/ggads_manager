import { db, ruleTemplates, notificationTemplates } from "./index";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Seed rule templates
    await db.insert(ruleTemplates).values([
      {
        name: "Stop Loss (Safety)",
        description: "Tự động tắt chiến dịch nếu CPA thực tế vượt quá 150% Target CPA",
        category: "safety",
        templateData: {
          conditions: [
            { metric: "real_cpa", operator: ">", value: "1.5 * {target_cpa}" },
            { metric: "cost", operator: ">", value: "500000" }
          ],
          actions: [{ type: "pause_campaign" }]
        }
      },
      {
        name: "Scale Up Winners",
        description: "Tăng ngân sách 20% cho chiến dịch có CPA < 80% Target CPA và có hơn 5 đơn",
        category: "scaling",
        templateData: {
          conditions: [
            { metric: "real_cpa", operator: "<", value: "0.8 * {target_cpa}" },
            { metric: "real_conversions_success", operator: ">=", value: "5" }
          ],
          actions: [{ type: "increase_budget_percent", value: "20" }]
        }
      },
      {
        name: "Pause Zero Conversion Campaigns",
        description: "Tắt các chiến dịch tiêu trên 200k nhưng chưa có đơn nào",
        category: "safety",
        templateData: {
          conditions: [
            { metric: "real_conversions_success", operator: "==", value: "0" },
            { metric: "cost", operator: ">", value: "200000" }
          ],
          actions: [{ type: "pause_campaign" }]
        }
      },
      {
        name: "Decrease Budget for High CPA",
        description: "Giảm 20% ngân sách nếu CPA > 120% Target CPA",
        category: "cost_control",
        templateData: {
          conditions: [
            { metric: "real_cpa", operator: ">", value: "1.2 * {target_cpa}" }
          ],
          actions: [{ type: "decrease_budget_percent", value: "20" }]
        }
      },
      {
        name: "Alert on High CFLC",
        description: "Gửi cảnh báo nếu Cost From Last Conversion (CFLC) vượt quá 100k",
        category: "monitoring",
        templateData: {
          conditions: [
            { metric: "cflc_cost", operator: ">", value: "100000" }
          ],
          actions: [{ type: "send_alert", alertMessage: "CFLC cao bất thường ({cflc_cost})" }]
        }
      },
      {
        name: "Restart Paused Winners",
        description: "Bật lại các chiến dịch tạm dừng nhưng có CPA < Target CPA",
        category: "scaling",
        templateData: {
          conditions: [
            { metric: "real_cpa", operator: "<", value: "{target_cpa}" }
          ],
          actions: [{ type: "enable_campaign" }]
        }
      },
      {
        name: "Pause Low ROAS",
        description: "Tắt chiến dịch nếu ROAS < 2.0 và đã tiêu hơn 500k",
        category: "safety",
        templateData: {
          conditions: [
            { metric: "real_roas", operator: "<", value: "2.0" },
            { metric: "cost", operator: ">", value: "500000" }
          ],
          actions: [{ type: "pause_campaign" }]
        }
      },
      {
        name: "Increase Budget by Step",
        description: "Tăng ngân sách thêm 100k nếu chiến dịch đang hiệu quả",
        category: "scaling",
        templateData: {
          conditions: [
            { metric: "real_cpa", operator: "<", value: "0.9 * {target_cpa}" },
            { metric: "real_conversions_success", operator: ">", value: "3" }
          ],
          actions: [{ type: "increase_budget_amount", value: "100000" }]
        }
      },
      {
        name: "Alert on No Traffic",
        description: "Cảnh báo nếu chiến dịch không có click sau 12h",
        category: "monitoring",
        templateData: {
          conditions: [
            { metric: "clicks", operator: "==", value: "0" },
            { metric: "current_hour", operator: ">=", value: "12" }
          ],
          actions: [{ type: "send_alert", alertMessage: "Chiến dịch chưa có traffic" }]
        }
      },
      {
        name: "Night Time Budget Reduction",
        description: "Giảm ngân sách vào ban đêm cho các chiến dịch đắt đỏ",
        category: "cost_control",
        templateData: {
          conditions: [
            { metric: "current_hour", operator: ">=", value: "22" },
            { metric: "real_cpa", operator: ">", value: "{target_cpa}" }
          ],
          actions: [{ type: "decrease_budget_percent", value: "30" }]
        }
      }
    ]).onConflictDoNothing();

    // Seed notification templates
    await db.insert(notificationTemplates).values([
      {
        name: "Default Daily Report",
        type: "report",
        isSystem: true,
        content: `📊 Báo cáo ngày {date}
💰 Tổng chi tiêu: {total_cost}
📦 Số đơn: {total_orders}
✅ Thành công: {success_orders}
🎯 CPA trung bình: {avg_cpa}
💵 Lợi nhuận dự kiến: {estimated_profit}`
      },
      {
        name: "Default Rule Alert",
        type: "alert",
        isSystem: true,
        content: `⚠️ Cảnh báo từ {rule_name}
Chiến dịch: {campaign_name}
Hành động: {action_taken}
Chi tiết: {alert_message}
CPA hiện tại: {current_cpa}`
      }
    ]).onConflictDoNothing();

    console.log("✅ Seeding complete!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    process.exit(0);
  }
}

seed();

