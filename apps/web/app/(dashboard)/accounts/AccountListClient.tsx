'use client'

import { useRouter } from 'next/navigation'
import AccountCardClient from './AccountCardClient'

interface AccountListProps {
  initialAccounts: any[];
}

export default function AccountListClient({ initialAccounts }: AccountListProps) {
  const router = useRouter()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {initialAccounts.map(acc => (
        <AccountCardClient 
          key={acc.id} 
          acc={acc} 
          onDeleted={() => router.refresh()} 
        />
      ))}
    </div>
  )
}
