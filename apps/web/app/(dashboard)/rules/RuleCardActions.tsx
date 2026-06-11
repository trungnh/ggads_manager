"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Edit3, Trash2, Play, Pause, Loader2 } from "lucide-react"

interface RuleCardActionsProps {
  ruleId: string;
  isEnabled: boolean;
}

export function RuleCardActions({ ruleId, isEnabled: initialEnabled }: RuleCardActionsProps) {
  const router = useRouter()
  const [isEnabled, setIsEnabled] = useState(initialEnabled)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggle = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !isEnabled })
      })
      if (res.ok) {
        setIsEnabled(!isEnabled)
        router.refresh()
      } else {
        alert("Lỗi khi cập nhật trạng thái")
      }
    } catch (e) {
      alert("Lỗi kết nối")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa Rule này?")) return
    
    setIsLoading(true)
    try {
      const res = await fetch(`/api/rules/${ruleId}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      } else {
        alert("Lỗi khi xóa Rule")
      }
    } catch (e) {
      alert("Lỗi kết nối")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 text-primary hover:bg-primary/10"
        onClick={() => router.push(`/rules/edit/${ruleId}`)}
        disabled={isLoading}
      >
        <Edit3 className="w-4 h-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={handleDelete}
        disabled={isLoading}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
      <div className="ml-2 pl-2 border-l h-8 flex items-center">
        <Button 
          variant={isEnabled ? "secondary" : "default"} 
          size="icon" 
          className={`h-8 w-8 rounded-full ${isEnabled ? 'text-green-600 bg-green-50' : ''}`}
          onClick={handleToggle}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : isEnabled ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" fill="currentColor" />
          )}
        </Button>
      </div>
    </div>
  )
}
