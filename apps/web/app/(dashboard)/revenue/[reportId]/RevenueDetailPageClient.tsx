"use client";

import * as React from "react";
import { 
  ArrowLeft, 
  Download, 
  RefreshCw, 
  Save, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Calculator, 
  CheckCircle,
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Report {
  id: string;
  name: string;
  month: string;
  productId: string | null;
  rates: any;
}

interface DailyDataRow {
  id: string;
  reportId: string;
  date: string;
  adsCostMicros: string | null;
  orders: number | null;
  quantity: number | null;
  revenueMicros: string | null;
  shipCostMicros: string | null;
  goodsCostMicros: string | null;
  profitMicros: string | null;
  isLocked: boolean | null;
}

interface RevenueDetailPageClientProps {
  initialReport: Report;
  initialDailyData: DailyDataRow[];
}

export default function RevenueDetailPageClient({ 
  initialReport, 
  initialDailyData 
}: RevenueDetailPageClientProps) {
  
  React.useEffect(() => {
    if (initialReport?.name && typeof window !== 'undefined') {
      if (!(window as any).__dynamicRouteLabels) {
        (window as any).__dynamicRouteLabels = {};
      }
      (window as any).__dynamicRouteLabels[initialReport.id] = initialReport.name;
      window.dispatchEvent(new CustomEvent('dynamic-route-labels-updated'));
    }
  }, [initialReport]);

  // 1. Rates Configuration State
  const ratesConfig = initialReport.rates || {};
  const [importPrice, setImportPrice] = React.useState(String(ratesConfig.importPrice ?? 0));
  const [shippingFee, setShippingFee] = React.useState(String(ratesConfig.shippingFee ?? 0));
  const [returnRate, setReturnRate] = React.useState(String((ratesConfig.returnRate ?? 0) * 100));
  const [incomeTax, setIncomeTax] = React.useState(String((ratesConfig.incomeTax ?? 0) * 100));
  const [adsTax, setAdsTax] = React.useState(String((ratesConfig.adsTax ?? 0) * 100));
  const [paymentFee, setPaymentFee] = React.useState(String((ratesConfig.paymentFee ?? 0) * 100));

  // Calculation flash animation triggers whenever configuration rates change
  const [isFlashing, setIsFlashing] = React.useState(false);
  React.useEffect(() => {
    setIsFlashing(true);
    const timer = setTimeout(() => setIsFlashing(false), 1000);
    return () => clearTimeout(timer);
  }, [importPrice, shippingFee, returnRate, incomeTax, adsTax, paymentFee]);

  // 2. Spreadsheet Grid Rows State
  const convertRowToStandard = React.useCallback((row: DailyDataRow) => {
    return {
      id: row.id,
      date: row.date,
      orders: row.orders || 0,
      quantity: row.quantity || 0,
      revenue: Number(row.revenueMicros || 0) / 1000000,
      adsCost: Number(row.adsCostMicros || 0) / 1000000,
      // Derived fields will be re-calculated instantly in useEffect/recalc loop
      shipCost: Number(row.shipCostMicros || 0) / 1000000,
      goodsCost: Number(row.goodsCostMicros || 0) / 1000000,
      returnCost: 0,
      totalCost: 0,
      profit: Number(row.profitMicros || 0) / 1000000,
      isLocked: row.isLocked || false,
      roas: 0,
      adsPercent: 0,
    };
  }, []);

  const [rows, setRows] = React.useState(() => {
    // Sort ascending by date for a natural spreadsheet view
    const sorted = [...initialDailyData].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map(convertRowToStandard);
  });

  // Keep track of syncing status per row index or bulk sync
  const [syncingRowIndex, setSyncingRowIndex] = React.useState<number | null>(null);
  const [isBulkSyncing, setIsBulkSyncing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ message: string; type: "success" | "error" } | null>(null);

  // Recalculates derived metrics for a row based on current rate values
  const computePnLMetrics = React.useCallback((
    orders: number,
    quantity: number,
    revenue: number,
    adsCost: number,
    existingGoodsCost?: number
  ) => {
    const impP = Number(importPrice || 0);
    const shipF = Number(shippingFee || 0);
    const retR = Number(returnRate || 0) / 100;
    const incT = Number(incomeTax || 0) / 100;
    const adsT = Number(adsTax || 0) / 100;
    const payF = Number(paymentFee || 0) / 100;

    // If mapped to Pancake POS CRM (where baseline goodsCost was successfully fetched and quantity is 0), preserve CRM value.
    // Otherwise fallback to quantity * importPrice formula for manual or unmapped rows.
    const goodsCost = (existingGoodsCost !== undefined && existingGoodsCost > 0 && quantity === 0)
      ? existingGoodsCost
      : quantity * impP;

    const shipCost = orders * shipF;

    // Return Cost formula with negative safeguard
    let returnCost = ((revenue - goodsCost) * retR) + (orders * retR * (shipF / 2));
    if (returnCost < 0) returnCost = 0;

    const totalCost = goodsCost + shipCost + returnCost + adsCost + 
                      (adsCost * adsT) + 
                      (adsCost * payF) + 
                      (revenue * incT);

    const profit = revenue - totalCost;

    const roas = adsCost > 0 ? revenue / adsCost : 0;
    const adsPercent = revenue > 0 ? (adsCost / revenue) * 100 : 0;
    
    return {
      goodsCost,
      shipCost,
      returnCost,
      totalCost,
      profit,
      roas,
      adsPercent
    };
  }, [importPrice, shippingFee, returnRate, incomeTax, adsTax, paymentFee]);

  // 3. React effect to recalculate entire grid whenever inputs change
  const [recalcRows, setRecalcRows] = React.useState(rows);

  React.useEffect(() => {
    const updated = rows.map(r => {
      const pnl = computePnLMetrics(r.orders, r.quantity, r.revenue, r.adsCost, r.goodsCost);
      return {
        ...r,
        ...pnl
      };
    });
    setRecalcRows(updated);
  }, [rows, computePnLMetrics]);

  // 4. Grand Totals Calculation
  const totals = React.useMemo(() => {
    let orders = 0;
    let quantity = 0;
    let revenue = 0;
    let adsCost = 0;
    let shipCost = 0;
    let goodsCost = 0;
    let returnCost = 0;
    let totalCost = 0;
    let profit = 0;

    for (const r of recalcRows) {
      orders += r.orders;
      quantity += r.quantity;
      revenue += r.revenue;
      adsCost += r.adsCost;
      shipCost += r.shipCost;
      goodsCost += r.goodsCost;
      returnCost += r.returnCost;
      totalCost += r.totalCost;
      profit += r.profit;
    }

    const roas = adsCost > 0 ? revenue / adsCost : 0;
    const adsPercent = revenue > 0 ? (adsCost / revenue) * 100 : 0;

    return {
      orders,
      quantity,
      revenue,
      adsCost,
      shipCost,
      goodsCost,
      returnCost,
      totalCost,
      profit,
      roas,
      adsPercent
    };
  }, [recalcRows]);

  // 5. Detect Unsaved Changes
  const hasChanges = React.useMemo(() => {
    // Check if rates differ
    const initialRates = initialReport.rates || {};
    if (
      Number(importPrice) !== (initialRates.importPrice ?? 0) ||
      Number(shippingFee) !== (initialRates.shippingFee ?? 0) ||
      Number(returnRate) !== ((initialRates.returnRate ?? 0) * 100) ||
      Number(incomeTax) !== ((initialRates.incomeTax ?? 0) * 100) ||
      Number(adsTax) !== ((initialRates.adsTax ?? 0) * 100) ||
      Number(paymentFee) !== ((initialRates.paymentFee ?? 0) * 100)
    ) {
      return true;
    }

    // Check if any daily cells differ
    const sortedInit = [...initialDailyData].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 0; i < rows.length; i++) {
      const current = rows[i];
      const initial = sortedInit[i];
      if (!initial) return true;

      const initRev = Number(initial.revenueMicros || 0) / 1000000;
      const initAds = Number(initial.adsCostMicros || 0) / 1000000;

      if (
        current.orders !== (initial.orders || 0) ||
        current.quantity !== (initial.quantity || 0) ||
        Math.abs(current.revenue - initRev) > 0.01 ||
        Math.abs(current.adsCost - initAds) > 0.01
      ) {
        return true;
      }
    }

    return false;
  }, [rows, importPrice, shippingFee, returnRate, incomeTax, adsTax, paymentFee, initialReport, initialDailyData]);

  // Handle cell edit
  const handleCellChange = (index: number, field: "orders" | "quantity" | "revenue" | "adsCost", val: string) => {
    const parsed = Number(val.replace(/,/g, "")) || 0;
    setRows(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: parsed
      };
      return copy;
    });
  };

  // Revert changes
  const handleRevert = () => {
    const sorted = [...initialDailyData].sort((a, b) => a.date.localeCompare(b.date));
    setRows(sorted.map(convertRowToStandard));
    const initialRates = initialReport.rates || {};
    setImportPrice(String(initialRates.importPrice ?? 0));
    setShippingFee(String(initialRates.shippingFee ?? 0));
    setReturnRate(String((initialRates.returnRate ?? 0) * 100));
    setIncomeTax(String((initialRates.incomeTax ?? 0) * 100));
    setAdsTax(String((initialRates.adsTax ?? 0) * 100));
    setPaymentFee(String((initialRates.paymentFee ?? 0) * 100));
    showFeedback("Đã khôi phục dữ liệu ban đầu.", "success");
  };

  // Save changes via API
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const payloadRates = {
        importPrice: Number(importPrice),
        shippingFee: Number(shippingFee),
        returnRate: Number(returnRate) / 100,
        incomeTax: Number(incomeTax) / 100,
        adsTax: Number(adsTax) / 100,
        paymentFee: Number(paymentFee) / 100,
      };

      const payloadDaily = recalcRows.map(r => ({
        date: r.date,
        orders: r.orders,
        quantity: r.quantity,
        revenueMicros: Math.round(r.revenue * 1000000).toString(),
        adsCostMicros: Math.round(r.adsCost * 1000000).toString(),
        shipCostMicros: Math.round(r.shipCost * 1000000).toString(),
        goodsCostMicros: Math.round(r.goodsCost * 1000000).toString(),
        profitMicros: Math.round(r.profit * 1000000).toString(),
      }));

      const response = await fetch(`/api/revenue/${initialReport.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rates: payloadRates,
          dailyData: payloadDaily
        })
      });

      if (!response.ok) {
        throw new Error(await response.text() || "Lỗi khi lưu báo cáo.");
      }

      showFeedback("Đã lưu tất cả các thay đổi thành công!", "success");
      
      // Update baseline window state without page refresh to preserve UX state
      setTimeout(() => {
        window.location.reload();
      }, 800);

    } catch (error: any) {
      console.error(error);
      showFeedback(error.message || "Lỗi hệ thống khi lưu.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Single Day Sync Trigger
  const handleSingleSync = async (index: number, dateStr: string) => {
    setSyncingRowIndex(index);
    try {
      const response = await fetch(`/api/revenue/${initialReport.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "single", date: dateStr })
      });

      if (!response.ok) {
        throw new Error(await response.text() || "Lỗi đồng bộ ngày");
      }

      showFeedback(`Đã đồng bộ ngày ${new Date(dateStr).toLocaleDateString('vi-VN')} thành công!`, "success");
      
      // Reload page to fetch updated CRM values from DB
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (err: any) {
      console.error(err);
      showFeedback(err.message || "Lỗi đồng bộ ngày.", "error");
    } finally {
      setSyncingRowIndex(null);
    }
  };

  // Bulk Month Sync Trigger
  const handleBulkSync = async () => {
    setIsBulkSyncing(true);
    try {
      const response = await fetch(`/api/revenue/${initialReport.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "bulk" })
      });

      if (!response.ok) {
        throw new Error(await response.text() || "Lỗi đồng bộ hàng loạt");
      }

      const result = await response.json();
      showFeedback(`Đồng bộ thành công ${result.syncedDays} ngày cho tháng này!`, "success");
      
      setTimeout(() => {
        window.location.reload();
      }, 1200);

    } catch (err: any) {
      console.error(err);
      showFeedback(err.message || "Lỗi đồng bộ hàng loạt tháng.", "error");
    } finally {
      setIsBulkSyncing(false);
    }
  };

  // Export Excel / CSV
  const handleExportCSV = () => {
    try {
      const headers = ["Ngày", "Đơn hàng", "Số lượng", "Doanh thu (đ)", "Chi phí Ads (đ)", "Chi phí Ship (đ)", "Giá vốn COGS (đ)", "Phí hoàn (đ)", "Lợi nhuận ròng (đ)", "ROAS", "Ads %"];
      const rowsCSV = recalcRows.map(r => [
        new Date(r.date).toLocaleDateString('vi-VN'),
        r.orders,
        r.quantity,
        Math.round(r.revenue),
        Math.round(r.adsCost),
        Math.round(r.shipCost),
        Math.round(r.goodsCost),
        Math.round(r.returnCost),
        Math.round(r.profit),
        r.roas.toFixed(2),
        r.adsPercent.toFixed(1) + "%"
      ]);

      let csvContent = "\uFEFF"; // UTF-8 BOM
      csvContent += headers.join(",") + "\n";
      rowsCSV.forEach(row => {
        csvContent += row.join(",") + "\n";
      });

      // Grand Total Row
      csvContent += `Tổng kết,${totals.orders},${totals.quantity},${Math.round(totals.revenue)},${Math.round(totals.adsCost)},${Math.round(totals.shipCost)},${Math.round(totals.goodsCost)},${Math.round(totals.returnCost)},${Math.round(totals.profit)},${totals.roas.toFixed(2)},${totals.adsPercent.toFixed(1)}%\n`;

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Báo_cáo_PnL_${initialReport.name.replace(/\s+/g, "_")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      showFeedback("Lỗi khi xuất tệp dữ liệu.", "error");
    }
  };

  const showFeedback = (msg: string, type: "success" | "error") => {
    setFeedback({ message: msg, type });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  return (
    <div className="p-0 max-w-none w-full space-y-5 pb-24 relative">
      
      {/* Toast Alert Notification */}
      {feedback && (
        <div className={cn(
          "fixed top-6 right-6 z-50 flex items-center gap-3 px-4.5 py-3.5 border text-sm font-semibold transition-all duration-300 shadow-xl",
          "rounded-[var(--radius)]",
          feedback.type === "success" 
            ? "bg-emerald-50 dark:bg-emerald-950/80 backdrop-blur-md border-emerald-250 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400" 
            : "bg-rose-50 dark:bg-rose-950/80 backdrop-blur-md border-rose-250 dark:border-rose-900/40 text-rose-800 dark:text-rose-400"
        )}>
          {feedback.type === "success" ? <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-500" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header controls bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Link href="/revenue" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "hover:bg-[var(--bg-secondary)] rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-3)] hover:text-[var(--text-1)] w-8.5 h-8.5 shrink-0")}>
            <ArrowLeft className="w-4.5 h-4.5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-1)]">{initialReport.name}</h1>
            <p className="text-[11.5px] text-[var(--text-3)] mt-1">
              Cấu hình tỷ lệ lợi nhuận & lưới bảng tính toán P&L ròng hàng ngày.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBulkSync}
            disabled={isBulkSyncing}
            className="flex items-center gap-1.5 border-[var(--border)] hover:bg-[var(--bg-secondary)] text-[var(--text-2)] hover:text-[var(--text-1)] bg-[var(--bg-card)] rounded-[calc(var(--radius)*0.8)] text-xs font-semibold h-8.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500", isBulkSyncing && "animate-spin")} />
            {isBulkSyncing ? "Đang đồng bộ..." : "Đồng bộ Toàn bộ Tháng"}
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 border-[var(--border)] hover:bg-[var(--bg-secondary)] text-[var(--text-2)] hover:text-[var(--text-1)] bg-[var(--bg-card)] rounded-[calc(var(--radius)*0.8)] text-xs font-semibold h-8.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-500" />
            Xuất Báo Cáo
          </Button>
        </div>
      </div>

      {/* Top Rates configuration block */}
      <Card className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] shadow-sm">
        <CardHeader className="bg-[var(--bg-secondary)] border-b border-[var(--border)] py-3.5 px-5 flex flex-row items-center gap-2">
          <Calculator className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-500" />
          <CardTitle className="text-[13px] font-bold text-[var(--text-1)]">Cấu hình Tỷ lệ & Chi phí chung</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-3)]">Giá nhập (đ)</label>
              <Input 
                type="text" 
                value={Number(importPrice).toLocaleString("vi-VN")}
                onChange={(e) => setImportPrice(e.target.value.replace(/\D/g, ""))}
                className="h-9 focus:ring-emerald-500/20 focus:border-emerald-500/80 bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-1)] rounded-[calc(var(--radius)*0.8)] text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-3)]">Phí ship chung (đ)</label>
              <Input 
                type="text" 
                value={Number(shippingFee).toLocaleString("vi-VN")}
                onChange={(e) => setShippingFee(e.target.value.replace(/\D/g, ""))}
                className="h-9 focus:ring-emerald-500/20 focus:border-emerald-500/80 bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-1)] rounded-[calc(var(--radius)*0.8)] text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-3)]">Tỷ lệ hoàn (%)</label>
              <Input 
                type="number" 
                step="0.1"
                value={returnRate}
                onChange={(e) => setReturnRate(e.target.value)}
                className="h-9 focus:ring-emerald-500/20 focus:border-emerald-500/80 bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-1)] rounded-[calc(var(--radius)*0.8)] text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-3)]">Thuế TNCN (%)</label>
              <Input 
                type="number" 
                step="0.1"
                value={incomeTax}
                onChange={(e) => setIncomeTax(e.target.value)}
                className="h-9 focus:ring-emerald-500/20 focus:border-emerald-500/80 bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-1)] rounded-[calc(var(--radius)*0.8)] text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-3)]">Thuế Ads (%)</label>
              <Input 
                type="number" 
                step="0.1"
                value={adsTax}
                onChange={(e) => setAdsTax(e.target.value)}
                className="h-9 focus:ring-emerald-500/20 focus:border-emerald-500/80 bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-1)] rounded-[calc(var(--radius)*0.8)] text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-3)]">Phí cổng thanh toán (%)</label>
              <Input 
                type="number" 
                step="0.1"
                value={paymentFee}
                onChange={(e) => setPaymentFee(e.target.value)}
                className="h-9 focus:ring-emerald-500/20 focus:border-emerald-500/80 bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-1)] rounded-[calc(var(--radius)*0.8)] text-xs font-semibold"
              />
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Spreadsheet Grid */}
      <Card className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] overflow-hidden shadow-sm">
        <CardHeader className="bg-[var(--bg-secondary)] border-b border-[var(--border)] py-3.5 px-5 flex flex-row items-center justify-between">
          <CardTitle className="text-[13px] font-bold text-[var(--text-1)]">
            Lưới Tính toán Lợi nhuận Chi tiết
          </CardTitle>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500 animate-pulse"></span>
            Real-time Spreadsheet
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto relative">
            <Table className="min-w-[1250px] border-collapse text-xs">
              <TableHeader className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                <TableRow className="hover:bg-transparent">
                  {/* Sticky header for Date */}
                  <TableHead className="font-bold text-[var(--text-3)] w-24 sticky left-0 bg-[var(--bg-secondary)] z-20 shadow-[inset_-1px_0_0_var(--border)] text-center">Ngày</TableHead>
                  <TableHead className="font-bold text-[var(--text-3)] w-24 text-center">Đơn hàng</TableHead>
                  <TableHead className="font-bold text-[var(--text-3)] w-24 text-center">Số lượng</TableHead>
                  <TableHead className="font-bold text-[var(--text-3)] w-32 text-right">Doanh thu</TableHead>
                  <TableHead className="font-bold text-[var(--text-3)] w-32 text-right">Chi phí Ads</TableHead>
                  <TableHead className="font-bold text-[var(--text-3)] w-28 text-right">Phí Ship</TableHead>
                  <TableHead className="font-bold text-[var(--text-3)] w-28 text-right">Giá vốn (COGS)</TableHead>
                  <TableHead className="font-bold text-[var(--text-3)] w-28 text-right">Phí Hoàn</TableHead>
                  <TableHead className="font-bold text-emerald-700 dark:text-emerald-400 w-32 text-right bg-emerald-50/50 dark:bg-emerald-950/15">Lợi Nhuận</TableHead>
                  <TableHead className="font-bold text-[var(--text-3)] w-20 text-center">ROAS</TableHead>
                  <TableHead className="font-bold text-[var(--text-3)] w-20 text-center">Ads %</TableHead>
                  <TableHead className="font-bold text-[var(--text-3)] w-16 text-center">Đồng bộ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[var(--border)]">
                {recalcRows.map((row, index) => (
                  <TableRow key={row.date} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                    
                    {/* Sticky Column - Date */}
                    <TableCell className="font-bold text-[var(--text-2)] sticky left-0 bg-[var(--bg-card)]/95 backdrop-blur-sm z-10 shadow-[inset_-1px_0_0_var(--border)] text-center">
                       {new Date(row.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                    </TableCell>
                    
                    {/* Orders Column */}
                    <TableCell className="p-1">
                      <Input 
                        type="text" 
                        value={row.orders === 0 ? "" : row.orders}
                        onChange={(e) => handleCellChange(index, "orders", e.target.value)}
                        placeholder="0"
                        className="h-8 text-center bg-transparent border-0 hover:bg-[var(--bg-secondary)] focus:bg-[var(--bg-card)] focus:ring-1 focus:ring-emerald-500/40 text-xs font-semibold text-[var(--text-1)] shadow-none w-full"
                      />
                    </TableCell>

                    {/* Quantity Column */}
                    <TableCell className="p-1">
                      <Input 
                        type="text" 
                        value={row.quantity === 0 ? "" : row.quantity}
                        onChange={(e) => handleCellChange(index, "quantity", e.target.value)}
                        placeholder="0"
                        className="h-8 text-center bg-transparent border-0 hover:bg-[var(--bg-secondary)] focus:bg-[var(--bg-card)] focus:ring-1 focus:ring-emerald-500/40 text-xs font-semibold text-[var(--text-1)] shadow-none w-full"
                      />
                    </TableCell>

                    {/* Revenue Column */}
                    <TableCell className="p-1 text-right">
                      <Input 
                        type="text" 
                        value={row.revenue === 0 ? "" : Math.round(row.revenue).toLocaleString("vi-VN")}
                        onChange={(e) => handleCellChange(index, "revenue", e.target.value)}
                        placeholder="0"
                        className="h-8 text-right bg-transparent border-0 hover:bg-[var(--bg-secondary)] focus:bg-[var(--bg-card)] focus:ring-1 focus:ring-emerald-500/40 text-xs font-semibold text-[var(--text-1)] shadow-none w-full pr-2 font-mono"
                      />
                    </TableCell>

                    {/* Ads Cost Column */}
                    <TableCell className="p-1 text-right">
                      <Input 
                        type="text" 
                        value={row.adsCost === 0 ? "" : Math.round(row.adsCost).toLocaleString("vi-VN")}
                        onChange={(e) => handleCellChange(index, "adsCost", e.target.value)}
                        placeholder="0"
                        className="h-8 text-right bg-transparent border-0 hover:bg-[var(--bg-secondary)] focus:bg-[var(--bg-card)] focus:ring-1 focus:ring-emerald-500/40 text-xs font-semibold text-[var(--text-1)] shadow-none w-full pr-2 font-mono"
                      />
                    </TableCell>

                    {/* Ship Cost Column (Calculated & Flashing) */}
                    <TableCell className={cn(
                      "text-right text-[var(--text-2)] font-medium pr-4 font-mono transition-all duration-300",
                      isFlashing && "animate-calculation-flash"
                    )}>
                      {row.shipCost > 0 ? Math.round(row.shipCost).toLocaleString("vi-VN") : "0"}
                    </TableCell>

                    {/* Goods Cost Column (Calculated & Flashing) */}
                    <TableCell className={cn(
                      "text-right text-[var(--text-2)] font-medium pr-4 font-mono transition-all duration-300",
                      isFlashing && "animate-calculation-flash"
                    )}>
                      {row.goodsCost > 0 ? Math.round(row.goodsCost).toLocaleString("vi-VN") : "0"}
                    </TableCell>

                    {/* Return Cost Column (Calculated & Flashing) */}
                    <TableCell className={cn(
                      "text-right text-[var(--text-2)] font-medium pr-4 font-mono transition-all duration-300",
                      isFlashing && "animate-calculation-flash"
                    )}>
                      {row.returnCost > 0 ? Math.round(row.returnCost).toLocaleString("vi-VN") : "0"}
                    </TableCell>

                    {/* Profit Column (Calculated & Flashing) */}
                    <TableCell className={cn(
                      "text-right font-bold pr-4 text-[12.5px] bg-emerald-500/5 font-mono transition-all duration-300",
                      row.profit > 0 ? "text-emerald-600 dark:text-emerald-400" : row.profit < 0 ? "text-rose-600 dark:text-rose-400" : "text-[var(--text-2)]",
                      isFlashing && "animate-calculation-flash"
                    )}>
                      {row.profit !== 0 ? Math.round(row.profit).toLocaleString("vi-VN") + " đ" : "0 đ"}
                    </TableCell>

                    {/* ROAS Column (Calculated & Flashing) */}
                    <TableCell className={cn(
                      "text-center font-bold font-mono transition-all duration-300",
                      row.roas >= 3 ? "text-emerald-600 dark:text-emerald-400" : row.roas > 0 ? "text-[var(--text-2)]" : "text-slate-400 dark:text-slate-500",
                      isFlashing && "animate-calculation-flash"
                    )}>
                      {row.roas > 0 ? row.roas.toFixed(2) : "--"}
                    </TableCell>

                    {/* Ads % Column (Calculated & Flashing) */}
                    <TableCell className={cn(
                      "text-center font-semibold text-[var(--text-2)] font-mono transition-all duration-300",
                      isFlashing && "animate-calculation-flash"
                    )}>
                      {row.adsPercent > 0 ? row.adsPercent.toFixed(1) + "%" : "--"}
                    </TableCell>

                    {/* Sync Single Day Button */}
                    <TableCell className="text-center p-0">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleSingleSync(index, row.date)}
                        disabled={syncingRowIndex !== null || isBulkSyncing}
                        className="h-7 w-7 rounded-full text-[var(--text-3)] hover:text-emerald-650 hover:dark:text-emerald-400 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", syncingRowIndex === index && "animate-spin text-emerald-650 dark:text-emerald-400")} />
                      </Button>
                    </TableCell>

                  </TableRow>
                ))}

                {/* Grand Totals Summary Row */}
                <TableRow className="bg-[var(--bg-secondary)] border-t border-[var(--border)] hover:bg-[var(--bg-secondary)]/80 text-[var(--text-1)]">
                  <TableCell className="font-extrabold sticky left-0 bg-[var(--bg-secondary)] z-10 shadow-[inset_-1px_0_0_var(--border)] text-center">Tổng kết</TableCell>
                  <TableCell className="text-center font-extrabold">{totals.orders}</TableCell>
                  <TableCell className="text-center font-extrabold">{totals.quantity}</TableCell>
                  <TableCell className="text-right font-extrabold pr-3 font-mono">{Math.round(totals.revenue).toLocaleString("vi-VN")} đ</TableCell>
                  <TableCell className="text-right text-rose-600 dark:text-rose-400 font-extrabold pr-3 font-mono">{Math.round(totals.adsCost).toLocaleString("vi-VN")} đ</TableCell>
                  <TableCell className="text-right font-bold pr-4 font-mono">{Math.round(totals.shipCost).toLocaleString("vi-VN")}</TableCell>
                  <TableCell className="text-right font-bold pr-4 font-mono">{Math.round(totals.goodsCost).toLocaleString("vi-VN")}</TableCell>
                  <TableCell className="text-right font-bold pr-4 font-mono">{Math.round(totals.returnCost).toLocaleString("vi-VN")}</TableCell>
                  <TableCell className={cn(
                    "text-right font-extrabold pr-4 text-xs bg-emerald-50 dark:bg-emerald-950/15 font-mono",
                    totals.profit > 0 ? "text-emerald-650 dark:text-emerald-400" : totals.profit < 0 ? "text-rose-600 dark:text-rose-400" : "text-[var(--text-1)]"
                  )}>
                    {Math.round(totals.profit).toLocaleString("vi-VN")} đ
                  </TableCell>
                  <TableCell className="text-center font-extrabold font-mono">{totals.roas > 0 ? totals.roas.toFixed(2) : "--"}</TableCell>
                  <TableCell className="text-center font-extrabold font-mono">{totals.adsPercent > 0 ? totals.adsPercent.toFixed(1) + "%" : "--"}</TableCell>
                  <TableCell className="bg-transparent"></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Floating sliding Action Bar for Unsaved Changes */}
      <div className={cn(
        "fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-[var(--bg-card)]/95 backdrop-blur-md border border-[var(--border)] text-[var(--text-1)] rounded-full shadow-lg px-6 py-3 flex items-center justify-between gap-6 transition-all duration-300 ease-in-out",
        hasChanges 
          ? "translate-y-0 opacity-100 scale-100" 
          : "translate-y-20 opacity-0 scale-95 pointer-events-none"
      )}>
        <div className="flex items-center gap-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600 dark:bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
          </span>
          <p className="text-xs font-semibold text-[var(--text-2)]">Có thay đổi chưa lưu trên lưới báo cáo.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRevert}
            className="text-xs text-[var(--text-3)] hover:text-[var(--text-1)] rounded-full hover:bg-[var(--bg-secondary)] h-8 px-3 cursor-pointer"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Hủy bỏ
          </Button>

          <Button 
            size="sm" 
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold h-8 px-4 flex items-center gap-1.5 border-0 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </div>
  );
}
