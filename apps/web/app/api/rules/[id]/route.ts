import { NextResponse } from "next/server";
import { db, optimizationRules, ruleConditions, ruleActions } from "@repo/db";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      name, description, targetType, targetValue, 
      schedule, conditions, actions, priority, isEnabled 
    } = body;

    const result = await db.transaction(async (tx) => {
      // 1. Update main Rule
      const [updatedRule] = await tx.update(optimizationRules)
        .set({
          name,
          description,
          targetType,
          targetValue,
          schedule,
          priority: priority || 0,
          isEnabled: isEnabled !== undefined ? isEnabled : true,
          updatedAt: new Date()
        })
        .where(eq(optimizationRules.id, id))
        .returning();

      // 2. Refresh Conditions
      if (conditions && Array.isArray(conditions)) {
        await tx.delete(ruleConditions).where(eq(ruleConditions.ruleId, id));
        await tx.insert(ruleConditions).values(
          conditions.map((c: any) => ({
            ruleId: id,
            conditionGroup: c.conditionGroup || 0,
            metric: c.metric ? c.metric.trim() : "",
            operator: c.operator ? c.operator.trim() : "",
            value: (c.value !== undefined && c.value !== null && c.value !== "") ? c.value.toString() : "0",
            valueMax: (c.valueMax !== undefined && c.valueMax !== null && c.valueMax !== "") ? c.valueMax.toString() : null,
            sortOrder: c.sortOrder || 0
          }))
        );
      }

      // 3. Refresh Actions
      if (actions && Array.isArray(actions)) {
        await tx.delete(ruleActions).where(eq(ruleActions.ruleId, id));
        await tx.insert(ruleActions).values(
          actions.map((a: any) => ({
            ruleId: id,
            actionOrder: a.actionOrder || 0,
            actionType: a.actionType ? a.actionType.trim() : "",
            actionValue: (a.actionValue !== undefined && a.actionValue !== null && a.actionValue !== "") ? a.actionValue.toString() : null,
            alertMessage: a.alertMessage,
            telegramConnectionId: (a.telegramConnectionId && a.telegramConnectionId !== "") ? a.telegramConnectionId : null
          }))
        );
      }

      return updatedRule;
    });

    return NextResponse.json({ rule: result });
  } catch (error: any) {
    console.error("Failed to update rule:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const [updatedRule] = await db.update(optimizationRules)
      .set({
        ...body,
        updatedAt: new Date()
      })
      .where(eq(optimizationRules.id, id))
      .returning();

    return NextResponse.json({ rule: updatedRule });
  } catch (error: any) {
    console.error("Failed to patch rule:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const rule = await db.query.optimizationRules.findFirst({
      where: eq(optimizationRules.id, id),
      with: {
        conditions: true,
        actions: true
      }
    });

    if (!rule) {
      return new NextResponse("Rule not found", { status: 404 });
    }

    return NextResponse.json({ rule });
  } catch (error: any) {
    console.error("Failed to fetch rule:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await db.delete(optimizationRules).where(eq(optimizationRules.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete rule:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
