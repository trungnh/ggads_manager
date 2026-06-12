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
    <div className="bg-card border border-border rounded-[var(--radius)] p-5 transition duration-200 hover:border-primary hover:shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-foreground text-sm">{account.name}</span>
        <span className={cn(
          "w-2.5 h-2.5 rounded-full border border-background",
          account.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'
        )} />
      </div>
      <div className="text-xs text-muted-foreground mb-5">
        ID: {account.customerId}
      </div>
      <div className="flex justify-end gap-2.5">
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
