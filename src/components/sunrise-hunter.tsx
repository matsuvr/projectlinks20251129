"use client"

import { useState, useEffect } from "react"
import { Header } from "./header"
import { MapView } from "./map-view"
import { StationDetail } from "./station-detail"
import { StationList } from "./station-list"
import type { Station, StationGeoJSON } from "@/lib/stations"
import { convertFeatureToStation } from "@/lib/stations"

export function SunriseHunter() {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true) // デフォルトで開く
  const [stations, setStations] = useState<Station[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // GeoJSONデータをS3から読み込み
  useEffect(() => {
    fetch('https://project-links.s3.us-east-1.amazonaws.com/N02-22_Station_ese_coast_open_sea_with_trains.geojson')
      .then((res) => res.json())
      .then((data: StationGeoJSON) => {
        const convertedStations = data.features.map((feature, index) => 
          convertFeatureToStation(feature, index)
        )
        setStations(convertedStations)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load station data:', err)
        setIsLoading(false)
      })
  }, [])

  const handleStationSelect = (station: Station) => {
    setSelectedStation(station)
    setIsDetailOpen(true)
    // モバイルでサイドバーを閉じる
    setIsSidebarOpen(false)
  }

  const handleCloseDetail = () => {
    setIsDetailOpen(false)
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center animate-fade-in">
          <div className="relative mb-4 inline-block">
            <span className="text-6xl animate-bounce-slow">🌅</span>
            <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-xl animate-pulse-slow" />
          </div>
          <p className="text-lg text-foreground font-bold">地図を読み込み中...</p>
          <p className="text-sm text-muted-foreground mt-2">2026年元日の日の出撮影スポットを準備しています</p>
          <div className="mt-4 flex justify-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header
        stationCount={stations.length}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />

      <div className="relative flex flex-1 overflow-hidden">
        {/* Sidebar - デスクトップでは常に表示 */}
        <aside
          className={`absolute left-0 top-0 z-20 h-full w-72 sm:w-80 transform bg-card transition-transform duration-300 ease-in-out md:relative md:z-0 md:transform-none ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <StationList stations={stations} selectedStation={selectedStation} onStationSelect={handleStationSelect} />
        </aside>

        {/* Map */}
        <main className="relative flex-1">
          <MapView stations={stations} onStationSelect={handleStationSelect} selectedStation={selectedStation} />

          {/* Station Detail Overlay */}
          <StationDetail station={selectedStation} isOpen={isDetailOpen} onClose={handleCloseDetail} />
        </main>

        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div className="absolute inset-0 z-10 bg-black/50 md:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}
      </div>
    </div>
  )
}
