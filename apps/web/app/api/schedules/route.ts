import { NextResponse } from "next/server";
import { db, campaignSchedules } from "@repo/db";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const adsAccountId = searchParams.get('adsAccountId');

  if (!adsAccountId) {
    return new NextResponse("adsAccountId is required", { status: 400 });
  }

  try {
    const schedules = await db.query.campaignSchedules.findMany({
      where: eq(campaignSchedules.adsAccountId, adsAccountId),
      orderBy: (schedules, { desc }) => [desc(schedules.createdAt)]
    });

    return NextResponse.json({ schedules });
  } catch (error: any) {
    console.error("Failed to fetch schedules:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      adsAccountId, name, actionType, 
      executionTime, budgetValue, budgetIsPercentage, 
      campaignIds, status 
    } = body;

    if (!adsAccountId || !name || !actionType || !executionTime || !campaignIds) {
       return new NextResponse("Missing required fields", { status: 400 });
    }

    // Server side validation for 5-min intervals
    if (!/^([01]\d|2[0-3]):[0-5][05]$/.test(executionTime)) {
        return new NextResponse("executionTime must be in 5-minute intervals (HH:MM)", { status: 400 });
    }

    const [newSchedule] = await db.insert(campaignSchedules).values({
      adsAccountId,
      name,
      actionType,
      executionTime,
      budgetValue: budgetValue?.toString() || null,
      budgetIsPercentage: budgetIsPercentage || false,
      campaignIds,
      status: status || 'active'
    }).returning();

    return NextResponse.json({ schedule: newSchedule });
  } catch (error: any) {
    console.error("Failed to create schedule:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
