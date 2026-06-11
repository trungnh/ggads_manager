import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CampaignsService } from "@repo/google-ads";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId') || "5541508335";
    const userId = "dummy";

    const campaignsService = new CampaignsService(userId, customerId, customerId);
    const today = new Date().toISOString().split('T')[0];
    
    // just fetch 1 raw result
    const query = `
      SELECT 
        campaign.id, 
        campaign.name, 
        campaign.status, 
        campaign.bidding_strategy_type
      FROM campaign 
      WHERE segments.date = '${today}'
        AND campaign.status != 'REMOVED'
      LIMIT 1
    `;
    
    const client = (campaignsService as any).client;
    const raw = await client.searchStream(query);

    return NextResponse.json({ raw });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
