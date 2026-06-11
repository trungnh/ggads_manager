'use client'

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AccountCardProps {
  account: {
    id: string;
    customerId: string;
    name: string;
    status: string;
  };
}

export default function AccountCard({ account }: AccountCardProps) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] p-4 transition-colors duration-200 hover:border-[var(--text-1)]">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-[var(--text-1)]">{account.name}</span>
        <span className={cn(
          "w-2 h-2 rounded-full",
          account.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'
        )} />
      </div>
      <div className="text-xs text-[var(--text-3)] mb-4">
        ID: {account.customerId}
      </div>
      <div className="flex justify-end gap-2">
        <Link 
          href={`/accounts/${account.id}/settings`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Cài đặt
        </Link>
        <Link 
          href={`/campaigns/${account.customerId}`}
          className={cn(buttonVariants({ size: "sm" }))}
        >
          Xem Chiến Dịch
        </Link>
      </div>
    </div>
  );
}
