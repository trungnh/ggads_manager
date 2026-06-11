import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, campaignsSnapshot } from "@repo/db";
import { eq, and, asc, gte } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');
  const campaignId = searchParams.get('campaignId');

  if (!customerId || !campaignId) {
    return new NextResponse("Missing customerId or campaignId", { status: 400 });
  }

  try {
    // Fetch last 14 days of data
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const dateStr = fourteenDaysAgo.toISOString().split('T')[0];

    const data = await db.select({
      date: campaignsSnapshot.date,
      costMicros: campaignsSnapshot.costMicros,
      conversions: campaignsSnapshot.googleConversions,
    })
    .from(campaignsSnapshot)
    .where(and(
      eq(campaignsSnapshot.customerId, customerId),
      eq(campaignsSnapshot.campaignId, campaignId),
      gte(campaignsSnapshot.date, dateStr)
    ))
    .orderBy(asc(campaignsSnapshot.date));

    const chartData = data.map(d => {
      const cost = parseInt(d.costMicros || '0') / 1000000;
      const conv = parseFloat(d.conversions || '0');
      const cpa = conv > 0 ? cost / conv : 0;
      return {
        date: d.date ? d.date.split('-').slice(1).join('/') : '', // format as MM/DD
        spend: cost,
        cpa: cpa
      };
    });

    return NextResponse.json(chartData);
  } catch (error: any) {
    console.error("[CHART_API] Error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
