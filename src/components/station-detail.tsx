"use client"

import { X, MapPin, Sunrise, Train, Clock, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Station } from "@/lib/stations"
import { getDistanceCategory } from "@/lib/stations"

interface StationDetailProps {
  station: Station | null
  isOpen: boolean
  onClose: () => void
}

export function StationDetail({ station, isOpen, onClose }: StationDetailProps) {
  if (!station || !isOpen) return null

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 max-h-[70vh] overflow-y-auto md:bottom-4 md:left-auto md:right-4 md:w-96 md:max-h-none">
      <div className="rounded-t-2xl bg-card shadow-2xl md:rounded-2xl">
        {/* Header */}
        <div className="relative h-20 sm:h-32 overflow-hidden rounded-t-2xl bg-linear-to-r from-primary/80 to-accent/80 md:rounded-t-2xl">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Sunrise className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-primary-foreground opacity-50" />
              <p className="mt-1 sm:mt-2 text-xs sm:text-sm font-medium text-primary-foreground/80">
                🌅 日の出撮影スポット
              </p>
            </div>
          </div>
          <div className="absolute inset-0 bg-linear-to-t from-card to-transparent" />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 sm:h-10 sm:w-10 bg-card/50 backdrop-blur-sm hover:bg-card/70"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{station.name}駅</h2>

          <div className="mt-1 sm:mt-2 flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Train className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>{station.operator}</span>
            <span className="text-border">|</span>
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="truncate">{station.line}</span>
          </div>

          <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-lg bg-secondary p-2 sm:p-3 text-center">
              <Sunrise className="mx-auto h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-muted-foreground">沿岸距離</p>
              <p className="text-sm sm:text-base font-medium text-foreground">{station.distanceToCoast.toFixed(2)}km</p>
            </div>
            <div className="rounded-lg bg-secondary p-2 sm:p-3 text-center">
              <Train className="mx-auto h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-muted-foreground">東京から</p>
              <p className="text-sm sm:text-base font-medium text-foreground">{station.distanceFromTokyo.toFixed(1)}km</p>
            </div>
            <div className="rounded-lg bg-secondary p-2 sm:p-3 text-center">
              <Clock className="mx-auto h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-muted-foreground">沿岸</p>
              <p className="text-sm sm:text-base font-medium text-foreground">{getDistanceCategory(station.distanceToCoast)}</p>
            </div>
          </div>

          {station.lastTrainArrival && (
            <div className="mt-3 sm:mt-4 rounded-lg bg-accent/10 p-2 sm:p-3">
              <h3 className="text-xs sm:text-sm font-medium text-accent">🌙 最終列車到着</h3>
              <p className="mt-0.5 sm:mt-1 text-xl sm:text-2xl font-bold text-foreground">{station.lastTrainArrival}</p>
              {station.lastTrainInfo && (
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{station.lastTrainInfo}</p>
              )}
              <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-muted-foreground">
                最終電車で到着→朝まで待機→日の出撮影
              </p>
            </div>
          )}

          <div className="mt-3 sm:mt-4 flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
            <a
              href={station.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <MapPin className="h-3 w-3" />
              <span>Google Mapで開く</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <span className="rounded-full bg-secondary px-2 py-0.5 sm:py-1">{station.operator}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
