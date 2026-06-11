import { NextResponse } from "next/server";
import { db, optimizationRules, ruleConditions, ruleActions } from "@repo/db";
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
    const rules = await db.query.optimizationRules.findMany({
      where: eq(optimizationRules.adsAccountId, adsAccountId),
      with: {
        conditions: true,
        actions: true
      },
      orderBy: (rules, { desc }) => [desc(rules.priority)]
    });

    return NextResponse.json({ rules });
  } catch (error: any) {
    console.error("Failed to fetch rules:", error);
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
      adsAccountId, name, description, 
      targetType, targetValue, schedule, 
      conditions, actions, priority 
    } = body;

    const result = await db.transaction(async (tx) => {
      // 1. Insert Rule
      const [newRule] = await tx.insert(optimizationRules).values({
        adsAccountId,
        name,
        description,
        targetType,
        targetValue,
        schedule,
        priority: priority || 0,
        isEnabled: true
      }).returning();

      // 2. Insert Conditions
      if (conditions && Array.isArray(conditions)) {
        await tx.insert(ruleConditions).values(
          conditions.map((c: any) => ({
            ruleId: newRule.id,
            conditionGroup: c.conditionGroup || 0,
            metric: c.metric,
            operator: c.operator,
            value: c.value.toString(),
            valueMax: c.valueMax?.toString(),
            sortOrder: c.sortOrder || 0
          }))
        );
      }

      // 3. Insert Actions
      if (actions && Array.isArray(actions)) {
        await tx.insert(ruleActions).values(
          actions.map((a: any) => ({
            ruleId: newRule.id,
            actionOrder: a.actionOrder || 0,
            actionType: a.actionType,
            actionValue: a.actionValue?.toString(),
            alertMessage: a.alertMessage,
            telegramConnectionId: a.telegramConnectionId
          }))
        );
      }

      return newRule;
    });

    return NextResponse.json({ rule: result });
  } catch (error: any) {
    console.error("Failed to create rule:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
