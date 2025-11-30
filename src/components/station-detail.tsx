"use client"

import { useState, useEffect } from "react"
import { X, MapPin, Sunrise, Train, Clock, ExternalLink, Timer, Camera, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Station } from "@/lib/stations"
import { getDistanceCategory } from "@/lib/stations"
import { formatWaitTime } from "@/lib/sunrise"
import { getStationImage, type WikipediaImageInfo, getImageCreditData } from "@/lib/wikipedia-image"

interface StationDetailProps {
  station: Station | null
  isOpen: boolean
  onClose: () => void
}

export function StationDetail({ station, isOpen, onClose }: StationDetailProps) {
  const [imageInfo, setImageInfo] = useState<WikipediaImageInfo | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showCredit, setShowCredit] = useState(false)

  // 駅が変わったら画像を取得
  useEffect(() => {
    if (station && isOpen) {
      setImageLoading(true)
      setImageError(false)
      setImageInfo(null)
      
      getStationImage(station.name)
        .then((info) => {
          setImageInfo(info)
          setImageLoading(false)
        })
        .catch(() => {
          setImageError(true)
          setImageLoading(false)
        })
    }
  }, [station?.id, isOpen])

  if (!station || !isOpen) return null

  const creditData = imageInfo ? getImageCreditData(imageInfo) : null

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 max-h-[70vh] overflow-y-auto md:bottom-4 md:left-auto md:right-4 md:w-96 md:max-h-none animate-slide-in-up">
      <div className="rounded-t-2xl bg-card shadow-2xl md:rounded-2xl">
        {/* Header with Station Image */}
        <div className="relative h-32 sm:h-44 overflow-hidden rounded-t-2xl bg-linear-to-r from-primary/80 to-accent/80 md:rounded-t-2xl">
          {/* 背景画像（Wikimedia Commonsから取得） */}
          {imageInfo?.thumbUrl && !imageError ? (
            <>
              <img 
                src={imageInfo.thumbUrl} 
                alt={`${station.name}駅`}
                className="absolute inset-0 w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 bg-black/40" />
              
              {/* 画像クレジット表示ボタン */}
              <button
                onClick={() => setShowCredit(!showCredit)}
                className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white/90 hover:bg-black/80 transition-colors"
              >
                <Camera className="h-3 w-3" />
                <span>Photo Credit</span>
                <Info className="h-3 w-3" />
              </button>
              
              {/* クレジット詳細ポップアップ */}
              {showCredit && creditData && (
                <div className="absolute bottom-10 left-2 right-2 rounded-lg bg-black/90 p-3 text-xs text-white animate-fade-in">
                  <div className="space-y-1">
                    <p>
                      <span className="text-white/60">著作者:</span>{' '}
                      <span className="font-medium">{creditData.artistName}</span>
                    </p>
                    <p>
                      <span className="text-white/60">ライセンス:</span>{' '}
                      <a 
                        href={creditData.licenseUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        {creditData.licenseName}
                      </a>
                    </p>
                    <p>
                      <span className="text-white/60">出典:</span>{' '}
                      <a 
                        href={creditData.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        {creditData.sourceName}
                      </a>
                    </p>
                  </div>
                  <p className="mt-2 text-[10px] text-white/50">
                    この画像はフリーライセンスで提供されています
                  </p>
                </div>
              )}
            </>
          ) : imageLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary">
              <div className="text-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="mt-2 text-xs text-muted-foreground">画像を読み込み中...</p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Sunrise className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-primary-foreground opacity-50" />
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm font-medium text-primary-foreground/80">
                  🌅 日の出撮影スポット
                </p>
              </div>
            </div>
          )}
          
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

          {/* 2026年元日の日の出情報 */}
          <div className="mt-3 sm:mt-4 rounded-lg bg-linear-to-br from-orange-500/20 via-yellow-500/20 to-red-500/20 p-3 sm:p-4 border border-orange-500/30 animate-pulse-slow">
            <div className="flex items-center gap-2 mb-2">
              <div className="relative">
                <Sunrise className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500 animate-bounce-slow" />
                <div className="absolute inset-0 h-5 w-5 sm:h-6 sm:w-6 bg-orange-500/30 rounded-full animate-ping" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-orange-600 dark:text-orange-400">
                🎌 2026年 元日の日の出
              </h3>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
                {station.sunriseTime2026}
              </p>
              <span className="text-sm text-muted-foreground">頃</span>
            </div>
            
            {station.lastTrainArrival && station.waitTimeToSunrise && (
              <div className="mt-3 pt-3 border-t border-orange-500/20">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">終電から日の出まで:</span>
                  <span className="font-bold text-foreground">
                    {formatWaitTime(station.waitTimeToSunrise)}
                  </span>
                </div>
                <p className="mt-2 text-[10px] sm:text-xs text-muted-foreground italic">
                  💡 {station.waitTimeToSunrise.hours >= 6 ? "防寒対策をしっかりと！" : "比較的短い待機時間です"}
                </p>
              </div>
            )}
          </div>

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
