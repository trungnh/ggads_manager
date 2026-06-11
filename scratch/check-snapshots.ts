import { db, campaignsSnapshot } from "@repo/db";
import { inArray } from "drizzle-orm";

async function main() {
  const dates = ["2026-05-17", "2026-05-18", "2026-05-19", "2026-05-20", "2026-05-21", "2026-05-22", "2026-05-23"];
  const records = await db
    .select()
    .from(campaignsSnapshot)
    .where(inArray(campaignsSnapshot.date, dates));

  let totalVal = 0n;
  let totalValSuccess = 0n;
  for (const r of records) {
    totalVal += BigInt(r.realConversionValueMicros || "0");
    totalValSuccess += BigInt(r.realConversionValueSuccessMicros || "0");
  }
  console.log("Total realConversionValueMicros:", Number(totalVal) / 1000000);
  console.log("Total realConversionValueSuccessMicros:", Number(totalValSuccess) / 1000000);
}

main().catch(console.error);
