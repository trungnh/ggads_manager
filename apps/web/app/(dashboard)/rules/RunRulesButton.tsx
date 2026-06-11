"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Play, Loader2 } from "lucide-react"

export function RunRulesButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleRun = async () => {
    if (!confirm("Bạn có chắc chắn muốn chạy tất cả các Rule ngay bây giờ?")) return
    
    setIsLoading(true)
    try {
      const res = await fetch('/api/test/run-rules', { method: 'POST' })
      const data = await res.json()
      
      if (res.ok) {
        alert(data.message)
      } else {
        alert(data.error || "Có lỗi xảy ra")
      }
    } catch (e) {
      alert("Lỗi kết nối")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="gap-2 text-primary border-primary/20 hover:bg-primary/5"
      onClick={handleRun}
      disabled={isLoading}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
      Chạy tất cả Rule ngay
    </Button>
  )
}
