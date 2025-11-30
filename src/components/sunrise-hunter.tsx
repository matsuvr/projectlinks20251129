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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [stations, setStations] = useState<Station[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // GeoJSONデータを読み込み
  useEffect(() => {
    fetch('/data/stations_with_last_train.geojson')
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
        <div className="text-center">
          <div className="mb-4 text-4xl">🌅</div>
          <p className="text-lg text-foreground">地図を読み込み中...</p>
          <p className="text-sm text-muted-foreground mt-2">日の出撮影スポットを準備しています</p>
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
        {/* Sidebar */}
        <aside
          className={`absolute left-0 top-0 z-20 h-full w-72 sm:w-80 transform bg-card transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
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
