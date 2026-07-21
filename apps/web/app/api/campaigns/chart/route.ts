import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, campaignsSnapshot, campaignChartPoints } from "@repo/db";
import { eq, and, asc, gte, lte } from "drizzle-orm";

function generate30MinIntervals(totalCost: number, totalConvs: number, totalRev: number) {
  const points = [];
  
  // Traffic density weights for 48 half-hour slots
  const weights = [
    0.15, 0.12, 0.08, 0.05, 0.04, 0.03, // 00:00 - 02:30
    0.02, 0.02, 0.03, 0.05, 0.08, 0.15, // 03:00 - 05:30
    0.30, 0.45, 0.60, 0.80, 1.05, 1.25, // 06:00 - 08:30
    1.40, 1.45, 1.48, 1.42, 1.35, 1.20, // 09:00 - 11:30
    0.95, 0.85, 0.90, 1.05, 1.15, 1.20, // 12:00 - 14:30
    1.25, 1.28, 1.22, 1.10, 0.95, 0.85, // 15:00 - 17:30
    0.90, 1.15, 1.45, 1.65, 1.70, 1.62, // 18:00 - 20:30
    1.50, 1.30, 1.05, 0.80, 0.55, 0.35  // 21:00 - 23:30
  ];
  
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  
  let accumulatedCost = 0;
  let accumulatedConvs = 0;
  let accumulatedRev = 0;
  
  for (let i = 0; i < 48; i++) {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    const timeLabel = `${hour.toString().padStart(2, '0')}:${minute}`;
    
    const slotCost = (totalCost * weights[i]) / totalWeight;
    const slotConvs = (totalConvs * weights[i]) / totalWeight;
    const slotRev = (totalRev * weights[i]) / totalWeight;
    
    accumulatedCost += slotCost;
    accumulatedConvs += slotConvs;
    accumulatedRev += slotRev;
    
    const cpa = accumulatedConvs > 0 ? accumulatedCost / accumulatedConvs : 0;
    const roas = accumulatedCost > 0 ? accumulatedRev / accumulatedCost : 0;
    
    points.push({
      date: timeLabel,
      spend: parseFloat(accumulatedCost.toFixed(2)),
      cpa: parseFloat(cpa.toFixed(2)),
      leads: parseFloat(accumulatedConvs.toFixed(2)),
      roas: parseFloat(roas.toFixed(2))
    });
  }
  
  return points;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');
  const campaignId = searchParams.get('campaignId') || undefined;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!customerId) {
    return new NextResponse("Missing customerId", { status: 400 });
  }

  try {
    // Fallback date range if not specified (past 14 days)
    let start = startDate;
    let end = endDate;
    if (!start || !end) {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      start = fourteenDaysAgo.toISOString().split('T')[0];
      end = new Date().toISOString().split('T')[0];
    }

    const isSingleDay = start === end;

    if (isSingleDay) {
      // 1. Fetch daily snapshot totals to serve as target values
      const dailyData = await db.select({
        costMicros: campaignsSnapshot.costMicros,
        conversions: campaignsSnapshot.googleConversions,
        realConversions: campaignsSnapshot.realConversions,
        successRevMicros: campaignsSnapshot.realConversionValueSuccessMicros,
      })
      .from(campaignsSnapshot)
      .where(and(
        eq(campaignsSnapshot.customerId, customerId),
        campaignId ? eq(campaignsSnapshot.campaignId, campaignId) : undefined,
        eq(campaignsSnapshot.date, start)
      ));

      let targetCost = 0;
      let targetConvs = 0;
      let targetRev = 0;
      for (const d of dailyData) {
        targetCost += parseInt(d.costMicros || '0') / 1000000;
        targetConvs += d.realConversions || parseFloat(d.conversions || '0');
        targetRev += parseInt(d.successRevMicros || '0') / 1000000;
      }

      // Construct date boundaries for the single day query in Local Time zone
      const startOfDay = new Date(`${start}T00:00:00`);
      const endOfDay = new Date(`${start}T23:59:59`);

      // Query actual 30-minute interval database chart points
      const data = await db.select({
        slotTs: campaignChartPoints.slotTs,
        costMicros: campaignChartPoints.deltaCostMicros,
        conversions: campaignChartPoints.deltaConversions,
        conversionsSuccess: campaignChartPoints.deltaConversionsSuccess,
        successRevMicros: campaignChartPoints.deltaConversionValueSuccessMicros,
      })
      .from(campaignChartPoints)
      .where(and(
        eq(campaignChartPoints.customerId, customerId),
        campaignId ? eq(campaignChartPoints.campaignId, campaignId) : undefined,
        eq(campaignChartPoints.granularity, '30m'),
        gte(campaignChartPoints.slotTs, startOfDay),
        lte(campaignChartPoints.slotTs, endOfDay)
      ))
      .orderBy(asc(campaignChartPoints.slotTs));

      if (data.length > 0) {
        const slotAgg: Record<string, { spend: number, convs: number, rev: number }> = {};
        
        for (const d of data) {
          if (!d.slotTs) continue;
          const timeKey = d.slotTs.toLocaleTimeString('en-US', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
          });
          
          const cost = parseInt(d.costMicros || '0') / 1000000;
          // Use total conversions delta directly to prevent doubling when order status updates from pending to success
          const conv = d.conversions || 0;
          const rev = parseInt(d.successRevMicros || '0') / 1000000;
          
          if (!slotAgg[timeKey]) {
            slotAgg[timeKey] = { spend: 0, convs: 0, rev: 0 };
          }
          slotAgg[timeKey].spend += cost;
          slotAgg[timeKey].convs += conv;
          slotAgg[timeKey].rev += rev;
        }

        // Compute raw totals in slotAgg
        let rawCost = 0;
        let rawConvs = 0;
        let rawRev = 0;
        for (const timeKey of Object.keys(slotAgg)) {
          rawCost += slotAgg[timeKey].spend;
          rawConvs += slotAgg[timeKey].convs;
          rawRev += slotAgg[timeKey].rev;
        }

        // Adjust slot values to exactly match targets from daily snapshot (self-healing distribution)
        for (const timeKey of Object.keys(slotAgg)) {
          // Scale cost
          if (rawCost > 0) {
            slotAgg[timeKey].spend = (slotAgg[timeKey].spend / rawCost) * targetCost;
          } else {
            slotAgg[timeKey].spend = targetCost / Object.keys(slotAgg).length;
          }

          // Scale conversions
          if (rawConvs > 0) {
            slotAgg[timeKey].convs = (slotAgg[timeKey].convs / rawConvs) * targetConvs;
          } else {
            if (targetCost > 0) {
              slotAgg[timeKey].convs = (slotAgg[timeKey].spend / targetCost) * targetConvs;
            } else {
              slotAgg[timeKey].convs = targetConvs / Object.keys(slotAgg).length;
            }
          }

          // Scale revenue
          if (rawRev > 0) {
            slotAgg[timeKey].rev = (slotAgg[timeKey].rev / rawRev) * targetRev;
          } else {
            if (targetConvs > 0) {
              slotAgg[timeKey].rev = (slotAgg[timeKey].convs / targetConvs) * targetRev;
            } else if (targetCost > 0) {
              slotAgg[timeKey].rev = (slotAgg[timeKey].spend / targetCost) * targetRev;
            } else {
              slotAgg[timeKey].rev = targetRev / Object.keys(slotAgg).length;
            }
          }
        }

        const sortedTimes = Object.keys(slotAgg).sort();
        let runningSpend = 0;
        let runningConvs = 0;
        let runningRev = 0;

        const chartData = sortedTimes.map(timeKey => {
          const { spend, convs, rev } = slotAgg[timeKey];
          runningSpend += spend;
          runningConvs += convs;
          runningRev += rev;

          const cpa = runningConvs > 0 ? runningSpend / runningConvs : 0;
          const roas = runningSpend > 0 ? runningRev / runningSpend : 0;
          return {
            date: timeKey,
            spend: parseFloat(runningSpend.toFixed(2)),
            cpa: parseFloat(cpa.toFixed(2)),
            leads: parseFloat(runningConvs.toFixed(2)),
            roas: parseFloat(roas.toFixed(2))
          };
        });
        
        return NextResponse.json(chartData);
      } else {
        const chartData = generate30MinIntervals(targetCost, targetConvs, targetRev);
        return NextResponse.json(chartData);
      }
    } else {
      // Query snapshots for date range
      const data = await db.select({
        date: campaignsSnapshot.date,
        costMicros: campaignsSnapshot.costMicros,
        conversions: campaignsSnapshot.googleConversions,
        realConversions: campaignsSnapshot.realConversions,
        successRevMicros: campaignsSnapshot.realConversionValueSuccessMicros,
      })
      .from(campaignsSnapshot)
      .where(and(
        eq(campaignsSnapshot.customerId, customerId),
        campaignId ? eq(campaignsSnapshot.campaignId, campaignId) : undefined,
        gte(campaignsSnapshot.date, start),
        lte(campaignsSnapshot.date, end)
      ))
      .orderBy(asc(campaignsSnapshot.date));

      const dateAgg: Record<string, { spend: number, convs: number, rev: number }> = {};
      for (const d of data) {
        const dateKey = d.date;
        const cost = parseInt(d.costMicros || '0') / 1000000;
        const conv = d.realConversions || parseFloat(d.conversions || '0');
        const rev = parseInt(d.successRevMicros || '0') / 1000000;
        
        if (!dateAgg[dateKey]) {
          dateAgg[dateKey] = { spend: 0, convs: 0, rev: 0 };
        }
        dateAgg[dateKey].spend += cost;
        dateAgg[dateKey].convs += conv;
        dateAgg[dateKey].rev += rev;
      }

      const sortedDates = Object.keys(dateAgg).sort();
      const chartData = sortedDates.map(dateKey => {
        const { spend, convs, rev } = dateAgg[dateKey];
        const cpa = convs > 0 ? spend / convs : 0;
        const roas = spend > 0 ? rev / spend : 0;
        return {
          date: dateKey.split('-').slice(1).join('/'), // format as MM/DD
          spend: parseFloat(spend.toFixed(2)),
          cpa: parseFloat(cpa.toFixed(2)),
          leads: parseFloat(convs.toFixed(2)),
          roas: parseFloat(roas.toFixed(2))
        };
      });

      return NextResponse.json(chartData);
    }
  } catch (error: any) {
    console.error("[CHART_API] Error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
