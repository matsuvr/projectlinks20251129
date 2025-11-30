"use client"

import { useState, useEffect } from "react"
import { Sun, Menu, X, Train } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  stationCount: number
  onToggleSidebar: () => void
  isSidebarOpen: boolean
}

// 2026年1月1日までのカウントダウンを計算
function getCountdown(): { days: number; hours: number; minutes: number; seconds: number } {
  const now = new Date()
  const newYear2026 = new Date(2026, 0, 1, 0, 0, 0)
  const diff = newYear2026.getTime() - now.getTime()
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  
  return { days, hours, minutes, seconds }
}

export function Header({ stationCount, onToggleSidebar, isSidebarOpen }: HeaderProps) {
  const [countdown, setCountdown] = useState(getCountdown())
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getCountdown())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])
  
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-2 py-2 sm:px-4 sm:py-3">
      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 md:hidden" onClick={onToggleSidebar}>
          {isSidebarOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
        </Button>

        <div className="flex items-center gap-2">
          <div className="relative flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary animate-pulse-slow">
            <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" style={{ animationDuration: '2s' }} />
          </div>
          <div>
            <h1 className="text-sm sm:text-lg font-bold text-foreground">初日の出ハンター</h1>
            <p className="hidden sm:block text-xs text-muted-foreground">鉄道で行けるから車なしでも安心</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* 2026年元日カウントダウン */}
        <div className="hidden md:flex items-center gap-2 rounded-lg bg-linear-to-r from-orange-500/20 to-yellow-500/20 px-3 py-1.5 border border-orange-500/30 animate-pulse-slow">
          <span className="text-lg">🎌</span>
          <div className="text-center">
            <p className="text-[10px] text-orange-400 font-medium">2026年元日まで</p>
            <div className="flex items-center gap-1 tabular-nums text-sm font-bold text-foreground">
              <span className="bg-secondary px-1 rounded">{countdown.days}</span>
              <span className="text-muted-foreground text-xs">日</span>
              <span className="bg-secondary px-1 rounded">{String(countdown.hours).padStart(2, '0')}</span>
              <span className="text-muted-foreground text-xs">:</span>
              <span className="bg-secondary px-1 rounded">{String(countdown.minutes).padStart(2, '0')}</span>
              <span className="text-muted-foreground text-xs">:</span>
              <span className="bg-secondary px-1 rounded animate-pulse">{String(countdown.seconds).padStart(2, '0')}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 rounded-full bg-secondary px-2 sm:px-4 py-1 sm:py-2">
          <Train className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
          <span className="text-xs sm:text-sm font-medium text-foreground">{stationCount} 駅</span>
        </div>

        <div className="hidden sm:block text-right">
          <p className="text-xs text-muted-foreground">データ提供</p>
          <p className="text-xs font-medium text-foreground">国土地理院・ODPT</p>
        </div>
      </div>
    </header>
  )
}
