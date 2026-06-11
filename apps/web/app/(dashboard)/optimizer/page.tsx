"use client";

import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Bot, 
  ShieldAlert, 
  DollarSign, 
  Target, 
  Layers, 
  Activity, 
  Sparkles, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  ArrowUpRight, 
  Lock, 
  Unlock, 
  Settings, 
  AlertTriangle,
  RefreshCw,
  X,
  Sliders,
  Check,
  ChevronDown
} from "lucide-react";

interface AdsAccount {
  id: string;
  name: string;
  customerId: string;
}

interface CrmStatus {
  id: string;
  name: string;
}

interface CampaignAllocation {
  campaignId: string;
  campaignName: string;
  currentBudgetMicros: number;
  recommendedBudgetMicros: number;
  budgetChangeMicros: number;
  budgetChangePct: number;
  projectedConversions: number;
  projectedCpaMicros: number;
  projectedRevenueMicros: number;
  isLocked: boolean;
  isSuspended: boolean;
  suspendReason?: string;
  rationale: {
    action: string;
    primaryReason: string;
    supportingReasons: string[];
    keyMetric: string;
  };
  recommendedAdSchedule?: {
    activeHours: { start: number; end: number }[];
    dowAdjustments: { dow: number; adjustmentPct: number; reason: string }[];
  };
}

const tagTemplates = [
  "Đơn ảo", "Không liên lạc được", "Spam", "Trùng lặp", "Khách hẹn lại", "Giao lại", "Hàng lỗi", "Thiếu thông tin"
];

const presetGoals = [
  { id: "maximize_conversions", name: "Tối đa đơn hàng CRM", desc: "Ưu tiên số lượng đơn hàng thực giao thành công." },
  { id: "maximize_revenue", name: "Tối đa doanh thu CRM", desc: "Tập trung phân bổ cho các sản phẩm/chiến dịch mang lại giá trị cao nhất." },
  { id: "maximize_profit", name: "Tối đa lợi nhuận ròng", desc: "Thuật toán cân đối chi phí nhập hàng để tối ưu hóa biên lợi nhuận ròng." },
  { id: "hit_target_cpa", name: "CPA mục tiêu (Target CPA)", desc: "Giữ CPA bình quân trong ngày dưới ngưỡng đặt trước." }
];

