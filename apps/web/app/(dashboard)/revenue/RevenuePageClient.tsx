"use client";

import * as React from "react";
import { 
  BarChart3, 
  TrendingUp, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Eye, 
  Filter, 
  Calendar,
  CheckCircle,
  AlertCircle,
  LineChart
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ProductOption {
  id: string;
  name: string;
  code: string;
}

interface FilteredReport {
  id: string;
  name: string;
  month: string;
  productId: string | null;
  createdAt: Date | null;
  productName: string | null;
  productCode: string | null;
  totalOrders: number;
  totalRevenue: number;
  totalAdsCost: number;
  totalProfit: number;
}

interface RevenuePageClientProps {
  reports: FilteredReport[];
  products: ProductOption[];
  initialFilters: {
    month: string;
    productId: string;
    reportByTime: boolean;
    startMonth: string;
    endMonth: string;
  };
}

export default function RevenuePageClient({ 
  reports, 
  products, 
  initialFilters 
}: RevenuePageClientProps) {
  const router = useRouter();

  // 1. Filtering state
  const [month, setMonth] = React.useState(initialFilters.month);
  const [productId, setProductId] = React.useState(initialFilters.productId);
  const [reportByTime, setReportByTime] = React.useState(initialFilters.reportByTime);
  const [startMonth, setStartMonth] = React.useState(initialFilters.startMonth);
  const [endMonth, setEndMonth] = React.useState(initialFilters.endMonth);

  // 2. Creation modal state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedProductId, setSelectedProductId] = React.useState("");
  const [creationMonth, setCreationMonth] = React.useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; // 'YYYY-MM'
  });
  const [isCreating, setIsCreating] = React.useState(false);
  const [toasts, setToasts] = React.useState<Array<{ id: string; message: string; type: "success" | "error" }>>([]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // 3. Trigger filters update on routing
  const applyFilters = React.useCallback(() => {
    const params = new URLSearchParams();
    if (productId) params.set("product_id", productId);
    
    if (reportByTime) {
      params.set("report_by_time", "true");
      if (startMonth) params.set("start_month", startMonth);
      if (endMonth) params.set("end_month", endMonth);
    } else {
      if (month) params.set("month", month);
    }

    router.push(`/revenue?${params.toString()}`);
  }, [productId, reportByTime, startMonth, endMonth, month, router]);

  React.useEffect(() => {
    applyFilters();
  }, [month, productId, reportByTime, startMonth, endMonth, applyFilters]);

  // 4. Grand Totals Calculation
  const grandTotals = React.useMemo(() => {
    let orders = 0;
    let revenue = 0;
    let adsCost = 0;
    let profit = 0;

    for (const r of reports) {
      orders += r.totalOrders;
      revenue += r.totalRevenue;
      adsCost += r.totalAdsCost;
      profit += r.totalProfit;
    }

    const roas = adsCost > 0 ? revenue / adsCost : 0;
    const profitPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      orders,
      revenue,
      adsCost,
      profit,
      roas,
      profitPercent
    };
  }, [reports]);

  // 5. Submit report creation
  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      showToast("Vui lòng chọn một sản phẩm.", "error");
      return;
    }

    setIsCreating(true);
    try {
      const prod = products.find(p => p.id === selectedProductId);
      const name = `${prod?.name} - Báo cáo Tháng ${creationMonth.split('-').reverse().join('/')}`;

      const response = await fetch("/api/revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          productId: selectedProductId,
          month: creationMonth
        })
      });

      if (!response.ok) {
        throw new Error(await response.text() || "Lỗi khi tạo báo cáo.");
      }

      const data = await response.json();
      showToast("Đã khởi tạo báo cáo và đồng bộ dữ liệu ban đầu thành công!", "success");
      
      setIsCreateOpen(false);
      
      // Redirect directly to the interactive spreadsheet detail page
      setTimeout(() => {
        router.push(`/revenue/${data.report.id}`);
      }, 1000);

    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Không thể tạo báo cáo.", "error");
    } finally {
      setIsCreating(false);
    }
  };

  // Delete report
  const handleDeleteReport = async (reportId: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa báo cáo "${name}"? Thao tác này không thể khôi phục.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/revenue/${reportId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Lỗi khi xóa báo cáo.");
      }

      showToast("Đã xóa báo cáo thành công.", "success");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Lỗi xóa báo cáo.", "error");
    }
  };

  // Month Options Helper (Current year and last year)
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

  return (
    <div className="w-full space-y-6">
      
      {/* Toast notifications */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={cn(
            "flex items-center gap-3 px-4 py-3 border text-sm font-medium transition-all duration-300 shadow-xl",
            "rounded-[var(--radius)]",
            t.type === "success" 
              ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400" 
              : "bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-400"
          )}>
            {t.type === "success" ? <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-500" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header controls bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-1)]">Báo cáo Tài chính (PnL)</h1>
          <p className="text-xs text-[var(--text-3)]">
            Quản lý và thống kê PnL ròng sau chi phí quảng cáo, ship và hàng.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="/revenue/overview" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex items-center gap-2 border-[var(--border)] hover:bg-[var(--bg-secondary)] text-[var(--text-2)] bg-[var(--bg-card)] rounded-[calc(var(--radius)*0.8)]")}>
            <LineChart className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
            Tổng quan Tháng
          </Link>
          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer rounded-[calc(var(--radius)*0.8)] border-0">
            <Plus className="w-4 h-4 mr-1.5" />
            Tạo Báo Cáo
          </Button>
        </div>
      </div>

      {/* Advanced Filter block */}
      <Card className="bg-[var(--bg-card)] border border-[var(--border)] shadow-sm overflow-hidden rounded-[var(--radius)]">
        <CardHeader className="bg-[var(--bg-secondary)] border-b border-[var(--border)] py-3.5 px-6 flex flex-row items-center gap-2">
          <Filter className="w-4.5 h-4.5 text-[var(--text-2)]" />
          <CardTitle className="text-sm font-semibold text-[var(--text-1)]">Bộ lọc Báo cáo</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            
            {/* Report by Time switch */}
            <div className="flex items-center gap-2 border-r border-[var(--border)] pr-6">
              <input 
                type="checkbox" 
                id="report_by_time" 
                checked={reportByTime}
                onChange={(e) => setReportByTime(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--border)] text-emerald-600 focus:ring-emerald-500 bg-[var(--bg-card)] cursor-pointer" 
              />
              <label htmlFor="report_by_time" className="text-xs font-semibold text-[var(--text-2)] cursor-pointer">
                Báo cáo theo khoảng thời gian
              </label>
            </div>

            {/* Time filters */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              
              {reportByTime ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--text-3)]">Từ tháng</label>
                    <select 
                      value={startMonth}
                      onChange={(e) => setStartMonth(e.target.value)}
                      className="w-full h-9 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] text-xs px-3 bg-[var(--bg-card)] text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--text-3)]">Đến tháng</label>
                    <select 
                      value={endMonth}
                      onChange={(e) => setEndMonth(e.target.value)}
                      className="w-full h-9 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] text-xs px-3 bg-[var(--bg-card)] text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-3)]">Chọn Tháng</label>
                  <select 
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full h-9 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] text-xs px-3 bg-[var(--bg-card)] text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Tất cả các tháng</option>
                    {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-3)]">Lọc theo Sản phẩm</label>
                <select 
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full h-9 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] text-xs px-3 bg-[var(--bg-card)] text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Tất cả sản phẩm</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                </select>
              </div>

            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table Card */}
      <Card className="bg-[var(--bg-card)] border border-[var(--border)] shadow-sm overflow-hidden rounded-[var(--radius)]">
        <CardHeader className="bg-[var(--bg-secondary)] border-b border-[var(--border)] py-3 px-6">
          <CardTitle className="text-sm font-semibold text-[var(--text-1)]">Danh sách báo cáo</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1000px] border-collapse text-xs">
              <TableHeader className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                <TableRow>
                  <TableHead className="font-bold text-[var(--text-3)] w-12 text-center">#</TableHead>
                  <TableHead className="font-bold text-[var(--text-3)]">Tên Báo Cáo</TableHead>
                  <TableHead className="font-bold text-[var(--text-3)] text-center w-28">Tháng</TableHead>
                  <TableHead className="font-bold text-[var(--text-3)] text-center w-36">Sản phẩm</TableHead>
                  <TableHead className="font-bold text-[var(--text-3)] text-center w-24">Tổng đơn</TableHead>
                  <TableHead className="font-bold text-[var(--text-3)] text-right w-28">Tiền Ads</TableHead>
                  <TableHead className="font-bold text-[var(--text-3)] text-right w-28">Doanh thu</TableHead>
                  <TableHead className="font-bold text-emerald-700 dark:text-emerald-400 text-right w-28 bg-emerald-50/20 dark:bg-emerald-950/15">Lợi nhuận</TableHead>
                  <TableHead className="font-bold text-[var(--text-3)] text-center w-20">ROAS</TableHead>
                  <TableHead className="font-bold text-[var(--text-3)] text-center w-20">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[var(--border)]">
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-[var(--text-3)] text-sm">
                      Chưa có báo cáo nào khớp với bộ lọc đã chọn.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {reports.map((report, idx) => {
                      const roas = report.totalAdsCost > 0 ? report.totalRevenue / report.totalAdsCost : 0;
                      const profitPercent = report.totalRevenue > 0 ? (report.totalProfit / report.totalRevenue) * 100 : 0;

                      return (
                        <TableRow key={report.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                          <TableCell className="text-center font-semibold text-[var(--text-3)]">{idx + 1}</TableCell>
                          <TableCell className="font-semibold">
                            <Link href={`/revenue/${report.id}`} className="text-[var(--text-1)] hover:text-[var(--primary)] hover:underline">
                              {report.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-center text-[var(--text-2)] font-semibold">{report.month}</TableCell>
                          <TableCell className="text-center text-[var(--text-2)] font-medium">
                            {report.productName || "Không xác định"}
                          </TableCell>
                          <TableCell className="text-center text-[var(--text-2)] font-semibold">{report.totalOrders}</TableCell>
                          <TableCell className="text-right text-rose-600 font-semibold pr-3">
                            {report.totalAdsCost > 0 ? Math.round(report.totalAdsCost).toLocaleString("vi-VN") + " đ" : "-"}
                          </TableCell>
                          <TableCell className="text-right text-[var(--text-1)] font-semibold pr-3">
                            {report.totalRevenue > 0 ? Math.round(report.totalRevenue).toLocaleString("vi-VN") + " đ" : "-"}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-bold pr-3 bg-emerald-50/20 dark:bg-emerald-950/5",
                            report.totalProfit > 0 ? "text-emerald-600 dark:text-emerald-400" : report.totalProfit < 0 ? "text-rose-600 dark:text-rose-400" : "text-[var(--text-2)]"
                          )}>
                            {report.totalProfit !== 0 ? Math.round(report.totalProfit).toLocaleString("vi-VN") + " đ" : "-"}
                            {report.totalRevenue > 0 && (
                              <span className="text-[10px] text-[var(--text-3)] font-normal ml-1">
                                ({profitPercent.toFixed(1)}%)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-[var(--text-2)] font-semibold">
                            {roas > 0 ? roas.toFixed(2) : "--"}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Link href={`/revenue/${report.id}`} className="p-1.5 rounded-full text-[var(--text-3)] hover:text-emerald-600 hover:bg-[var(--bg-secondary)] transition-colors">
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteReport(report.id, report.name)}
                                className="h-7 w-7 rounded-full text-[var(--text-3)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {/* Grand Totals Summary Row */}
                    <TableRow className="bg-[var(--bg-secondary)]/80 font-bold border-t border-[var(--border)] hover:bg-[var(--bg-secondary)]">
                      <TableCell colSpan={4} className="text-right font-bold text-[var(--text-1)] pr-6">Tổng cộng:</TableCell>
                      <TableCell className="text-center text-[var(--text-1)] font-bold">{grandTotals.orders}</TableCell>
                      <TableCell className="text-right text-rose-700 dark:text-rose-400 font-bold pr-3">{Math.round(grandTotals.adsCost).toLocaleString("vi-VN")} đ</TableCell>
                      <TableCell className="text-right text-[var(--text-1)] font-bold pr-3">{Math.round(grandTotals.revenue).toLocaleString("vi-VN")} đ</TableCell>
                      <TableCell className={cn(
                        "text-right font-extrabold pr-3 bg-emerald-50 dark:bg-emerald-950/15",
                        grandTotals.profit > 0 ? "text-emerald-600 dark:text-emerald-400" : grandTotals.profit < 0 ? "text-rose-600 dark:text-rose-400" : "text-[var(--text-1)]"
                      )}>
                        {Math.round(grandTotals.profit).toLocaleString("vi-VN")} đ
                        {grandTotals.revenue > 0 && (
                          <span className="text-[10px] text-[var(--text-3)] font-bold ml-1">
                            ({grandTotals.profitPercent.toFixed(1)}%)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-bold text-[var(--text-1)]">{grandTotals.roas > 0 ? grandTotals.roas.toFixed(2) : "--"}</TableCell>
                      <TableCell className="bg-transparent"></TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Premium Creation Dialog (Modal) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-1)] rounded-[var(--radius)] shadow-2xl overflow-hidden p-0">
          <DialogHeader className="bg-[var(--bg-secondary)] px-6 py-4 border-b border-[var(--border)]">
            <DialogTitle className="text-[var(--text-1)] text-base font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-500 animate-pulse" />
              Tạo Báo Cáo Tháng Mới
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateReport} className="p-6 space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-3)]">Chọn Sản Phẩm</label>
              <select 
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full h-10 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] text-xs px-3 bg-[var(--bg-card)] text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                required
              >
                <option value="">-- Chọn sản phẩm --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-3)]">Chọn Tháng/Năm</label>
              <select 
                value={creationMonth}
                onChange={(e) => setCreationMonth(e.target.value)}
                className="w-full h-10 rounded-[calc(var(--radius)*0.8)] border border-[var(--border)] text-xs px-3 bg-[var(--bg-card)] text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                required
              >
                {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>

            <DialogFooter className="pt-4 border-t border-[var(--border)] flex items-center gap-2 justify-end">
              <DialogClose className="text-xs text-[var(--text-3)] hover:text-[var(--text-1)] rounded-[calc(var(--radius)*0.8)] hover:bg-[var(--bg-secondary)] h-9 px-4 bg-transparent font-medium transition-colors border border-transparent flex items-center justify-center cursor-pointer">
                Đóng
              </DialogClose>

              <Button 
                type="submit" 
                size="sm"
                disabled={isCreating}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-[calc(var(--radius)*0.8)] shadow h-9 px-4 flex items-center gap-1.5 border-0"
              >
                {isCreating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                {isCreating ? "Đang tạo & đồng bộ..." : "Tạo Báo Cáo"}
              </Button>
            </DialogFooter>

          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
