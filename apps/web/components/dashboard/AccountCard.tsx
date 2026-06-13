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
  const isOnline = ['ACTIVE', 'ENABLED'].includes(account.status.toUpperCase());

  return (
    <div className="bg-card border border-border rounded-[var(--radius)] p-5 transition duration-200 hover:border-primary hover:shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-foreground text-sm">{account.name}</span>
        <span className={cn(
          "w-2 h-2 rounded-full border border-background",
          isOnline ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]' : 'bg-rose-500'
        )} />
      </div>
      <div className="text-xs text-muted-foreground mb-5">
        ID: {account.customerId}
      </div>
      <div className="flex justify-end gap-2">
        <Link 
          href={`/accounts/${account.id}/settings`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "rounded-[calc(var(--radius)*0.8)] text-xs text-muted-foreground border-border hover:bg-secondary cursor-pointer transition-all"
          )}
        >
          Cài đặt
        </Link>
        <Link 
          href={`/campaigns/${account.customerId}`}
          className={cn(
            buttonVariants({ variant: "default", size: "sm" }),
            "bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 border-0 font-semibold shadow-sm px-4 rounded-[calc(var(--radius)*0.8)] transition-all hover:scale-[1.02] cursor-pointer"
          )}
        >
          Xem Chiến Dịch
        </Link>
      </div>
    </div>
  );
}
