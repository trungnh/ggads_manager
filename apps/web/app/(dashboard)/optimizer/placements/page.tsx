"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  ShieldAlert, 
  Trash2, 
  CheckSquare, 
  RefreshCw, 
  Sparkles, 
  Bot, 
  ChevronDown, 
  CheckCircle2, 
  AlertTriangle,
  X
} from "lucide-react";

interface PendingPlacement {
  id: string;
  placementUrl: string;
  placementName?: string;
  placementType: string;
  costWasted: string;
  clicks: number;
  conversions: number;
  aiCategory?: string;
}

interface AdsAccount {
  id: string;
  name: string;
  customerId: string;
}

const industryTemplates = [
  {
    label: "🌾 Nông nghiệp",
    text: "Thuốc trừ sâu sinh học, phân bón hữu cơ. Khách hàng mục tiêu là nông dân, chủ vườn cây ăn trái, người làm nông nghiệp trồng trọt và chăn nuôi."
  },
  {
    label: "💄 Mỹ phẩm",
    text: "Kem chống nắng kiềm dầu, dưỡng da chống lão hóa. Khách hàng mục tiêu là nữ giới văn phòng từ 22-35 tuổi, quan tâm đến làm đẹp và chăm sóc da cá nhân."
  },
  {
    label: "🍳 Đồ gia dụng",
    text: "Nồi chiên không dầu, dụng cụ nhà bếp thông minh. Khách hàng mục tiêu là các mẹ nội trợ, những người thích nấu ăn và trang hoàng nhà cửa."
  },
  {
    label: "📱 Công nghệ",
    text: "Phụ kiện điện thoại, củ sạc nhanh và cáp sạc thông minh. Khách hàng mục tiêu là giới trẻ năng động, đam mê công nghệ và tiện ích số."
  }
];

