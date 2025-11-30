"use client"

import { MapPin, Sunrise } from "lucide-react"
import type { Station } from "@/lib/stations"
import { getDistanceCategory } from "@/lib/stations"

interface StationListProps {
  stations: Station[]
  selectedStation: Station | null
  onStationSelect: (station: Station) => void
}

export function StationList({ stations, selectedStation, onStationSelect }: StationListProps) {
  return (
    <div className="flex h-full flex-col border-r border-border">
      <div className="border-b border-border p-3 sm:p-4">
        <h2 className="text-sm sm:text-base font-bold text-foreground">🌅 撮影スポット一覧</h2>
        <p className="text-xs text-muted-foreground mt-1">地図から駅を探してタップ</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {stations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <MapPin className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">駅が見つかりません</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {stations.map((station) => (
              <li key={station.id}>
                <button
                  className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-left transition-colors hover:bg-secondary ${
                    selectedStation?.id === station.id ? "bg-secondary" : ""
                  }`}
                  onClick={() => onStationSelect(station)}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary">
                      <Sunrise className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm sm:text-base font-medium text-foreground">{station.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{station.line}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1 sm:gap-2">
                        <span className="inline-flex items-center rounded-full bg-accent/20 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium text-accent">
                          沿岸{getDistanceCategory(station.distanceToCoast)}
                        </span>
                        {station.lastTrainArrival && (
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            🌙 {station.lastTrainArrival}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
