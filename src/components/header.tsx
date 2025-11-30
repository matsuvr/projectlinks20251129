"use client"

import { Sun, Menu, X, Train } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  stationCount: number
  onToggleSidebar: () => void
  isSidebarOpen: boolean
}

export function Header({ stationCount, onToggleSidebar, isSidebarOpen }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-2 py-2 sm:px-4 sm:py-3">
      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 md:hidden" onClick={onToggleSidebar}>
          {isSidebarOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
        </Button>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary">
            <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm sm:text-lg font-bold text-foreground">初日の出ハンター</h1>
            <p className="hidden sm:block text-xs text-muted-foreground">鉄道で行けるから車なしでも安心</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
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
