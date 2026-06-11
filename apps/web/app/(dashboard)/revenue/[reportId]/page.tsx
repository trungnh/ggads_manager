import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db, revenueReports, revenueReportDaily } from "@repo/db";
import { eq, and } from "drizzle-orm";
import RevenueDetailPageClient from "./RevenueDetailPageClient";

export default async function RevenueDetailPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const report = await db.query.revenueReports.findFirst({
    where: and(eq(revenueReports.id, reportId), eq(revenueReports.userId, session.user.id))
  });

  if (!report) {
    notFound();
  }

  const dailyData = await db.query.revenueReportDaily.findMany({
    where: eq(revenueReportDaily.reportId, report.id),
    orderBy: (daily, { asc }) => [asc(daily.date)]
  });

  return (
    <RevenueDetailPageClient 
      initialReport={report} 
      initialDailyData={dailyData} 
    />
  );
}