export default function BudgetOptimizerWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [accounts, setAccounts] = useState<AdsAccount[]>([]);
  const [crmStatuses, setCrmStatuses] = useState<CrmStatus[]>([]);
  const [pancakeTags, setPancakeTags] = useState<{ id: string; name: string }[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingTags, setLoadingTags] = useState(true);
  
  // Selections state
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [excludedStatuses, setExcludedStatuses] = useState<string[]>([
    "Đã hủy (Canceled)", "Đã xóa (Deleted)", "Đã chuyển hoàn (Returned)", "Đang chuyển hoàn (Returning)"
  ]);
  const [excludedTags, setExcludedTags] = useState<string[]>(["Đơn ảo", "Không liên lạc được", "Spam", "Trùng lặp"]);
  
  // Rollout and Safety states
  const [stagedRolloutDays, setStagedRolloutDays] = useState<number>(3);
  const [cpaThresholdPct, setCpaThresholdPct] = useState<number>(30);
  const [paceCheckEnabled, setPaceCheckEnabled] = useState<boolean>(true);
  const [minSpendVnd, setMinSpendVnd] = useState<number>(2000000); // 2 Million VND

  // Step 2 objectives state
  const [totalMonthlyBudget, setTotalMonthlyBudget] = useState<number>(30000000);
  const [remainingBudget, setRemainingBudget] = useState<number>(30000000);
  const [selectedGoal, setSelectedGoal] = useState<string>("maximize_conversions");
  const [targetCpaVnd, setTargetCpaVnd] = useState<number>(250000);

  // Output calculations state
  const [isComputing, setIsComputing] = useState(false);
  const [optimizationRun, setOptimizationRun] = useState<any>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<"conservative" | "recommended" | "aggressive">("recommended");

  // Apply state
  const [isApplying, setIsApplying] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Day list helper for linear staged rollout display
  const [rolloutPreviewList, setRolloutPreviewList] = useState<{ day: number; date: string; budgetPct: number }[]>([]);

  // Update linear dates rollout steps
  useEffect(() => {
    const list = [];
    const now = new Date();
    for (let i = 1; i <= stagedRolloutDays; i++) {
      const stepDate = new Date();
      stepDate.setDate(now.getDate() + i);
      const dateStr = stepDate.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" });
      const budgetPct = Math.round(100 + (i / stagedRolloutDays) * 100);
      list.push({ day: i, date: dateStr, budgetPct });
    }
    setRolloutPreviewList(list);
  }, [stagedRolloutDays]);

  // 1. Fetch Connected Accounts & CRM Statuses
  useEffect(() => {
    const fetchData = async () => {
      setLoadingAccounts(true);
      try {
        const accRes = await fetch("/api/accounts");
        if (accRes.ok) {
          const data = await accRes.json();
          const list = data.accounts || [];
          setAccounts(list);
          if (list.length > 0) {
            setSelectedAccountIds([list[0].id]); // select first by default
          }
        }

        const statusRes = await fetch("/api/crm/pancake/statuses");
        if (statusRes.ok) {
          const statuses = await statusRes.json();
          setCrmStatuses(statuses);
        }

        setLoadingTags(true);
        const tagsRes = await fetch("/api/crm/pancake/tags");
        if (tagsRes.ok) {
          const tags = await tagsRes.json();
          setPancakeTags(tags);
        }
      } catch (err) {
        console.error("Error loading accounts, statuses or tags:", err);
      } finally {
        setLoadingAccounts(false);
        setLoadingTags(false);
      }
    };

    fetchData();
  }, []);

  const handleToggleAccount = (id: string) => {
    setSelectedAccountIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleStatus = (name: string) => {
    setExcludedStatuses(prev => 
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    );
  };

  const handleToggleTag = (tag: string) => {
    setExcludedTags(prev => 
      prev.includes(tag) ? prev.filter(x => x !== tag) : [...prev, tag]
    );
  };

  // 2. Trigger Calculation Run
  const handleComputeOptimization = async () => {
    if (selectedAccountIds.length === 0) {
      setError("Vui lòng chọn ít nhất một tài khoản quảng cáo.");
      return;
    }

    setIsComputing(true);
    setError("");
    setSuccess("");
    try {
      const rolloutStepsList = rolloutPreviewList.map(step => ({
        day: step.day,
        percentage: step.budgetPct
      }));

      const res = await fetch("/api/optimizer/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalMonthlyBudget,
          remainingBudget,
          selectedAccountIds,
          excludedStatuses,
          excludedTags,
          rolloutSteps: rolloutStepsList,
          safetyBreaker: {
            cpaThresholdPct,
            paceCheckEnabled,
            minSpendMicros: minSpendVnd * 1000000
          },
          objective: {
            primary: selectedGoal,
            targetCpaMicros: targetCpaVnd * 1000000
          }
        })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setOptimizationRun(resData.data);
        setStep(3); // go to step 3 summary
        setSuccess("Thuật toán tối ưu đã tính toán thành công phân bổ ngân sách!");
      } else {
        setError(resData.error || "Gặp lỗi trong quá trình chạy thuật toán tối ưu ngân sách.");
      }
    } catch (err) {
      setError("Lỗi kết nối tới máy chủ.");
    } finally {
      setIsComputing(false);
    }
  };

  // 3. Apply Selected Scenario
  const handleApplyOptimization = async () => {
    if (!optimizationRun) return;

    setIsApplying(true);
    setError("");
    setAppliedSuccess("");
    try {
      const res = await fetch(`/api/optimizer/${optimizationRun.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: selectedScenarioId === "recommended" ? "full" : "full",
          stagedRolloutDays
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAppliedSuccess(data.message);
        setSuccess(data.message);
      } else {
        setError(data.error || "Gặp lỗi khi đồng bộ ngân sách lên Google Ads API.");
      }
    } catch (err) {
      setError("Lỗi kết nối khi đồng bộ ngân sách.");
    } finally {
      setIsApplying(false);
    }
  };

  // Get active scenario details from computed run
  const activeScenario = optimizationRun?.algorithmOutput?.scenarios?.find(
    (s: any) => s.id === selectedScenarioId
  ) || optimizationRun?.algorithmOutput;

  const allocationsList: CampaignAllocation[] = activeScenario?.allocations || [];
  const projectedOutcome = optimizationRun?.algorithmOutput?.projectedOutcome || {};

  return (
    <div className="space-y-6 font-sans">
      
      {/* Toast Alert Dialogs */}
      {(error || success) && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-455 rounded-[var(--radius)] text-sm flex items-start gap-2.5 shadow-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1">
                <span className="font-semibold">Cảnh báo:</span> {error}
              </div>
              <button onClick={() => setError("")} className="text-[var(--text-3)] hover:text-[var(--text-1)]">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-[var(--radius)] text-sm flex items-start gap-2.5 shadow-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-500" />
              <div className="flex-1">
                <span className="font-semibold">Thành công:</span> {success}
              </div>
              <button onClick={() => setSuccess("")} className="text-[var(--text-3)] hover:text-[var(--text-1)]">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Segmented Top Wizard Header Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[var(--bg-card)] p-6 rounded-[var(--radius)] border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[calc(var(--radius)*0.8)] bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center text-[var(--primary)] shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-1)] flex items-center gap-2">
              Budget Optimizer AI <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">v2.0</span>
            </h1>
            <p className="text-sm text-[var(--text-3)]">Phân bổ ngân sách portfolio tối ưu hóa Marginal CPA dựa trên đối soát Pancake CRM khép kín.</p>
          </div>
        </div>

        {/* Segmented Wizard Tracker */}
        <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] p-1 rounded-[var(--radius)] text-xs font-bold">
          <button 
            disabled={isComputing || isApplying}
            onClick={() => setStep(1)}
            className={`px-3 py-1.5 rounded-[calc(var(--radius)*0.7)] transition duration-150 ${step === 1 ? 'bg-[var(--bg-card)] text-[var(--text-1)] border border-[var(--border)] shadow-sm' : 'text-[var(--text-3)] hover:text-[var(--text-2)]'}`}
          >
            1. Cấu hình & CRM
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-3)]" />
          <button 
            disabled={isComputing || isApplying || step === 1}
            onClick={() => setStep(2)}
            className={`px-3 py-1.5 rounded-[calc(var(--radius)*0.7)] transition duration-150 ${step === 2 ? 'bg-[var(--bg-card)] text-[var(--text-1)] border border-[var(--border)] shadow-sm' : 'text-[var(--text-3)] hover:text-[var(--text-2)]'}`}
          >
            2. Mục tiêu tối ưu
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-3)]" />
          <button 
            disabled={!optimizationRun}
            onClick={() => setStep(3)}
            className={`px-3 py-1.5 rounded-[calc(var(--radius)*0.7)] transition duration-150 ${step === 3 ? 'bg-[var(--bg-card)] text-[var(--text-1)] border border-[var(--border)] shadow-sm' : 'text-[var(--text-3)] hover:text-[var(--text-2)]'}`}
          >
            3. Đề xuất & Duyệt
          </button>
        </div>
      </div>

      {/* ==================== STEP 1: CONFIGURE ACCOUNTS & CRM EXCLUSIONS ==================== */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Grid 1 & 2: Ads Accounts selection */}
            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] space-y-4 shadow-sm">
                <div>
                  <h2 className="text-base font-bold text-[var(--text-1)] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-500" />
                    Chọn tài khoản quảng cáo tối ưu portfolio
                  </h2>
                  <p className="text-xs text-[var(--text-3)] mt-1 leading-relaxed">
                    Hệ thống hỗ trợ chạy cross-account. Thuật toán sẽ coi tất cả chiến dịch đủ điều kiện của các tài khoản đã chọn là một danh mục chung và phân bổ tối ưu nhất.
                  </p>
                </div>

                {loadingAccounts ? (
                  <div className="py-12 text-center text-[var(--text-3)] font-medium">Đang tải danh sách tài khoản...</div>
                ) : accounts.length === 0 ? (
                  <div className="py-12 text-center text-[var(--text-3)] border border-dashed border-[var(--border)] rounded-[var(--radius)] bg-[var(--bg-secondary)]/50 font-medium">
                    Không tìm thấy tài khoản Google Ads nào liên kết.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {accounts.map(acc => {
                      const isSelected = selectedAccountIds.includes(acc.id);
                      return (
                        <div 
                          key={acc.id}
                          onClick={() => handleToggleAccount(acc.id)}
                          className={`p-4 rounded-[calc(var(--radius)*0.8)] border transition duration-200 cursor-pointer flex justify-between items-center ${
                            isSelected 
                              ? 'bg-emerald-500/5 border-emerald-500/30 text-[var(--text-1)]' 
                              : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-2)] hover:border-[var(--border)] hover:bg-[var(--bg-card)]'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="font-bold text-sm text-[var(--text-1)]">{acc.name || "Không rõ tên"}</div>
                            <div className="text-xs text-[var(--text-3)] font-mono">{acc.customerId}</div>
                          </div>
                          <div className={`w-5 h-5 rounded-[calc(var(--radius)*0.4)] border flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-[var(--border)]'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CRM status filter exclusions */}
              <div className="p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] space-y-4 shadow-sm">
                <div>
                  <h2 className="text-base font-bold text-[var(--text-1)] flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    Trạng thái đơn Pancake CRM loại trừ (CPA/ROAS đối soát sạch)
                  </h2>
                  <p className="text-xs text-[var(--text-3)] mt-1 leading-relaxed">
                    Thuật toán sẽ tự động loại bỏ các đơn hàng có trạng thái được chọn khỏi tính toán CPA/ROAS thực tế để đảm bảo chất lượng dòng tiền sạch.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {crmStatuses.map(status => {
                    const isExcluded = excludedStatuses.includes(status.name);
                    return (
                      <div 
                        key={status.id}
                        onClick={() => handleToggleStatus(status.name)}
                        className={`p-2.5 rounded-[calc(var(--radius)*0.6)] border text-xs font-semibold cursor-pointer transition duration-150 flex items-center justify-between ${
                          isExcluded 
                            ? 'bg-rose-500/5 border-rose-500/20 text-rose-500 dark:text-rose-455' 
                            : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-2)] hover:border-[var(--border)] hover:bg-[var(--bg-card)]'
                        }`}
                      >
                        <span className="truncate">{status.name}</span>
                        {isExcluded && <X className="w-3.5 h-3.5 text-rose-500 shrink-0 ml-1.5" />}
                      </div>
                    );
                  })}
                </div>

                {/* Excluded order tags */}
                <div className="space-y-3 border-t border-[var(--border)] pt-4">
                  <span className="text-xs font-bold text-[var(--text-2)] block uppercase tracking-wider">Loại trừ thẻ đơn hàng (Pancake CRM Tag Filter):</span>
                  <div className="flex flex-wrap gap-2">
                    {loadingTags ? (
                      <span className="text-xs text-[var(--text-3)] font-mono animate-pulse">Đang tải thẻ đơn từ Pancake...</span>
                    ) : pancakeTags.length === 0 ? (
                      <span className="text-xs text-[var(--text-3)]">Không tìm thấy thẻ đơn hàng nào liên kết.</span>
                    ) : (
                      pancakeTags.map(tag => {
                        const isExcluded = excludedTags.includes(tag.name);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleToggleTag(tag.name)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition duration-150 ${
                              isExcluded 
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 dark:text-rose-400 font-bold' 
                                : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-2)] hover:border-[var(--border)] hover:bg-[var(--bg-card)]'
                            }`}
                          >
                            {tag.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Advanced Staged Rollout sliders & Safety Breaker controls */}
            <div className="space-y-6">
              
              {/* Staged Rollout Days slider */}
              <div className="p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] space-y-4 flex flex-col justify-between shadow-sm min-h-[250px]">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-1)] flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-500" />
                    Lộ trình tăng trưởng tiệm cận
                  </label>
                  <p className="text-xs text-[var(--text-3)] leading-relaxed">
                    Tránh thay đổi ngân sách đột ngột gây sốc thuật toán thầu. Hệ thống sẽ cắn ngân sách tiệm cận theo ngày.
                  </p>
                </div>

                <div className="space-y-4 py-2">
                  <div className="flex justify-between items-center text-xs font-bold text-[var(--text-2)]">
                    <span>Số ngày tăng trưởng:</span>
                    <span className="text-emerald-500 dark:text-emerald-400 text-sm font-extrabold font-mono">{stagedRolloutDays} ngày</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="7"
                    value={stagedRolloutDays}
                    onChange={(e) => setStagedRolloutDays(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="grid grid-cols-7 text-[10px] font-bold text-[var(--text-3)] text-center font-mono">
                    <span>1d</span><span>2d</span><span>3d</span><span>4d</span><span>5d</span><span>6d</span><span>7d</span>
                  </div>
                </div>

                {/* Staged rollout steps display */}
                <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[var(--radius)] space-y-2.5">
                  <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block">Các bước tăng trưởng đề xuất:</span>
                  <div className="flex flex-wrap gap-2">
                    {rolloutPreviewList.map(step => (
                      <div key={step.day} className="bg-[var(--bg-card)] border border-[var(--border)] px-2.5 py-1 rounded-[calc(var(--radius)*0.6)] text-[10px] font-semibold text-[var(--text-2)] flex flex-col items-center min-w-[50px] font-mono shadow-sm">
                        <span className="text-[var(--text-3)]">T+{step.day}</span>
                        <span className="text-emerald-500 dark:text-emerald-400 font-bold mt-0.5">+{step.budgetPct - 100}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Safety Breaker parameters config */}
              <div className="p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] space-y-4 flex flex-col justify-between shadow-sm min-h-[280px]">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-1)] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-rose-500" />
                    Cầu chì an toàn trong ngày
                  </label>
                  <p className="text-xs text-[var(--text-3)] leading-relaxed">
                    Theo dõi tiến độ tiêu tiền và CPA hàng giờ. Tự động hạ ngân sách quảng cáo về mức ban đầu để cắt lỗ nếu có biến động bất thường.
                  </p>
                </div>

                <div className="space-y-4">
                  
                  {/* Pacing Speed switch */}
                  <div className="flex justify-between items-center py-0.5 border-b border-[var(--border)] pb-3">
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-2)]">Tốc độ tiêu tiền sáng sớm (Pacing)</div>
                      <span className="text-[10px] text-[var(--text-3)]">Báo động cắn &gt;50% ngân sách trước 11h với 0 đơn</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={paceCheckEnabled}
                      onChange={(e) => setPaceCheckEnabled(e.target.checked)}
                      className="w-8 h-4 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* CPA threshold margin */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">Tỷ lệ vượt CPA cho phép (%)</div>
                    <div className="relative">
                      <input
                        type="number"
                        value={cpaThresholdPct}
                        onChange={(e) => setCpaThresholdPct(parseInt(e.target.value) || 0)}
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[calc(var(--radius)*0.8)] px-3.5 py-1.5 text-xs text-[var(--text-1)] focus:outline-none focus:border-emerald-500 transition font-medium"
                      />
                      <span className="absolute right-3.5 top-1.5 text-[10px] text-[var(--text-3)] font-bold">%</span>
                    </div>
                  </div>

                  {/* Min spend threshold */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">Chi phí tối thiểu kích hoạt cầu chì (VND)</div>
                    <div className="relative">
                      <input
                        type="number"
                        value={minSpendVnd}
                        onChange={(e) => setMinSpendVnd(parseInt(e.target.value) || 0)}
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[calc(var(--radius)*0.8)] px-3.5 py-1.5 text-xs text-[var(--text-1)] focus:outline-none focus:border-emerald-500 transition font-medium"
                      />
                      <span className="absolute right-3.5 top-1.5 text-[10px] text-[var(--text-3)] font-bold">đ</span>
                    </div>
                  </div>

                </div>
              </div>

            </div>

          </div>

          {/* Footer Action buttons */}
          <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-6">
            <button
              onClick={() => setStep(2)}
              disabled={selectedAccountIds.length === 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[calc(var(--radius)*0.8)] text-sm font-semibold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              Tiếp tục thiết lập mục tiêu
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* ==================== STEP 2: BUDGET POOLS & OBJECTIVES CONFIG ==================== */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left panels: Goals Selection & Target CPA limit */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] space-y-4 shadow-sm">
                <div>
                  <h2 className="text-base font-bold text-[var(--text-1)] flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-500" />
                    Thiết lập mục tiêu tối ưu chính
                  </h2>
                  <p className="text-xs text-[var(--text-3)] mt-1 leading-relaxed">
                    Hệ thống sẽ định cấu hình chiến lược thầu và Marginal CPA dựa trên mục tiêu định hướng của bạn.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {presetGoals.map(goal => {
                    const isSelected = selectedGoal === goal.id;
                    return (
                      <div
                        key={goal.id}
                        onClick={() => setSelectedGoal(goal.id)}
                        className={`p-4 rounded-[var(--radius)] border transition duration-200 cursor-pointer flex flex-col justify-between gap-3 ${
                          isSelected 
                            ? 'bg-emerald-500/5 border-emerald-500/30 text-[var(--text-1)]' 
                            : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-2)] hover:border-[var(--border)] hover:bg-[var(--bg-card)]'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-sm flex items-center gap-1.5 text-[var(--text-1)]">
                            {goal.name}
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />}
                          </div>
                          <p className="text-xs text-[var(--text-3)] leading-relaxed">{goal.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Target CPA constraint input */}
                {selectedGoal === "hit_target_cpa" && (
                  <div className="space-y-2 p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[var(--radius)] max-w-sm animate-in slide-in-from-top-2 duration-150">
                    <label className="text-xs font-bold text-[var(--text-2)] block uppercase tracking-wider">CPA trần mục tiêu mong muốn (VND / Đơn):</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={targetCpaVnd}
                        onChange={(e) => setTargetCpaVnd(parseInt(e.target.value) || 0)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-[calc(var(--radius)*0.8)] px-4 py-2.5 text-sm text-[var(--text-1)] focus:outline-none focus:border-emerald-500 transition font-medium"
                        placeholder="250000"
                      />
                      <span className="absolute right-4 top-2.5 text-xs text-[var(--text-3)] font-bold">VND</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-3)] block leading-relaxed">Thuật toán sẽ tự động cắt bớt các bước thầu marginal vượt quá trần CPA này.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right panels: Budget pool inputs */}
            <div className="p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] space-y-4 flex flex-col justify-between shadow-sm min-h-[300px]">
              <div className="space-y-3">
                <label className="text-sm font-bold text-[var(--text-1)] flex items-center gap-2 border-b border-[var(--border)] pb-3">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  Tổng ngân sách quảng cáo tháng
                </label>
                <p className="text-xs text-[var(--text-3)] leading-relaxed">
                  Ngân sách tổng thể tối đa cho phép phân bổ giữa tất cả chiến dịch Google Ads của tệp tài khoản.
                </p>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">Tổng ngân sách tháng (VND)</div>
                    <div className="relative">
                      <input
                        type="number"
                        value={totalMonthlyBudget}
                        onChange={(e) => setTotalMonthlyBudget(parseInt(e.target.value) || 0)}
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[calc(var(--radius)*0.8)] px-4 py-2.5 text-sm text-[var(--text-1)] focus:outline-none focus:border-emerald-500 transition font-medium"
                      />
                      <span className="absolute right-4 top-2.5 text-xs text-[var(--text-3)] font-bold font-mono">đ</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">Ngân sách còn lại thực tế trong tháng (VND)</div>
                    <div className="relative">
                      <input
                        type="number"
                        value={remainingBudget}
                        onChange={(e) => setRemainingBudget(parseInt(e.target.value) || 0)}
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[calc(var(--radius)*0.8)] px-4 py-2.5 text-sm text-[var(--text-1)] focus:outline-none focus:border-emerald-500 transition font-medium"
                      />
                      <span className="absolute right-4 top-2.5 text-xs text-[var(--text-3)] font-bold font-mono">đ</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-[var(--border)]">
                <button
                  onClick={handleComputeOptimization}
                  disabled={isComputing}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[calc(var(--radius)*0.8)] text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isComputing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isComputing ? "Đang xử lý thuật toán..." : "Chạy tối ưu portfolio"}
                </button>
              </div>
            </div>

          </div>

          {/* Footer controls */}
          <div className="flex justify-between border-t border-[var(--border)] pt-6">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] hover:bg-[var(--bg-secondary)] text-[var(--text-2)] rounded-[calc(var(--radius)*0.8)] text-sm font-semibold transition flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Quay lại Bước 1
            </button>
          </div>

        </div>
      )}

      {/* ==================== STEP 3: RESULTS SUMMARY & AI ACTION LAYER ==================== */}
      {step === 3 && optimizationRun && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Top segment comparing projections vs status-quo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Projected Cost */}
            <div className="p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] space-y-1.5 relative overflow-hidden shadow-sm">
              <div className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">Tổng chi tiêu dự kiến (Chu kỳ 30 ngày)</div>
              <div className="text-2xl font-black text-[var(--text-1)]">
                {(projectedOutcome.projectedCostMicros / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ
              </div>
              <div className="text-[10px] text-[var(--text-3)] flex items-center gap-1">
                <span>Dưới tổng hạn mức ngân sách đặt ra</span>
              </div>
            </div>

            {/* Projected Conversions (Delivered) */}
            <div className="p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] space-y-1.5 shadow-sm">
              <div className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">Số đơn hàng dự kiến (CRM)</div>
              <div className="text-2xl font-black text-emerald-500 dark:text-emerald-400 flex items-baseline gap-1.5">
                {projectedOutcome.projectedConversions} đơn
                {projectedOutcome.vsStatusQuo?.conversionDeltaPct > 0 && (
                  <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">
                    +{projectedOutcome.vsStatusQuo.conversionDeltaPct}%
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[var(--text-3)]">
                Tăng khoảng +{projectedOutcome.vsStatusQuo?.conversionDelta || 0} đơn so với hiện tại
              </div>
            </div>

            {/* Projected CPA average */}
            <div className="p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] space-y-1.5 shadow-sm">
              <div className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">CPA trung bình dự kiến</div>
              <div className="text-2xl font-black text-[var(--text-1)] flex items-baseline gap-1.5">
                {(projectedOutcome.projectedCpaMicros / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ
                {projectedOutcome.vsStatusQuo?.cpaDelta < 0 ? (
                  <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">
                    {projectedOutcome.vsStatusQuo.cpaDelta}%
                  </span>
                ) : (
                  projectedOutcome.vsStatusQuo?.cpaDelta > 0 && (
                    <span className="text-xs font-bold text-rose-500">
                      +{projectedOutcome.vsStatusQuo.cpaDelta}%
                    </span>
                  )
                )}
              </div>
              <div className="text-[10px] text-[var(--text-3)]">
                Hiệu năng thầu tổng hợp portfolio
              </div>
            </div>

            {/* confidence score and calculation speed */}
            <div className="p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] space-y-1.5 shadow-sm">
              <div className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider font-mono">Độ tin cậy thuật toán</div>
              <div className="text-lg font-black text-[var(--text-1)] capitalize flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  optimizationRun.confidence === 'high' ? 'bg-emerald-500' : optimizationRun.confidence === 'medium' ? 'bg-amber-500' : 'bg-red-500'
                }`} />
                {optimizationRun.confidence === 'high' ? 'Cao (High)' : 'Bình thường'}
              </div>
              <div className="text-[9px] text-[var(--text-3)] leading-relaxed">
                {optimizationRun.confidenceReason || "Dữ liệu lịch sử tích lũy đầy đủ."}
              </div>
            </div>

          </div>

          {/* Asymmetric Split view: Wide Left, Sticky Right */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* WIDE LEFT COLUMN: Scenarios selector & detailed allocations grid */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Scenario segmented selectors card */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] p-6 space-y-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[var(--text-1)] flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-emerald-500" />
                    So sánh kịch bản phân bổ ngân sách
                  </h3>
                  <span className="text-[10px] text-[var(--text-3)] font-mono">Marginal curves calculated</span>
                </div>

                <div className="grid grid-cols-3 gap-3 bg-[var(--bg-secondary)] p-1.5 rounded-[var(--radius)] border border-[var(--border)]">
                  {optimizationRun.algorithmOutput?.scenarios?.map((s: any) => {
                    const isSelected = selectedScenarioId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedScenarioId(s.id)}
                        className={`p-3 rounded-[calc(var(--radius)*0.8)] text-left transition duration-200 flex flex-col justify-between gap-1.5 ${
                          isSelected 
                            ? 'bg-[var(--bg-card)] text-[var(--text-1)] border border-[var(--border)] shadow-sm font-bold' 
                            : 'text-[var(--text-3)] hover:text-[var(--text-2)] hover:bg-[var(--bg-card)]/40'
                        }`}
                      >
                        <span className="text-xs font-bold capitalize text-[var(--text-1)]">{s.name}</span>
                        <span className="text-[10px] text-[var(--text-3)] mt-1 line-clamp-1 leading-relaxed">{s.description}</span>
                        <div className="flex justify-between items-center text-[10px] font-mono mt-2 pt-2 border-t border-[var(--border)]">
                          <span className="font-semibold text-[var(--text-3)]">Cost/Ngày:</span>
                          <span className={isSelected ? 'text-emerald-500 dark:text-emerald-400 font-bold' : 'text-[var(--text-2)]'}>
                            {(s.totalBudgetMicros / 30000000).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Allocations Table */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] overflow-hidden shadow-sm">
                <div className="p-4 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex justify-between items-center">
                  <span className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider">Bảng phân bổ ngân sách chiến dịch khuyên dùng</span>
                  <span className="text-[10px] text-[var(--text-3)] font-mono">Found {allocationsList.length} campaigns</span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-secondary)]/35 border-b border-[var(--border)] text-[var(--text-3)]">
                    <tr>
                      <th className="p-3.5 font-bold">Chiến dịch / Account</th>
                      <th className="p-3.5 font-bold text-right">Ngân sách cũ / đề xuất</th>
                      <th className="p-3.5 font-bold text-right">Biến động</th>
                      <th className="p-3.5 font-bold text-right">Dự báo đơn / CPA</th>
                      <th className="p-3.5 font-bold text-center">Khung giờ vàng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]/60">
                    {allocationsList.map(alloc => (
                      <tr key={alloc.campaignId} className="hover:bg-[var(--bg-secondary)]/35 transition">
                        
                        {/* Campaign Name */}
                        <td className="p-3.5">
                          <div className="font-bold text-[var(--text-1)] text-xs flex items-center gap-1.5">
                            {alloc.campaignName}
                            {alloc.isLocked && <Lock className="w-3.5 h-3.5 text-[var(--text-3)]" />}
                            {alloc.isSuspended && <span title={alloc.suspendReason}><AlertCircle className="w-3.5 h-3.5 text-rose-500" /></span>}
                          </div>
                          <div className="text-[10px] text-[var(--text-3)] font-mono mt-0.5">{alloc.campaignId}</div>
                          {alloc.isSuspended && (
                            <span className="text-[9px] text-rose-500 dark:text-rose-400 font-medium block mt-1 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10 max-w-xs leading-relaxed">
                              {alloc.suspendReason}
                            </span>
                          )}
                        </td>

                        {/* Budgets comparison */}
                        <td className="p-3.5 text-right font-mono text-xs">
                          <div className="text-[var(--text-3)] line-through">{(alloc.currentBudgetMicros / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ</div>
                          <div className="text-[var(--text-1)] font-bold mt-0.5">{(alloc.recommendedBudgetMicros / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ</div>
                        </td>

                        {/* Budget Change percentage */}
                        <td className="p-3.5 text-right font-mono">
                          {alloc.budgetChangePct === 0 ? (
                            <span className="text-[var(--text-3)] font-medium">0%</span>
                          ) : alloc.budgetChangePct > 0 ? (
                            <span className="text-emerald-500 dark:text-emerald-400 font-bold">+{alloc.budgetChangePct}%</span>
                          ) : (
                            <span className="text-rose-500 font-bold">{alloc.budgetChangePct}%</span>
                          )}
                        </td>

                        {/* Outcomes conversions / CPA */}
                        <td className="p-3.5 text-right font-mono">
                          <div className="text-[var(--text-2)] font-semibold">{alloc.projectedConversions.toFixed(1)} đơn/ngày</div>
                          <div className="text-[var(--text-3)] text-[10px] mt-0.5">CPA: {(alloc.projectedCpaMicros / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ</div>
                        </td>

                        {/* Active Schedule visual indicator */}
                        <td className="p-3.5 text-center">
                          <div className="flex justify-center gap-1 flex-wrap max-w-[120px] mx-auto">
                            {alloc.recommendedAdSchedule?.activeHours?.map((hr, idx) => (
                              <span key={idx} className="bg-[var(--bg-secondary)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[9px] font-semibold text-[var(--text-2)] font-mono">
                                {hr.start}h-{hr.end}h
                              </span>
                            )) || <span className="text-[var(--text-3)]">-</span>}
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>

            {/* STICKY RIGHT COLUMN: Strategic AI Explanations and heatmap charts */}
            <div className="space-y-6">
              
              {/* Gemini AI Strategic Vietnamese report */}
              <div className="p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] relative overflow-hidden space-y-4 shadow-sm">
                {/* AI glow pulse decoration */}
                <div className="absolute -right-12 -top-12 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl animate-pulse" />
                
                <div className="flex items-center gap-3 border-b border-[var(--border)] pb-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-1)] flex items-center gap-1.5">
                      Cố vấn chiến lược Google Ads AI
                    </h3>
                    <span className="text-[9px] text-[var(--text-3)] font-mono">Powered by Gemini Vietnamese model</span>
                  </div>
                </div>

                <div className="space-y-4 text-xs leading-relaxed font-semibold">
                  
                  {/* Summary Card */}
                  <div className="p-3.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[calc(var(--radius)*0.8)] space-y-1.5 shadow-sm">
                    <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider block">Tóm tắt chiến lược:</span>
                    <p className="text-[var(--text-2)] font-medium">{optimizationRun.aiExplanation?.summary || "Đang tải tóm tắt..."}</p>
                  </div>

                  {/* Risks & Tradeoffs Card */}
                  <div className="p-3.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[calc(var(--radius)*0.8)] space-y-1.5 shadow-sm">
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Sự đánh đổi & Rủi ro:</span>
                    <p className="text-[var(--text-2)] font-medium">{optimizationRun.aiExplanation?.tradeoffs || "Đang phân tích tradeoffs..."}</p>
                  </div>

                  {/* Rollout step Card */}
                  <div className="p-3.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[calc(var(--radius)*0.8)] space-y-1.5 shadow-sm">
                    <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block">Lộ trình tiệm cận đề xuất:</span>
                    <p className="text-[var(--text-2)] font-medium">{optimizationRun.aiExplanation?.rolloutPlan || "Đang tính toán bước cắn tiền..."}</p>
                  </div>

                </div>
              </div>

              {/* Day schedules adjustments heatmap grid */}
              <div className="p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] space-y-3.5 shadow-sm">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-1)] flex items-center gap-1.5 uppercase tracking-wider">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Lịch thầu khuyên dùng (Bid Modifier)
                  </h4>
                  <p className="text-[10px] text-[var(--text-3)] mt-0.5 leading-relaxed">
                    Điều chỉnh giá thầu thông minh cho các ngày trong tuần nhằm cướp lượt hiển thị giờ vàng.
                  </p>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center font-mono text-[9px] font-bold">
                  {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((label, idx) => {
                    // Typical heatmap modeling
                    const isGoldenDay = idx === 5 || idx === 6; // Friday, Saturday golden days
                    return (
                      <div 
                        key={idx} 
                        className={`p-2 rounded-md flex flex-col gap-1 border ${
                          isGoldenDay 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-3)]'
                        }`}
                      >
                        <span>{label}</span>
                        <span className="font-extrabold">{isGoldenDay ? '+20%' : '0%'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Apply / Deploy Panel */}
              <div className="p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] space-y-4 shadow-sm">
                <div className="text-xs text-[var(--text-3)] leading-relaxed">
                  Khi anh duyệt kế hoạch này, hệ thống sẽ thực hiện đồng bộ ngân sách và đặt khung giờ chạy (`CampaignCriterionService`) trực tiếp lên Google Ads API dưới dạng Staged Rollout.
                </div>
                
                {appliedSuccess ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-[var(--radius)] text-center">
                    {appliedSuccess}
                  </div>
                ) : (
                  <button
                    onClick={handleApplyOptimization}
                    disabled={isApplying}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[calc(var(--radius)*0.8)] text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isApplying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {isApplying ? "Đang đồng bộ..." : "Duyệt & Áp dụng ngay"}
                  </button>
                )}
              </div>

            </div>

          </div>

          {/* Bottom Footer controller */}
          <div className="flex justify-between border-t border-[var(--border)] pt-6">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] hover:bg-[var(--bg-secondary)] text-[var(--text-2)] rounded-[calc(var(--radius)*0.8)] text-sm font-semibold transition flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Quay lại Bước 2
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
