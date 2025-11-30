"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import { Plus, Minus, Locate } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Station } from "@/lib/stations"
import { getDistanceColor } from "@/lib/stations"

interface MapViewProps {
  stations: Station[]
  onStationSelect: (station: Station) => void
  selectedStation: Station | null
}

// 関東地方中心（沿岸エリアを重視）
const KANTO_CENTER = { lat: 35.4, lng: 140.0 }
const INITIAL_ZOOM = 9

// タッチポイント間の距離を計算
const getTouchDistance = (touches: React.TouchList) => {
  if (touches.length < 2) return 0
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

// タッチポイントの中心を計算
const getTouchCenter = (touches: React.TouchList) => {
  if (touches.length < 2) {
    return { x: touches[0].clientX, y: touches[0].clientY }
  }
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  }
}

export function MapView({ stations, onStationSelect, selectedStation }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(INITIAL_ZOOM)
  const [center, setCenter] = useState(KANTO_CENTER)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef<{ x: number; y: number; lat: number; lng: number } | null>(null)
  
  // ピンチズーム用の状態
  const pinchState = useRef<{
    initialDistance: number
    initialZoom: number
    centerX: number
    centerY: number
  } | null>(null)
  const [isPinching, setIsPinching] = useState(false)

  // Convert lat/lng to pixel position
  const latLngToPixel = useCallback(
    (lat: number, lng: number, mapWidth: number, mapHeight: number) => {
      const scale = Math.pow(2, zoom)
      const worldCoordX = ((lng + 180) / 360) * 256 * scale
      const worldCoordY =
        ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
        256 *
        scale

      const centerWorldX = ((center.lng + 180) / 360) * 256 * scale
      const centerWorldY =
        ((1 - Math.log(Math.tan((center.lat * Math.PI) / 180) + 1 / Math.cos((center.lat * Math.PI) / 180)) / Math.PI) /
          2) *
        256 *
        scale

      return {
        x: worldCoordX - centerWorldX + mapWidth / 2,
        y: worldCoordY - centerWorldY + mapHeight / 2,
      }
    },
    [zoom, center],
  )

  // Generate GSI tile URL
  const getTileUrl = (x: number, y: number, z: number) => {
    return `https://cyberjapandata.gsi.go.jp/xyz/std/${z}/${x}/${y}.png`
  }

  // Handle mouse/touch events for dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      lat: center.lat,
      lng: center.lng,
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStart.current || !mapRef.current) return

    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    const scale = Math.pow(2, zoom)

    const dLng = (-dx / (256 * scale)) * 360
    const dLat = (dy / (256 * scale)) * 180

    setCenter({
      lat: Math.max(-85, Math.min(85, dragStart.current.lat + dLat)),
      lng: dragStart.current.lng + dLng,
    })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    dragStart.current = null
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  // タッチイベントハンドラ（ピンチズーム対応）
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // ピンチズーム開始
      e.preventDefault()
      setIsPinching(true)
      setIsDragging(false)
      dragStart.current = null
      
      pinchState.current = {
        initialDistance: getTouchDistance(e.touches),
        initialZoom: zoom,
        centerX: getTouchCenter(e.touches).x,
        centerY: getTouchCenter(e.touches).y,
      }
    } else if (e.touches.length === 1) {
      // シングルタッチでドラッグ
      if (!isPinching) {
        setIsDragging(true)
        dragStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          lat: center.lat,
          lng: center.lng,
        }
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchState.current) {
      // ピンチズーム中
      e.preventDefault()
      const currentDistance = getTouchDistance(e.touches)
      const scale = currentDistance / pinchState.current.initialDistance
      const newZoom = Math.max(5, Math.min(18, pinchState.current.initialZoom + Math.log2(scale)))
      setZoom(Math.round(newZoom * 10) / 10) // 0.1単位で丸める
    } else if (e.touches.length === 1 && isDragging && dragStart.current && !isPinching) {
      // シングルタッチでドラッグ
      const dx = e.touches[0].clientX - dragStart.current.x
      const dy = e.touches[0].clientY - dragStart.current.y
      const scale = Math.pow(2, zoom)

      const dLng = (-dx / (256 * scale)) * 360
      const dLat = (dy / (256 * scale)) * 180

      setCenter({
        lat: Math.max(-85, Math.min(85, dragStart.current.lat + dLat)),
        lng: dragStart.current.lng + dLng,
      })
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      // ピンチズーム終了
      if (isPinching) {
        setIsPinching(false)
        pinchState.current = null
        // ズームを整数に丸める
        setZoom((z) => Math.round(z))
      }
    }
    if (e.touches.length === 0) {
      setIsDragging(false)
      dragStart.current = null
    }
  }

  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -1 : 1
    setZoom((z) => Math.max(5, Math.min(18, z + delta)))
  }

  const handleZoomIn = () => setZoom((z) => Math.min(18, z + 1))
  const handleZoomOut = () => setZoom((z) => Math.max(5, z - 1))
  const handleResetView = () => {
    setCenter(KANTO_CENTER)
    setZoom(INITIAL_ZOOM)
  }

  // Calculate visible tiles
  const [tiles, setTiles] = useState<
    Array<{ x: number; y: number; z: number; url: string; left: number; top: number }>
  >([])

  useEffect(() => {
    if (!mapRef.current) return

    const mapWidth = mapRef.current.offsetWidth
    const mapHeight = mapRef.current.offsetHeight
    const scale = Math.pow(2, zoom)

    const centerTileX = Math.floor(((center.lng + 180) / 360) * scale)
    const centerTileY = Math.floor(
      ((1 - Math.log(Math.tan((center.lat * Math.PI) / 180) + 1 / Math.cos((center.lat * Math.PI) / 180)) / Math.PI) /
        2) *
        scale,
    )

    const tilesX = Math.ceil(mapWidth / 256) + 2
    const tilesY = Math.ceil(mapHeight / 256) + 2

    const newTiles: typeof tiles = []

    for (let dx = -Math.floor(tilesX / 2); dx <= Math.ceil(tilesX / 2); dx++) {
      for (let dy = -Math.floor(tilesY / 2); dy <= Math.ceil(tilesY / 2); dy++) {
        const tileX = centerTileX + dx
        const tileY = centerTileY + dy

        if (tileX < 0 || tileY < 0 || tileX >= scale || tileY >= scale) continue

        const tileWorldX = tileX * 256
        const tileWorldY = tileY * 256

        const centerWorldX = ((center.lng + 180) / 360) * 256 * scale
        const centerWorldY =
          ((1 -
            Math.log(Math.tan((center.lat * Math.PI) / 180) + 1 / Math.cos((center.lat * Math.PI) / 180)) / Math.PI) /
            2) *
          256 *
          scale

        newTiles.push({
          x: tileX,
          y: tileY,
          z: zoom,
          url: getTileUrl(tileX, tileY, zoom),
          left: tileWorldX - centerWorldX + mapWidth / 2,
          top: tileWorldY - centerWorldY + mapHeight / 2,
        })
      }
    }

    setTiles(newTiles)
  }, [center, zoom])

  // Calculate station positions
  const [stationPositions, setStationPositions] = useState<Array<{ station: Station; x: number; y: number }>>([])

  useEffect(() => {
    if (!mapRef.current) return

    const mapWidth = mapRef.current.offsetWidth
    const mapHeight = mapRef.current.offsetHeight

    const positions = stations.map((station) => {
      const { x, y } = latLngToPixel(station.lat, station.lng, mapWidth, mapHeight)
      return { station, x, y }
    })

    setStationPositions(positions)
  }, [stations, center, zoom, latLngToPixel])

  // Center on selected station
  useEffect(() => {
    if (selectedStation) {
      setCenter({ lat: selectedStation.lat, lng: selectedStation.lng })
    }
  }, [selectedStation])

  return (
    <div className="relative h-full w-full overflow-hidden bg-secondary">
      {/* Map Container */}
      <div
        ref={mapRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onWheel={handleWheel}
        style={{ touchAction: "none" }}
      >
        {/* Tiles */}
        {tiles.map((tile) => (
          <img
            key={`${tile.z}-${tile.x}-${tile.y}`}
            src={tile.url || "/placeholder.svg"}
            alt=""
            className="pointer-events-none absolute h-64 w-64 select-none"
            style={{
              left: tile.left,
              top: tile.top,
              width: 256,
              height: 256,
            }}
            draggable={false}
          />
        ))}

        {/* Station Markers */}
        {stationPositions.map(({ station, x, y }) => (
          <button
            key={station.id}
            className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 transform transition-transform hover:scale-110 ${
              selectedStation?.id === station.id ? "scale-125" : ""
            }`}
            style={{ left: x, top: y }}
            onClick={(e) => {
              e.stopPropagation()
              onStationSelect(station)
            }}
          >
            {/* パルスアニメーション（選択時または終電情報ありの駅） */}
            {(selectedStation?.id === station.id || station.lastTrainArrival) && (
              <div
                className="absolute inset-0 -translate-x-1/2 -translate-y-1/2 rounded-full animate-marker-pulse"
                style={{ 
                  backgroundColor: getDistanceColor(station.distanceToCoast),
                  width: '24px',
                  height: '24px',
                  left: '50%',
                  top: '50%',
                }}
              />
            )}
            <div
              className={`relative flex h-6 w-6 items-center justify-center rounded-full shadow-lg ring-2 ring-white ${
                selectedStation?.id === station.id ? "animate-glow" : ""
              }`}
              style={{ backgroundColor: getDistanceColor(station.distanceToCoast) }}
            >
              {station.lastTrainArrival && (
                <span className="text-[8px] font-bold text-white">🌙</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-20 sm:bottom-4 right-2 sm:right-4 z-20 flex flex-col gap-1 sm:gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={handleZoomIn}
          className="h-9 w-9 sm:h-10 sm:w-10 bg-card shadow-lg hover:bg-secondary"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={handleZoomOut}
          className="h-9 w-9 sm:h-10 sm:w-10 bg-card shadow-lg hover:bg-secondary"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={handleResetView}
          className="h-9 w-9 sm:h-10 sm:w-10 bg-card shadow-lg hover:bg-secondary"
        >
          <Locate className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend - モバイルでは折りたたみ可能 */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 rounded-lg bg-card/95 p-2 sm:p-3 shadow-lg backdrop-blur-sm max-w-[140px] sm:max-w-none">
        <h3 className="text-[10px] sm:text-xs font-bold text-foreground mb-1 sm:mb-2">沿岸からの距離</h3>
        <div className="space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-[#ff0000]" />
            <span className="text-muted-foreground">0.5km未満</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-[#ff8800]" />
            <span className="text-muted-foreground">0.5〜1km</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-[#ffcc00]" />
            <span className="text-muted-foreground">1〜1.5km</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-[#00aa00]" />
            <span className="text-muted-foreground">1.5km以上</span>
          </div>
        </div>
        <div className="mt-1 sm:mt-2 pt-1 sm:pt-2 border-t border-border">
          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
            <span>🌙</span>
            <span>終電情報あり</span>
          </div>
        </div>
      </div>

      {/* Zoom Level Indicator - モバイルでは非表示 */}
      <div className="hidden sm:block absolute bottom-4 left-4 z-20 rounded-lg bg-card/90 px-3 py-2 shadow-lg backdrop-blur-sm">
        <p className="text-xs text-muted-foreground">
          ズームレベル: <span className="font-medium text-foreground">{zoom}</span>
        </p>
      </div>

      {/* Attribution */}
      <div className="absolute bottom-2 sm:bottom-4 left-1/2 z-20 -translate-x-1/2 transform rounded-lg bg-card/80 px-2 sm:px-3 py-1 text-[10px] sm:text-xs text-muted-foreground backdrop-blur-sm">
        <span>地図: </span>
        <a 
          href="https://maps.gsi.go.jp/development/ichiran.html" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-primary"
        >
          地理院タイル
        </a>
        <span className="mx-1">|</span>
        <span>写真: </span>
        <a 
          href="https://commons.wikimedia.org/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-primary"
        >
          Wikimedia Commons
        </a>
        <span className="hidden sm:inline"> (CC BY-SA)</span>
      </div>
    </div>
  )
}
