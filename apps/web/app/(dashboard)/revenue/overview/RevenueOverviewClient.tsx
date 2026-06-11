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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const overallAdsPercent = totals.revenue > 0 ? (totals.adsCost / totals.revenue) * 100 : 0;

  // Format Helper
  const formatCurrency = (val: number) => {
    if (val === 0) return "0 đ";
    return Math.round(val).toLocaleString("vi-VN") + " đ";
  };

  const formatGrowth = (val: number | null) => {
    if (val === null) return "NaN%";
    const sign = val >= 0 ? "+" : "";
    return `${sign}${val.toFixed(1)}%`;
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/revenue" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Tổng quan Báo cáo Doanh thu</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Phân tích tổng hợp hiệu quả tài chính và so sánh tăng trưởng hàng tháng.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 rounded-md border border-slate-250 dark:border-slate-850 text-xs px-3 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          >
            {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          
          <Link href="/revenue" className={cn("text-xs h-9 px-4 rounded-md border border-slate-200 dark:border-slate-850 hover:bg-slate-50 hover:dark:bg-slate-900 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950/20 flex items-center gap-1.5 font-medium")}>
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
            Trang Thống kê
          </Link>
        </div>
      </div>

      {/* KPI Cards section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Orders Card */}
        <Card className="glass-card border border-slate-200 dark:border-slate-900 shadow-sm overflow-hidden bg-white dark:bg-slate-950/40 relative rounded-xl">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-550 dark:text-slate-400 tracking-wider uppercase">TỔNG ĐƠN HÀNG</span>
              <div className="p-2 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-650 dark:text-rose-400">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold text-slate-850 dark:text-slate-100">
              {totals.orders.toLocaleString("vi-VN")}
            </div>
            <div className="flex items-center gap-1 text-xs">
              {comparison.orders !== null && comparison.orders >= 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                  {formatGrowth(comparison.orders)}
                </span>
              ) : (
                <span className="text-rose-605 dark:text-rose-450 font-bold flex items-center">
                  <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                  {formatGrowth(comparison.orders)}
                </span>
              )}
              <span className="text-slate-500 dark:text-slate-400">so với tháng trước</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue Card */}
        <Card className="glass-card border border-slate-200 dark:border-slate-900 shadow-sm overflow-hidden bg-white dark:bg-slate-950/40 relative rounded-xl">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-550 dark:text-slate-400 tracking-wider uppercase">DOANH THU THỰC</span>
              <div className="p-2 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-650 dark:text-amber-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold text-slate-850 dark:text-slate-100">
              {formatCurrency(totals.revenue)}
            </div>
            <div className="flex items-center gap-1 text-xs">
              {comparison.revenue !== null && comparison.revenue >= 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                  {formatGrowth(comparison.revenue)}
                </span>
              ) : (
                <span className="text-rose-605 dark:text-rose-450 font-bold flex items-center">
                  <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                  {formatGrowth(comparison.revenue)}
                </span>
              )}
              <span className="text-slate-500 dark:text-slate-400">so với tháng trước</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Ads Cost Card */}
        <Card className="glass-card border border-slate-200 dark:border-slate-900 shadow-sm overflow-hidden bg-white dark:bg-slate-950/40 relative rounded-xl">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-550 dark:text-slate-400 tracking-wider uppercase">CHI PHÍ QUẢNG CÁO</span>
              <div className="p-2 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-650 dark:text-emerald-400">
                <Percent className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold text-slate-850 dark:text-slate-100">
              {formatCurrency(totals.adsCost)}
            </div>
            <div className="flex items-center gap-1 text-xs">
              {comparison.adsCost !== null && comparison.adsCost <= 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
                  <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                  {formatGrowth(comparison.adsCost)}
                </span>
              ) : (
                <span className="text-rose-605 dark:text-rose-450 font-bold flex items-center">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                  {formatGrowth(comparison.adsCost)}
                </span>
              )}
              <span className="text-slate-500 dark:text-slate-400">so với tháng trước</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Profit Card */}
        <Card className="glass-card border border-slate-200 dark:border-slate-900 shadow-sm overflow-hidden bg-white dark:bg-slate-950/40 relative rounded-xl">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-550 dark:text-slate-400 tracking-wider uppercase">LỢI NHUẬN RÒNG</span>
              <div className="p-2 rounded-full bg-sky-50 dark:bg-sky-950/30 text-sky-650 dark:text-sky-400">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold text-slate-850 dark:text-slate-100 flex items-baseline gap-1">
              {formatCurrency(totals.profit)}
              <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                ({overallProfitPercent.toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              {comparison.profit !== null && comparison.profit >= 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                  {formatGrowth(comparison.profit)}
                </span>
              ) : (
                <span className="text-rose-605 dark:text-rose-450 font-bold flex items-center">
                  <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                  {formatGrowth(comparison.profit)}
                </span>
              )}
              <span className="text-slate-500 dark:text-slate-400">so với tháng trước</span>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Daily list table */}
      <Card className="glass-card border border-slate-200 dark:border-slate-900 shadow-sm overflow-hidden bg-white dark:bg-slate-950/40 rounded-xl">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-150 dark:border-slate-900 py-3.5 px-6 flex flex-row items-center gap-2">
          <CalendarDays className="w-4.5 h-4.5 text-slate-650 dark:text-slate-450" />
          <CardTitle className="text-sm font-semibold text-slate-850 dark:text-slate-200">Biểu đồ Tổng hợp theo Ngày</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[1250px] border-collapse text-xs">
            <TableHeader className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-900">
              <TableRow>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 w-24">Ngày</TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-center w-16">Đơn</TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-center w-16">SL</TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-right w-28">Tiền hàng (COGS)</TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-right w-28">Tiền Ads</TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-right w-24">Vận chuyển</TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-right w-24">Tiền hoàn</TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-right w-28">Tổng chi</TableHead>
                <TableHead className="font-bold text-rose-700 dark:text-rose-450 text-right w-28">Doanh thu</TableHead>
                <TableHead className="font-bold text-emerald-700 dark:text-emerald-400 text-right w-32 bg-emerald-50/20 dark:bg-emerald-950/15">Lợi Nhuận</TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-center w-16">% Ads</TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-center w-16">ROAS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-200 dark:divide-slate-900/80">
              {dailyData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-10 text-slate-450 dark:text-slate-400 text-sm">
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
                      <TableRow key={day.date} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                        <TableCell className="font-semibold text-slate-650 dark:text-slate-350">
                          {new Date(day.date).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell className="text-center text-slate-800 dark:text-slate-200 font-semibold">
                          {day.orders.toLocaleString("vi-VN")}
                        </TableCell>
                        <TableCell className="text-center text-slate-800 dark:text-slate-200 font-semibold">
                          {day.quantity.toLocaleString("vi-VN")}
                        </TableCell>
                        <TableCell className="text-right text-slate-600 dark:text-slate-400 font-normal pr-3">
                          {day.goodsCost > 0 ? Math.round(day.goodsCost).toLocaleString("vi-VN") : "-"}
                        </TableCell>
                        <TableCell className="text-right text-rose-600 font-semibold pr-3">
                          {day.adsCost > 0 ? Math.round(day.adsCost).toLocaleString("vi-VN") : "-"}
                        </TableCell>
                        <TableCell className="text-right text-slate-600 dark:text-slate-400 font-normal pr-3">
                          {day.shipCost > 0 ? Math.round(day.shipCost).toLocaleString("vi-VN") : "-"}
                        </TableCell>
                        <TableCell className="text-right text-slate-600 dark:text-slate-400 font-normal pr-3">
                          {day.returnCost > 0 ? Math.round(day.returnCost).toLocaleString("vi-VN") : "-"}
                        </TableCell>
                        <TableCell className="text-right text-slate-700 dark:text-slate-300 font-semibold pr-3">
                          {day.totalCost > 0 ? Math.round(day.totalCost).toLocaleString("vi-VN") : "-"}
                        </TableCell>
                        <TableCell className="text-right text-slate-850 dark:text-slate-100 font-bold pr-3">
                          {day.revenue > 0 ? Math.round(day.revenue).toLocaleString("vi-VN") : "-"}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-bold pr-3 bg-emerald-50/20 dark:bg-emerald-950/5 text-[12.5px]",
                          day.profit > 0 ? "text-emerald-600 dark:text-emerald-400" : day.profit < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-650 dark:text-slate-400"
                        )}>
                          {day.profit !== 0 ? Math.round(day.profit).toLocaleString("vi-VN") : "0"}
                          {day.revenue > 0 && (
                            <span className="text-[10px] text-slate-450 dark:text-slate-500 font-normal ml-1">
                              ({rowProfitPercent.toFixed(1)}%)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-medium text-slate-600 dark:text-slate-400">
                          {rowAdsPercent > 0 ? rowAdsPercent.toFixed(1) + "%" : "--"}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-slate-850 dark:text-slate-200">
                          {rowRoas > 0 ? rowRoas.toFixed(2) : "--"}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Summary Totals Row */}
                  <TableRow className="bg-slate-100/90 dark:bg-slate-900/80 font-bold border-t border-slate-200 dark:border-slate-800 hover:bg-slate-200/50 dark:hover:bg-slate-900">
                    <TableCell className="font-bold text-slate-800 dark:text-slate-200">Tổng cộng</TableCell>
                    <TableCell className="text-center text-slate-800 dark:text-slate-200 font-bold">
                      {totals.orders.toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-center text-slate-800 dark:text-slate-200 font-bold">
                      {dailyData.reduce((s, r) => s + r.quantity, 0).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right text-slate-700 dark:text-slate-300 font-bold pr-3">
                      {Math.round(dailyData.reduce((s, r) => s + r.goodsCost, 0)).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right text-rose-700 dark:text-rose-450 font-bold pr-3">
                      {Math.round(totals.adsCost).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right text-slate-700 dark:text-slate-300 font-bold pr-3">
                      {Math.round(dailyData.reduce((s, r) => s + r.shipCost, 0)).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right text-slate-700 dark:text-slate-300 font-bold pr-3">
                      {Math.round(dailyData.reduce((s, r) => s + r.returnCost, 0)).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right text-slate-700 dark:text-slate-300 font-bold pr-3">
                      {Math.round(dailyData.reduce((s, r) => s + r.totalCost, 0)).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right text-slate-850 dark:text-slate-100 font-extrabold pr-3">
                      {Math.round(totals.revenue).toLocaleString("vi-VN")} đ
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-extrabold pr-3 bg-emerald-50 dark:bg-emerald-950/15 text-sm",
                      totals.profit > 0 ? "text-emerald-600 dark:text-emerald-400" : totals.profit < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-202"
                    )}>
                      {Math.round(totals.profit).toLocaleString("vi-VN")} đ
                      {totals.revenue > 0 && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold ml-1">
                          ({overallProfitPercent.toFixed(1)}%)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-bold text-slate-750 dark:text-slate-300">
                      {overallAdsPercent > 0 ? overallAdsPercent.toFixed(1) + "%" : "--"}
                    </TableCell>
                    <TableCell className="text-center font-bold text-slate-800 dark:text-slate-200">
                      {overallRoas > 0 ? overallRoas.toFixed(2) : "--"}
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