export default function PlacementExcluderPage() {
  const [accounts, setAccounts] = useState<AdsAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [placements, setPlacements] = useState<PendingPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [scanError, setScanError] = useState("");

  // Date range filters state
  const [datePreset, setDatePreset] = useState<string>("LAST_30_DAYS");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Product context state
  const [productContext, setProductContext] = useState<string>("");

  // AI Connection selection state
  const [aiConnections, setAiConnections] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash");

  // Heuristics states
  const [cpaThreshold, setCpaThreshold] = useState<number>(250000);
  const [scanFrequency, setScanFrequency] = useState<number>(15);

  // Scheduler state
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(false);
  const [scheduleTime, setScheduleTime] = useState<string>("08:00");
  const [scheduleRange, setScheduleRange] = useState<string>("YESTERDAY");
  const [isSavingSchedule, setIsSavingSchedule] = useState<boolean>(false);

  // Update productContext state
  const handleProductContextChange = (value: string) => {
    setProductContext(value);
  };

  // Fetch placements schedule configuration and product context when account changes
  useEffect(() => {
    const fetchSchedule = async () => {
      if (!selectedAccountId) return;
      setProductContext(""); // Clear temporary state to prevent cross-account UI pollution
      try {
        const res = await fetch(`/api/optimizer/placements/schedule?accountId=${selectedAccountId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setScheduleEnabled(data.data.enabled);
            setScheduleTime(data.data.time);
            setScheduleRange(data.data.range);
            setProductContext(data.data.productContext || "");
            setCpaThreshold(data.data.cpaThreshold ?? 250000);
            setScanFrequency(data.data.scanFrequency ?? 15);
          }
        }
      } catch (e) {
        console.error("Failed to fetch schedule:", e);
      }
    };
    fetchSchedule();
  }, [selectedAccountId]);

  // Save schedule configuration
  const handleSaveSchedule = async () => {
    if (!selectedAccountId) return;
    setIsSavingSchedule(true);
    setScanMessage("");
    setScanError("");
    try {
      const res = await fetch("/api/optimizer/placements/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          enabled: scheduleEnabled,
          time: scheduleTime,
          range: scheduleRange,
          productContext,
          cpaThreshold,
          scanFrequency
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setScanMessage(data.message);
      } else {
        setScanError(data.error || "Gặp lỗi khi lưu cấu hình tự động quét.");
      }
    } catch (e) {
      setScanError("Lỗi kết nối tới máy chủ.");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Set default custom date range (last 14 days back from yesterday)
  useEffect(() => {
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const start = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    setCustomStartDate(formatDate(start));
    setCustomEndDate(formatDate(yesterday));
  }, []);

  // 1. Fetch connected ads accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch("/api/accounts");
        if (res.ok) {
          const data = await res.json();
          const list = data.accounts || [];
          setAccounts(list);
          if (list.length > 0) {
            setSelectedAccountId(list[0].id);
          }
        }
      } catch (e) {
        console.error("Failed to fetch accounts:", e);
      }
    };
    fetchAccounts();
  }, []);

  // 1.5. Fetch connected active AI credentials
  useEffect(() => {
    const fetchAiConnections = async () => {
      try {
        const res = await fetch("/api/settings/ai-connections");
        if (res.ok) {
          const data = await res.json();
          const list = data.data || [];
          const activeConns = list.filter((c: any) => c.hasKey);
          setAiConnections(activeConns);
          if (activeConns.length > 0) {
            const first = activeConns[0].provider;
            if (first === "gemini") {
              setSelectedModel("gemini-2.5-flash");
            } else if (first === "gemini-pro") {
              setSelectedModel("gemini-2.5-pro");
            } else if (first === "openai") {
              setSelectedModel("gpt-4o-mini");
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch AI connections:", e);
      }
    };
    fetchAiConnections();
  }, []);

  // 2. Fetch pending placement exclusions
  const fetchPlacements = useCallback(async () => {
    if (!selectedAccountId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/optimizer/placements/pending?accountId=${selectedAccountId}`);
      if (res.ok) {
        const data = await res.json();
        setPlacements(data.data || []);
        setSelectedIds(new Set()); // Reset selections on account change
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    fetchPlacements();
  }, [selectedAccountId, fetchPlacements]);

  // 3. Trigger manual scan with AI Connection
  const handleScanPlacements = async () => {
    if (!selectedAccountId) return;
    setIsScanning(true);
    setScanMessage("");
    setScanError("");

    // Resolve provider name based on selectedModel value
    let provider = "gemini";
    if (selectedModel === "gemini-2.5-pro") {
      provider = "gemini-pro";
    } else if (selectedModel === "gpt-4o-mini") {
      provider = "openai";
    }

    try {
      const res = await fetch("/api/optimizer/placements/scan-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          accountId: selectedAccountId,
          datePreset,
          customStartDate: datePreset === "CUSTOM" ? customStartDate : undefined,
          customEndDate: datePreset === "CUSTOM" ? customEndDate : undefined,
          productContext,
          aiProvider: provider,
          aiModel: selectedModel
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setScanMessage(data.message);
        fetchPlacements();
      } else {
        setScanError(data.error || "Gặp lỗi trong quá trình quét kênh rác bằng AI.");
      }
    } catch (e) {
      setScanError("Lỗi kết nối tới máy chủ.");
    } finally {
      setIsScanning(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === placements.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(placements.map(p => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleExclude = async () => {
    if (selectedIds.size === 0 || !selectedAccountId) return;
    setIsProcessing(true);
    setScanMessage("");
    setScanError("");
    try {
      const res = await fetch("/api/optimizer/placements/exclude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          logIds: Array.from(selectedIds)
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setScanMessage(data.message);
        fetchPlacements();
      } else {
        setScanError(data.error || "Gặp lỗi khi loại trừ các kênh rác.");
      }
    } catch (e) {
      setScanError("Lỗi kết nối tới máy chủ.");
    } finally {
      setIsProcessing(false);
    }
  };

  const totalWasted = placements.reduce((sum, p) => sum + parseFloat(p.costWasted || "0"), 0);

  return (
    <div className="p-6 md:p-8 bg-[var(--bg-card)] min-h-[calc(100vh-4rem)] text-[var(--text-1)] font-sans rounded-[var(--radius)] border border-[var(--border)] m-4 space-y-6 shadow-sm">
      
      {/* Toast Warnings & Success */}
      {(scanError || scanMessage) && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
          {scanError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-455 rounded-[var(--radius-md)] text-sm flex items-start gap-2.5 shadow-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1">
                <span className="font-semibold">Cảnh báo:</span> {scanError}
              </div>
              <button onClick={() => setScanError("")} className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {scanMessage && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-[var(--radius-md)] text-sm flex items-start gap-2.5 shadow-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-500" />
              <div className="flex-1">
                <span className="font-semibold">Thành công:</span> {scanMessage}
              </div>
              <button onClick={() => setScanMessage("")} className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-1)] flex items-center gap-2">
            <ShieldAlert className="text-rose-500 w-6 h-6" />
            Rada Diệt Kênh Rác
          </h1>
          <p className="text-[var(--text-3)] text-sm mt-1">
            Phát hiện và chặn các vị trí lãng phí ngân sách ở cấp độ Tài khoản dựa trên Heuristics & AI.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Account Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-2 text-sm text-[var(--text-1)] focus:outline-none focus:border-emerald-500 appearance-none pr-10 cursor-pointer font-medium transition duration-200"
            >
              {accounts.length === 0 ? (
                <option value="">Không có tài khoản</option>
              ) : (
                accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.customerId})
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)] pointer-events-none" />
          </div>

          {/* Date Range Selector Dropdown */}
          <div className="relative">
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-2 text-sm text-[var(--text-1)] focus:outline-none focus:border-emerald-500 appearance-none pr-10 cursor-pointer font-medium transition duration-200"
            >
              <option value="LAST_30_DAYS">30 ngày gần nhất (Mặc định)</option>
              <option value="LAST_7_DAYS">7 ngày gần nhất</option>
              <option value="LAST_14_DAYS">14 ngày gần nhất</option>
              <option value="CUSTOM">Tùy chọn khoảng thời gian</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)] pointer-events-none" />
          </div>

          <Link 
            href="/connections?tab=ai"
            className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[var(--radius-md)] text-sm hover:bg-[var(--bg-card)] transition text-[var(--text-2)] hover:text-[var(--text-1)] flex items-center justify-center font-medium shadow-sm"
          >
            Cài đặt AI Key
          </Link>

          {/* AI Provider Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-2 text-sm text-[var(--text-1)] focus:outline-none focus:border-emerald-500 appearance-none pr-10 cursor-pointer font-medium transition duration-200"
            >
              {aiConnections.length === 0 ? (
                <>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Mặc định)</option>
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                </>
              ) : (
                aiConnections.flatMap(conn => {
                  if (conn.provider === 'gemini') {
                    return [
                      <option key="gemini-2.5-flash" value="gemini-2.5-flash">Gemini 2.5 Flash</option>,
                      <option key="gemini-3.5-flash" value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                    ];
                  }
                  if (conn.provider === 'gemini-pro') {
                    return [
                      <option key="gemini-2.5-pro" value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    ];
                  }
                  if (conn.provider === 'openai') {
                    return [
                      <option key="gpt-4o-mini" value="gpt-4o-mini">OpenAI GPT-4o-mini</option>
                    ];
                  }
                  return [];
                })
              )}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)] pointer-events-none" />
          </div>

          <button
            onClick={handleScanPlacements}
            disabled={isScanning || !selectedAccountId}
            className="px-5 py-2 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-[var(--radius-md)] text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50 shadow-sm cursor-pointer hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30"
          >
            {isScanning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isScanning ? "Đang quét AI..." : "Quét AI Ngay"}
          </button>

          <button 
            onClick={handleExclude}
            disabled={selectedIds.size === 0 || isProcessing}
            className="px-5 py-2 bg-rose-500/10 text-rose-600 dark:text-rose-455 border border-rose-500/20 rounded-[var(--radius-md)] text-sm font-semibold hover:bg-rose-500/20 transition flex items-center gap-2 disabled:opacity-50 shadow-sm cursor-pointer"
          >
            {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
            Duyệt Chặn ({selectedIds.size})
          </button>
        </div>
      </div>

      {/* Custom Date Picker Sub-bar */}
      {datePreset === "CUSTOM" && (
        <div className="flex flex-wrap items-center gap-4 p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[var(--radius)] animate-in slide-in-from-top-2 duration-200 shadow-sm">
          <div className="text-[var(--text-2)] text-sm font-medium">Khoảng thời gian tùy chọn:</div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-[var(--text-3)] text-xs font-semibold uppercase">Từ ngày</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-[var(--text-1)] focus:outline-none focus:border-emerald-500 transition duration-200 dark:[color-scheme:dark]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[var(--text-3)] text-xs font-semibold uppercase">Đến ngày</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-[var(--text-1)] focus:outline-none focus:border-emerald-500 transition duration-200 dark:[color-scheme:dark]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Autopilot & Product Context Control Center */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Column 1: AI Context */}
        <div className="p-5 bg-[var(--bg-secondary)]/50 border border-[var(--border)] rounded-[var(--radius)] space-y-3.5 flex flex-col justify-between shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-[var(--text-1)] flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-500" />
                Mô tả sản phẩm & Khách hàng mục tiêu
              </label>
              <span className="text-[var(--text-3)] text-xs font-mono">Đồng bộ tự động</span>
            </div>
            <p className="text-xs text-[var(--text-3)] leading-relaxed">
              Giúp Gemini nhận diện chính xác chủ đề ngách và hành vi khách hàng của anh để chủ động giữ lại các kênh chất lượng cao (nếu để trống, hệ thống sẽ mặc định tệp khách hàng mua sắm online đại trà).
            </p>
          </div>
          <textarea
            value={productContext}
            onChange={(e) => handleProductContextChange(e.target.value)}
            placeholder="Ví dụ: Thuốc trừ sâu sinh học, chuyên trị rệp sầu riêng, cây ăn quả. Khách hàng là nhà vườn, nông dân trồng trọt..."
            rows={3}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-3 text-sm text-[var(--text-1)] placeholder-[var(--text-3)]/60 focus:outline-none focus:border-emerald-500/50 resize-none font-medium leading-relaxed transition mt-2 animate-in fade-in duration-200"
          />
          <div className="mt-2.5 space-y-1.5">
            <span className="text-[var(--text-3)] text-[11px] font-bold uppercase tracking-wider block">Gợi ý ngành hàng nhanh:</span>
            <div className="flex flex-wrap gap-2">
              {industryTemplates.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => handleProductContextChange(tpl.text)}
                  className="px-2.5 py-1 text-xs bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] active:bg-[var(--bg-card)] border border-[var(--border)] hover:border-emerald-500/30 text-[var(--text-2)] hover:text-emerald-600 dark:hover:text-emerald-450 rounded-lg transition duration-150 font-semibold cursor-pointer"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: Autopilot Settings & Heuristics */}
        <div className="p-5 bg-[var(--bg-secondary)]/50 border border-[var(--border)] rounded-[var(--radius)] space-y-4 flex flex-col justify-between shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <label className="text-sm font-bold text-[var(--text-1)] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Cấu hình tối ưu & Tự động hóa
              </label>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${scheduleEnabled ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-[var(--bg-card)] text-[var(--text-3)] border border-[var(--border)]'}`}>
                  {scheduleEnabled ? "Autopilot On" : "Autopilot Off"}
                </span>
              </div>
            </div>

            {/* Heuristics Configuration */}
            <div className="grid grid-cols-2 gap-4 pt-1 border-b border-[var(--border)] pb-3.5">
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">Ngưỡng CPA Tối Đa (VND)</div>
                <input
                  type="number"
                  value={cpaThreshold}
                  onChange={(e) => setCpaThreshold(parseInt(e.target.value) || 0)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] px-3.5 py-2 text-sm text-[var(--text-1)] focus:outline-none focus:border-emerald-500 transition font-medium"
                  placeholder="250000"
                />
              </div>
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">Tần Suất Quét (Phút)</div>
                <input
                  type="number"
                  value={scanFrequency}
                  onChange={(e) => setScanFrequency(parseInt(e.target.value) || 0)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] px-3.5 py-2 text-sm text-[var(--text-1)] focus:outline-none focus:border-emerald-500 transition font-medium"
                  placeholder="15"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-1">
              <div>
                <div className="text-sm font-bold text-[var(--text-1)]">Tự Động Quét & Chặn Kênh Rác</div>
                <p className="text-xs text-[var(--text-3)]">Hệ thống sẽ chạy ngầm theo lịch, tự gửi lệnh chặn lên Google Ads API.</p>
              </div>
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                className="w-10 h-5 rounded-full bg-[var(--bg-card)] border border-[var(--border)] accent-emerald-500 cursor-pointer transition-all"
              />
            </div>

            {scheduleEnabled && (
              <div className="grid grid-cols-2 gap-4 pt-2 animate-in slide-in-from-top-2 duration-150">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">Thời gian quét (Hằng ngày)</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--text-1)] focus:outline-none focus:border-emerald-500 dark:[color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">Khoảng dữ liệu lọc</label>
                  <select
                    value={scheduleRange}
                    onChange={(e) => setScheduleRange(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--text-1)] focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="YESTERDAY">Ngày hôm qua (Mặc định)</option>
                    <option value="LAST_7_DAYS">7 ngày qua</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSaveSchedule}
            disabled={isSavingSchedule || !selectedAccountId}
            className="w-full py-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-[var(--radius-md)] text-sm font-bold transition flex items-center justify-center gap-2 mt-4 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isSavingSchedule ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Lưu Cấu Hình Autopilot
          </button>
        </div>

      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-[var(--bg-secondary)]/40 border border-[var(--border)] rounded-[var(--radius)] shadow-sm">
          <div className="text-[var(--text-3)] text-xs font-bold uppercase tracking-wider mb-2">Đang Lãng Phí (Chờ Duyệt)</div>
          <div className="text-3xl font-extrabold text-rose-500 dark:text-rose-455">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalWasted)}
          </div>
        </div>
        <div className="p-6 bg-[var(--bg-secondary)]/40 border border-[var(--border)] rounded-[var(--radius)] shadow-sm">
          <div className="text-[var(--text-3)] text-xs font-bold uppercase tracking-wider mb-2">Số kênh/web chờ duyệt</div>
          <div className="text-3xl font-extrabold text-[var(--text-1)]">{placements.length} Kênh</div>
        </div>
        <div className="p-6 bg-[var(--bg-secondary)]/40 border border-[var(--border)] rounded-[var(--radius)] shadow-sm">
          <div className="text-[var(--text-3)] text-xs font-bold uppercase tracking-wider mb-2">Tiết kiệm tự động (Tháng)</div>
          <div className="text-3xl font-extrabold text-emerald-650 dark:text-emerald-400">0 đ</div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border)] text-[var(--text-3)]">
            <tr>
              <th className="p-4 w-12">
                <input 
                  type="checkbox" 
                  checked={selectedIds.size === placements.length && placements.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded bg-[var(--bg-secondary)] border-[var(--border)] accent-rose-500 cursor-pointer" 
                />
              </th>
              <th className="p-4 font-bold text-[var(--text-2)]">Tên Kênh / Placement URL</th>
              <th className="p-4 font-bold text-[var(--text-2)]">Nhãn AI Phân Loại</th>
              <th className="p-4 font-bold text-[var(--text-2)] text-right">Chi phí lãng phí</th>
              <th className="p-4 font-bold text-[var(--text-2)] text-right">Nhấp / Chuyển Đổi</th>
              <th className="p-4 font-bold text-[var(--text-2)] text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]/60">
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-[var(--text-3)]">Đang tải dữ liệu...</td></tr>
            ) : placements.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-[var(--text-3)] space-y-4">
                  <div className="flex justify-center">
                    <Bot className="w-12 h-12 text-[var(--text-3)]" />
                  </div>
                  <div className="text-[var(--text-2)] font-semibold">Tài khoản sạch sẽ hoặc chưa chạy quét phân tích AI.</div>
                  <div className="text-xs text-[var(--text-3)] max-w-md mx-auto">
                    Bấm nút <span className="text-emerald-600 dark:text-emerald-400 font-bold">"Quét AI Ngay"</span> ở trên để sử dụng mô hình Google Gemini của bạn phân tích các vị trí hiển thị và phát hiện kênh rác lãng phí ngân sách!
                  </div>
                </td>
              </tr>
            ) : placements.map(p => (
              <tr key={p.id} className="hover:bg-[var(--bg-secondary)]/35 transition duration-150">
                <td className="p-4">
                  <input 
                     type="checkbox" 
                     checked={selectedIds.has(p.id)}
                     onChange={() => toggleSelect(p.id)}
                     className="rounded bg-[var(--bg-secondary)] border-[var(--border)] accent-rose-500 cursor-pointer" 
                  />
                </td>
                <td className="p-4">
                  <div className="font-bold text-[var(--text-1)] text-sm">{p.placementName || 'Unknown'}</div>
                  <div className="text-xs text-[var(--text-3)] font-mono mt-0.5 truncate max-w-xs">{p.placementUrl}</div>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    p.aiCategory === 'Kids Content' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-455 border-rose-500/20' :
                    p.aiCategory === 'Casual Games' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-450 border border-amber-500/20' :
                    'bg-[var(--bg-secondary)] text-[var(--text-2)] border border-[var(--border)]'
                  }`}>
                    {p.aiCategory || 'Chưa phân loại'}
                  </span>
                </td>
                <td className="p-4 text-right font-extrabold text-rose-500 dark:text-rose-455 text-sm">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parseFloat(p.costWasted))}
                </td>
                <td className="p-4 text-right text-[var(--text-2)] font-mono">{p.clicks} / {p.conversions}</td>
                <td className="p-4 text-center">
                  <button className="p-1.5 hover:bg-[var(--bg-secondary)] text-[var(--text-3)] hover:text-rose-500 rounded-lg transition" title="Bỏ qua">
                    <Trash2 className="w-4 h-4 mx-auto" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
    </div>
  );
}
