import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, pancakeAccounts } from "@repo/db";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  try {
    // 1. Fetch all pancake accounts for this user
    const accounts = await db.select()
      .from(pancakeAccounts)
      .where(eq(pancakeAccounts.userId, session.user.id));

    if (accounts.length === 0) {
      // Fallback templates if no Pancake account is connected yet
      const fallbackTags = [
        { id: "don-ao", name: "Đơn ảo" },
        { id: "khong-lien-lac-duoc", name: "Không liên lạc được" },
        { id: "spam", name: "Spam" },
        { id: "trung-lap", name: "Trùng lặp" },
        { id: "khach-hen-lai", name: "Khách hẹn lại" },
        { id: "giao-lai", name: "Giao lại" },
        { id: "hang-loi", name: "Hàng lỗi" },
        { id: "thieu-thong-tin", name: "Thiếu thông tin" }
      ];
      return NextResponse.json(fallbackTags);
    }

    const allTagsMap = new Map<string, { id: string; name: string }>();

    // 2. Fetch tags from all registered Pancake shops in parallel
    await Promise.all(
      accounts.map(async (acc) => {
        try {
          const response = await fetch(
            `https://pos.pages.fm/api/v1/shops/${acc.shopId}/orders/tags?api_key=${acc.apiKey}`,
            { next: { revalidate: 60 } } // Cache for 60 seconds
          );

          if (response.ok) {
            const data = await response.json();
            const tags = data.data || data || [];
            for (const tag of tags) {
              const tagName = tag.name?.trim();
              if (tagName) {
                allTagsMap.set(tagName.toLowerCase(), {
                  id: tag.id?.toString() || tagName,
                  name: tagName
                });
              }
            }
          }
        } catch (e) {
          console.error(`[PANCAKE_TAGS_GET] Failed fetching for shop ${acc.shopId}:`, e);
        }
      })
    );

    const mergedTags = Array.from(allTagsMap.values());
    return NextResponse.json(mergedTags);

  } catch (error) {
    console.error("[PANCAKE_TAGS_GET_GLOBAL]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const { shopId, apiKey } = body;

    if (!shopId || !apiKey) {
      return new NextResponse("Missing Shop ID or API Key", { status: 400 });
    }

    // Official Pancake POS API call
    const response = await fetch(`https://pos.pages.fm/api/v1/shops/${shopId}/orders/tags?api_key=${apiKey}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[PANCAKE_TAGS_ERROR]", errorText);
      return NextResponse.json({ error: errorText, success: false }, { status: response.status });
    }

    const data = await response.json();
    
    // Pancake returns tags in a specific format, we might need to map them
    // Assuming data is an array of { id, name, color, ... }
    const tags = (data.data || data || []).map((tag: any) => ({
      id: tag.id || tag.name,
      name: tag.name
    }));

    return NextResponse.json(tags);
  } catch (error) {
    console.error("[PANCAKE_TAGS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
