import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, budgetOptimizations, adsAccounts, userAdsAccounts } from "@repo/db";
import { eq } from "drizzle-orm";
import { CampaignsService } from "@repo/google-ads";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { mode, selectedCampaignIds = [], stagedRolloutDays = 3 } = body;

    // 1. Fetch the optimization run
    const [opt] = await db.select()
      .from(budgetOptimizations)
      .where(eq(budgetOptimizations.id, id))
      .limit(1);

    if (!opt || opt.userId !== session.user.id) {
      return NextResponse.json({ error: "Optimization run not found" }, { status: 404 });
    }

    const algOutput = opt.algorithmOutput as any;
    const allocations = algOutput?.allocations || [];

    // Get ads account info
    const userAdsAcc = await db.query.userAdsAccounts.findFirst({
      where: eq(userAdsAccounts.userId, session.user.id)
    });
    if (!userAdsAcc) {
      return NextResponse.json({ error: "No linked ads account found" }, { status: 400 });
    }

    const [adsAcc] = await db.select()
      .from(adsAccounts)
      .where(eq(adsAccounts.id, userAdsAcc.adsAccountId))
      .limit(1);

    if (!adsAcc || !adsAcc.oauthConnectionId) {
      return NextResponse.json({ error: "OAuth credentials not active" }, { status: 400 });
    }

    const campaignsService = new CampaignsService(
      adsAcc.oauthConnectionId,
      adsAcc.customerId,
      adsAcc.loginCustomerId || undefined
    );

    const isFullMode = mode === 'full';
    const targetedCampaigns = allocations.filter((a: any) => 
      isFullMode ? (!a.isLocked && !a.isSuspended) : selectedCampaignIds.includes(a.campaignId)
    );

    // Apply immediate changes for suspended campaigns (Minimization)
    for (const alloc of allocations) {
      if (alloc.isSuspended) {
        console.log(`[API] Minimizing budget for suspended campaign ${alloc.campaignName}...`);
        try {
          await campaignsService.updateCampaignBudget(alloc.campaignId, alloc.recommendedBudgetMicros.toString());
          await campaignsService.updateCampaignStatus(alloc.campaignId, 'PAUSED');
        } catch (err: any) {
          console.error(`[API] Failed to minimize suspended campaign:`, err.message);
        }
      }
    }

    // Generate Staged Rollout schedule for targeted campaigns
    const schedule = [];
    const now = new Date();

    if (stagedRolloutDays > 0) {
      for (const alloc of targetedCampaigns) {
        // Also sync initial day rollout step if applying immediately
        console.log(`[API] Initial Staged Rollout step for campaign ${alloc.campaignName}...`);
      }

      for (let day = 1; day <= stagedRolloutDays; day++) {
        const stepDate = new Date();
        stepDate.setDate(now.getDate() + day);
        const stepDateStr = stepDate.toISOString().split('T')[0];

        // Linearly interpolate the budget steps:
        // Day 1: 125%, Day 2: 150%, Day 3: 175%, Day 4: 200% (target step percentage)
        const budgetPct = Math.round(100 + (day / stagedRolloutDays) * 100);

        schedule.push({
          dayIndex: day,
          date: stepDateStr,
          budgetPct: budgetPct,
          status: 'pending'
        });
      }
    } else {
      // Apply immediately
      for (const alloc of targetedCampaigns) {
        console.log(`[API] Applying budget for campaign ${alloc.campaignName} immediately...`);
        await campaignsService.updateCampaignBudget(alloc.campaignId, alloc.recommendedBudgetMicros.toString());
      }
    }

    // Update optimization run in DB
    await db.update(budgetOptimizations)
      .set({
        appliedAt: new Date(),
        stagedRolloutSchedule: stagedRolloutDays > 0 ? schedule : null
      })
      .where(eq(budgetOptimizations.id, id));

    return NextResponse.json({
      success: true,
      message: stagedRolloutDays > 0 
        ? `Kế hoạch đã được áp dụng thành công dưới dạng Staged Rollout (${stagedRolloutDays} ngày).` 
        : "Kế hoạch tối ưu hóa đã được áp dụng trực tiếp lên Google Ads thành công!",
      schedule: stagedRolloutDays > 0 ? schedule : null
    });

  } catch (error: any) {
    console.error("[POST /api/optimizer/[id]/apply error]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
