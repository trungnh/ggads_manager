"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Layers, ChevronDown } from "lucide-react";

interface AccountOption {
  id: string;
  name: string | null;
  customerId: string;
}

interface DashboardFiltersProps {
  accounts: AccountOption[];
  distinctDates: string[];
  selectedAccountId: string;
  selectedDate: string;
  actualTodayDate: string;
}

export default function DashboardFilters({
  accounts,
  distinctDates,
  selectedAccountId,
  selectedDate,
  actualTodayDate,
}: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleAccountChange = (accountId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (accountId === "all") {
      params.delete("accountId");
    } else {
      params.set("accountId", accountId);
    }
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleDateChange = (date: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (date === "today") {
      params.delete("date");
    } else {
      params.set("date", date);
    }
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Account filter */}
      <div className="relative flex items-center bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] px-3 py-1.5 shadow-sm text-xs font-semibold hover:border-[var(--primary)]/30 transition duration-150">
        <Layers className="w-3.5 h-3.5 mr-2 text-[var(--text-3)]" />
        <select
          value={selectedAccountId}
          onChange={(e) => handleAccountChange(e.target.value)}
          className="bg-transparent border-none text-[var(--text-1)] focus:outline-none cursor-pointer pr-5 font-bold appearance-none select-none"
        >
          <option value="all" className="bg-[var(--bg-card)] text-[var(--text-1)]">Tất cả tài khoản</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id} className="bg-[var(--bg-card)] text-[var(--text-1)]">
              {acc.name || acc.customerId} ({acc.customerId})
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 ml-1 text-[var(--text-3)] absolute right-2 pointer-events-none" />
      </div>

      {/* Date filter */}
      <div className="relative flex items-center bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] px-3 py-1.5 shadow-sm text-xs font-semibold hover:border-[var(--primary)]/30 transition duration-150">
        <Calendar className="w-3.5 h-3.5 mr-2 text-[var(--text-3)]" />
        <select
          value={selectedDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className="bg-transparent border-none text-[var(--text-1)] focus:outline-none cursor-pointer pr-5 font-bold appearance-none select-none"
        >
          <option value="today" className="bg-[var(--bg-card)] text-[var(--text-1)]">Hôm nay</option>
          <option value="yesterday" className="bg-[var(--bg-card)] text-[var(--text-1)]">Hôm qua</option>
          <option value="7days" className="bg-[var(--bg-card)] text-[var(--text-1)]">7 ngày qua</option>
          <option value="15days" className="bg-[var(--bg-card)] text-[var(--text-1)]">15 ngày qua</option>
          <option value="30days" className="bg-[var(--bg-card)] text-[var(--text-1)]">30 ngày qua</option>
        </select>
        <ChevronDown className="w-3.5 h-3.5 ml-1 text-[var(--text-3)] absolute right-2 pointer-events-none" />
      </div>
    </div>
  );
}
