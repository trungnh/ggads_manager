import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@repo/db";
import { aiConnections } from "@repo/db/src/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider, apiKey: passedApiKey } = await req.json();

    if (!provider) {
      return NextResponse.json({ error: "Provider is required" }, { status: 400 });
    }

    let apiKey = passedApiKey;

    // If API Key is not passed in the request body, load the encrypted key from the database
    if (!apiKey) {
      const existing = await db.query.aiConnections.findFirst({
        where: and(
          eq(aiConnections.userId, session.user.id),
          eq(aiConnections.provider, provider)
        )
      });

      if (!existing) {
        return NextResponse.json({ error: "No API Key found for this provider" }, { status: 404 });
      }

      apiKey = decrypt(existing.apiKey);
    }

    if (!apiKey) {
      return NextResponse.json({ error: "API Key is empty" }, { status: 400 });
    }

    // ── Test logic based on Provider ──
    if (provider === "gemini" || provider === "gemini-pro") {
      // List of candidate models to try in sequence for robustness
      const candidates = provider === "gemini-pro" 
        ? ["gemini-2.5-pro", "gemini-3.1-pro-preview", "gemini-pro"]
        : ["gemini-2.5-flash", "gemini-3.5-flash"];

      let lastError = "";
      let success = false;
      let usedModel = "";

      for (const model of candidates) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "Hello" }] }]
            })
          });

          if (response.ok) {
            success = true;
            usedModel = model;
            break;
          } else {
            const errData = await response.json().catch(() => ({}));
            lastError = errData?.error?.message || `Google API returned status ${response.status} for model ${model}`;
          }
        } catch (e: any) {
          lastError = e.message || `Không thể kết nối tới Google API cho model ${model}`;
        }
      }

      if (success) {
        return NextResponse.json({ 
          success: true, 
          message: `Kết nối thành công tới Google Gemini (đã xác thực qua model ${usedModel})!` 
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: lastError || "Không thể xác thực bất kỳ model Gemini nào." 
        });
      }
    } else if (provider === "openai") {
      const url = "https://api.openai.com/v1/chat/completions";

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "Hello" }],
            max_tokens: 5
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          return NextResponse.json({ 
            success: false, 
            error: errData?.error?.message || `OpenAI API returned status ${response.status}`
          });
        }

        return NextResponse.json({ success: true, message: "Kết nối thành công tới OpenAI!" });
      } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message || "Không thể kết nối tới OpenAI API" });
      }
    }

    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });

  } catch (error) {
    console.error("POST /api/settings/ai-connections/test error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
