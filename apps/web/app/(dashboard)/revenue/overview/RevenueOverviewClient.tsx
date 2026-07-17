"use client";

import * as React from "react";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  DollarSign, 
  Percent, 
  Calendar,
  BarChart3,
  CalendarDays,
  FileSpreadsheet
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface DailyAggregate {
  date: string;
  orders: number;
  quantity: number;
  revenue: number;
  adsCost: number;
  shipCost: number;
  goodsCost: number;
  returnCost: number;
  totalCost: number;
  profit: number;
}

interface RevenueOverviewClientProps {
  dailyData: DailyAggregate[];
  totals: {
    orders: number;
    revenue: number;
    adsCost: number;
    profit: number;
  };
  comparison: {
    orders: number | null;
    revenue: number | null;
    adsCost: number | null;
    profit: number | null;
  };
  filterMonth: string;
}

export default function RevenueOverviewClient({
  dailyData,
  totals,
  comparison,
  filterMonth
}: RevenueOverviewClientProps) {
  const router = useRouter();

  const [selectedMonth, setSelectedMonth] = React.useState(filterMonth);

  React.useEffect(() => {
    router.push(`/revenue/overview?month=${selectedMonth}`);
  }, [selectedMonth, router]);

  // Month options generator
  const monthOptions = React.useMemo(() => {
    const currYear = new Date().getFullYear();
    const list = [];
    for (let y = currYear; y >= currYear - 1; y--) {
      for (let m = 12; m >= 1; m--) {
        const mStr = String(m).padStart(2, "0");
        list.push({
          value: `${y}-${mStr}`,
          label: `Tháng ${mStr} Năm ${y}`
        });
      }
    }
    return list;
  }, []);

  const overallProfitPercent = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;
  const overallRoas = totals.adsCost > 0 ? totals.revenue / totals.adsCost : 0;
  const overallAdsPercent = totals.revenue > 0 ? (totals.adsCost / totals.revenue) * 105 : 0;

  // Format Helper
  const formatCurrency = (val: number) => {
    if (val === 0) return "0 đ";
    return Math.round(val).toLocaleString("vi-VN") + " đ";
  };

  const formatGrowth = (val: number | null) => {
    if (val === null) return "NaN%";
    const sign = val >= 0 ? "↑" : "↓";
    return `${sign} ${Math.abs(val).toFixed(1)}%`;
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Header Banner - styled with a premium background banner matching the reference design */}
      <div className="bg-slate-900 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/revenue" className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Tổng Quan
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                Báo cáo tổng hợp doanh thu của tất cả sản phẩm
              </p>
            </div>
          </div>
          
          {/* Month selector inside the banner */}
          <div className="flex items-center gap-2">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 rounded-lg border-0 text-xs px-3 bg-white text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm"
            >
              {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>

        {/* KPI Cards inside the banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Total Orders Card */}
          <div className="bg-white text-slate-900 rounded-xl p-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-450 tracking-wider uppercase">TỔNG ĐƠN</span>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {totals.orders.toLocaleString("vi-VN")}
                </div>
              </div>
              <div className="p-2 rounded-full bg-rose-50 text-rose-600 shrink-0">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] mt-3">
              {comparison.orders !== null ? (
                <span className={cn("font-bold flex items-center", comparison.orders >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {formatGrowth(comparison.orders)}
                </span>
              ) : (
                <span className="text-slate-400 font-medium">--</span>
              )}
              <span className="text-slate-500">So với tháng trước</span>
            </div>
          </div>

          {/* Total Revenue Card */}
          <div className="bg-white text-slate-900 rounded-xl p-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-450 tracking-wider uppercase">DOANH THU</span>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {formatCurrency(totals.revenue)}
                </div>
              </div>
              <div className="p-2 rounded-full bg-amber-50 text-amber-600 shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] mt-3">
              {comparison.revenue !== null ? (
                <span className={cn("font-bold flex items-center", comparison.revenue >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {formatGrowth(comparison.revenue)}
                </span>
              ) : (
                <span className="text-slate-400 font-medium">--</span>
              )}
              <span className="text-slate-500">So với tháng trước</span>
            </div>
          </div>

          {/* Total Ads Cost Card */}
          <div className="bg-white text-slate-900 rounded-xl p-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-450 tracking-wider uppercase">TIỀN ADS</span>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {formatCurrency(totals.adsCost)}
                </div>
              </div>
              <div className="p-2 rounded-full bg-emerald-50 text-emerald-600 shrink-0">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] mt-3">
              {comparison.adsCost !== null ? (
                <span className={cn("font-bold flex items-center", comparison.adsCost <= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {formatGrowth(comparison.adsCost)}
                </span>
              ) : (
                <span className="text-slate-400 font-medium">--</span>
              )}
              <span className="text-slate-500">So với tháng trước</span>
            </div>
          </div>

          {/* Total Profit Card */}
          <div className="bg-white text-slate-900 rounded-xl p-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-450 tracking-wider uppercase">LỢI NHUẬN</span>
                <div className="text-xl font-black text-slate-900 mt-1 flex items-baseline gap-1">
                  {formatCurrency(totals.profit)}
                  <span className="text-xs text-slate-500 font-normal">
                    ({overallProfitPercent.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div className="p-2 rounded-full bg-sky-50 text-sky-650 shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] mt-3">
              {comparison.profit !== null ? (
                <span className={cn("font-bold flex items-center", comparison.profit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {formatGrowth(comparison.profit)}
                </span>
              ) : (
                <span className="text-slate-400 font-medium">--</span>
              )}
              <span className="text-slate-500">So với tháng trước</span>
            </div>
          </div>

        </div>
      </div>

      {/* Table Section Title */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-sm font-bold text-[var(--text-1)] uppercase tracking-wider flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-slate-550 dark:text-slate-450" />
          Tổng quan theo ngày
        </h2>
        
        <Link href="/revenue" className="text-xs text-emerald-600 dark:text-emerald-500 font-semibold hover:underline flex items-center gap-1">
          <FileSpreadsheet className="w-4.5 h-4.5" />
          Xem chi tiết sản phẩm
        </Link>
      </div>

      {/* Daily list table */}
      <Card className="bg-[var(--bg-card)] border border-[var(--border)] shadow-sm overflow-hidden rounded-xl">
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[1250px] border-collapse text-xs">
            <TableHeader className="bg-slate-900 dark:bg-slate-950 border-b border-slate-800">
              <TableRow className="hover:bg-slate-900">
                <TableHead className="font-bold text-white uppercase text-center w-24">Ngày</TableHead>
                <TableHead className="font-bold text-white uppercase text-center w-16">Đơn</TableHead>
                <TableHead className="font-bold text-white uppercase text-center w-16">SL</TableHead>
                <TableHead className="font-bold text-white uppercase text-right w-28 pr-3">Tiền hàng</TableHead>
                <TableHead className="font-bold text-white uppercase text-right w-28 pr-3">Tiền Ads</TableHead>
                <TableHead className="font-bold text-white uppercase text-right w-24 pr-3">Vận chuyển</TableHead>
                <TableHead className="font-bold text-white uppercase text-right w-24 pr-3">Tiền hoàn</TableHead>
                <TableHead className="font-bold text-white uppercase text-right w-28 pr-3">Tổng chi</TableHead>
                <TableHead className="font-bold text-white uppercase text-right w-28 pr-3">Doanh thu</TableHead>
                <TableHead className="font-bold text-white uppercase text-right w-32 pr-3">Lợi Nhuận</TableHead>
                <TableHead className="font-bold text-white uppercase text-center w-20">% Ads</TableHead>
                <TableHead className="font-bold text-white uppercase text-center w-20">ROAS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[var(--border)]">
              {dailyData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-10 text-[var(--text-3)] text-sm">
                    Không có dữ liệu cho tháng này.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {dailyData.map((day) => {
                    const rowAdsPercent = day.revenue > 0 ? (day.adsCost / day.revenue) * 100 : 0;
                    const rowRoas = day.adsCost > 0 ? day.revenue / day.adsCost : 0;
                    const rowProfitPercent = day.revenue > 0 ? (day.profit / day.revenue) * 100 : 0;

                    return (
                      <TableRow key={day.date} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                        <TableCell className="text-center font-semibold text-[var(--text-2)]">
                          {new Date(day.date).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell className="text-center text-[var(--text-1)] font-semibold">
                          {day.orders.toLocaleString("vi-VN")}
                        </TableCell>
                        <TableCell className="text-center text-[var(--text-2)] font-semibold">
                          {day.quantity.toLocaleString("vi-VN")}
                        </TableCell>
                        <TableCell className="text-right text-[var(--text-2)] pr-3">
                          {day.goodsCost > 0 ? Math.round(day.goodsCost).toLocaleString("vi-VN") : "0"}
                        </TableCell>
                        <TableCell className="text-right text-[var(--text-2)] pr-3">
                          {day.adsCost > 0 ? Math.round(day.adsCost).toLocaleString("vi-VN") : "0"}
                        </TableCell>
                        <TableCell className="text-right text-[var(--text-2)] pr-3">
                          {day.shipCost > 0 ? Math.round(day.shipCost).toLocaleString("vi-VN") : "0"}
                        </TableCell>
                        <TableCell className="text-right text-[var(--text-2)] pr-3">
                          {day.returnCost > 0 ? Math.round(day.returnCost).toLocaleString("vi-VN") : "0"}
                        </TableCell>
                        <TableCell className="text-right text-[var(--text-2)] pr-3">
                          {day.totalCost > 0 ? Math.round(day.totalCost).toLocaleString("vi-VN") : "0"}
                        </TableCell>
                        {/* Highlighted Bold Red/Coral text for Doanh thu as requested */}
                        <TableCell className="text-right text-rose-600 dark:text-rose-400 font-bold pr-3">
                          {day.revenue > 0 ? Math.round(day.revenue).toLocaleString("vi-VN") : "0"}
                        </TableCell>
                        {/* Bold Red/Green text for Lợi nhuận */}
                        <TableCell className={cn(
                          "text-right font-bold pr-3 text-[12.5px]",
                          day.profit > 0 
                            ? "text-emerald-600 dark:text-emerald-400" 
                            : day.profit < 0 
                              ? "text-rose-600 dark:text-rose-400" 
                              : "text-[var(--text-2)]"
                        )}>
                          {day.profit !== 0 ? Math.round(day.profit).toLocaleString("vi-VN") : "0"}
                          {day.revenue > 0 && (
                            <span className="text-[10px] text-slate-405 dark:text-slate-500 font-normal ml-1">
                              ({rowProfitPercent.toFixed(1)}%)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-medium text-[var(--text-2)]">
                          {rowAdsPercent > 0 ? rowAdsPercent.toFixed(1) + "%" : "0.0%"}
                        </TableCell>
                        <TableCell className="text-center font-bold text-[var(--text-1)]">
                          {rowRoas > 0 ? rowRoas.toFixed(2) : "0.00"}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Summary Totals Row at the bottom of the list */}
                  <TableRow className="bg-slate-100 dark:bg-slate-900 font-bold border-t border-[var(--border)] hover:bg-slate-200/50 dark:hover:bg-slate-900/80">
                    <TableCell className="text-center font-bold text-[var(--text-1)]">Tổng cộng</TableCell>
                    <TableCell className="text-center text-[var(--text-1)] font-bold">
                      {totals.orders.toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-center text-[var(--text-1)] font-bold">
                      {dailyData.reduce((s, r) => s + r.quantity, 0).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right text-[var(--text-1)] font-bold pr-3">
                      {Math.round(dailyData.reduce((s, r) => s + r.goodsCost, 0)).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right text-[var(--text-1)] font-bold pr-3">
                      {Math.round(totals.adsCost).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right text-[var(--text-1)] font-bold pr-3">
                      {Math.round(dailyData.reduce((s, r) => s + r.shipCost, 0)).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right text-[var(--text-1)] font-bold pr-3">
                      {Math.round(dailyData.reduce((s, r) => s + r.returnCost, 0)).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right text-[var(--text-1)] font-bold pr-3">
                      {Math.round(dailyData.reduce((s, r) => s + r.totalCost, 0)).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right text-rose-600 dark:text-rose-450 font-extrabold pr-3">
                      {Math.round(totals.revenue).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-extrabold pr-3 bg-emerald-50/20 dark:bg-emerald-950/5 text-sm",
                      totals.profit > 0 ? "text-emerald-600 dark:text-emerald-400" : totals.profit < 0 ? "text-rose-600 dark:text-rose-400" : "text-[var(--text-1)]"
                    )}>
                      {Math.round(totals.profit).toLocaleString("vi-VN")}
                      {totals.revenue > 0 && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold ml-1">
                          ({overallProfitPercent.toFixed(1)}%)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-bold text-[var(--text-1)]">
                      {overallAdsPercent > 0 ? (totals.adsCost / totals.revenue * 100).toFixed(1) + "%" : "0.0%"}
                    </TableCell>
                    <TableCell className="text-center font-bold text-[var(--text-1)]">
                      {overallRoas > 0 ? overallRoas.toFixed(2) : "0.00"}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}
