import { NextResponse } from "next/server";
import { db, campaignSchedules } from "@repo/db";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { 
      name, actionType, executionTime, 
      budgetValue, budgetIsPercentage, 
      campaignIds, status 
    } = body;

    // Server side validation for 5-min intervals if executionTime is provided
    if (executionTime && !/^([01]\d|2[0-3]):[0-5][05]$/.test(executionTime)) {
        return new NextResponse("executionTime must be in 5-minute intervals (HH:MM)", { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (actionType !== undefined) updateData.actionType = actionType;
    if (executionTime !== undefined) updateData.executionTime = executionTime;
    if (budgetValue !== undefined) updateData.budgetValue = budgetValue?.toString() || null;
    if (budgetIsPercentage !== undefined) updateData.budgetIsPercentage = budgetIsPercentage;
    if (campaignIds !== undefined) updateData.campaignIds = campaignIds;
    if (status !== undefined) updateData.status = status;
    updateData.updatedAt = new Date();

    const [updatedSchedule] = await db.update(campaignSchedules)
      .set(updateData)
      .where(eq(campaignSchedules.id, id))
      .returning();

    if (!updatedSchedule) {
      return new NextResponse("Schedule not found", { status: 404 });
    }

    return NextResponse.json({ schedule: updatedSchedule });
  } catch (error: any) {
    console.error("Failed to update schedule:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const [deletedSchedule] = await db.delete(campaignSchedules)
      .where(eq(campaignSchedules.id, id))
      .returning();

    if (!deletedSchedule) {
      return new NextResponse("Schedule not found", { status: 404 });
    }

    return NextResponse.json({ success: true, schedule: deletedSchedule });
  } catch (error: any) {
    console.error("Failed to delete schedule:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
