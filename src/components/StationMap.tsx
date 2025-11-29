'use client'

import { useEffect, useState, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// GeoJSON型定義
interface StationProperties {
  N02_003: string // 路線名
  N02_004: string // 事業者名
  N02_005: string // 駅名
  distance_km_from_tokyo: number
  distance_to_ese_coast_km: number
  last_train_arrival?: string // 最終列車到着時刻
  last_train_info?: string // 最終列車情報
}

interface StationFeature {
  type: 'Feature'
  properties: StationProperties
  geometry: {
    type: 'LineString'
    coordinates: number[][]
  }
}

interface StationGeoJSON {
  type: 'FeatureCollection'
  features: StationFeature[]
}

// レンタカー営業所の型定義
interface RentalCarProperties {
  office_id: string
  address: string
  prefecture: string
  city: string
  passenger_car_count: number
  owned_vehicles_total: number
  nearest_station: string
  nearest_station_operator: string
  nearest_station_line: string
  distance_to_station_km: number
}

interface RentalCarFeature {
  type: 'Feature'
  properties: RentalCarProperties
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
}

interface RentalCarGeoJSON {
  type: 'FeatureCollection'
  features: RentalCarFeature[]
}

export default function StationMap() {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [selectedStation, setSelectedStation] = useState<StationProperties | null>(null)
  const [stationData, setStationData] = useState<StationGeoJSON | null>(null)
  const [rentalCarData, setRentalCarData] = useState<RentalCarGeoJSON | null>(null)
  const [stationCount, setStationCount] = useState(0)
  const [rentalCarCount, setRentalCarCount] = useState(0)

  // GeoJSONデータを読み込む
  useEffect(() => {
    // 駅データを読み込み（最終列車情報付き）
    fetch('/data/stations_with_last_train.geojson')
      .then((res) => res.json())
      .then((data: StationGeoJSON) => {
        setStationData(data)
        setStationCount(data.features.length)
      })
      .catch((err) => console.error('Failed to load station data:', err))

    // レンタカー営業所データを読み込み
    fetch('/data/rental_car_offices_near_stations.geojson')
      .then((res) => res.json())
      .then((data: RentalCarGeoJSON) => {
        setRentalCarData(data)
        setRentalCarCount(data.features.length)
      })
      .catch((err) => console.error('Failed to load rental car data:', err))
  }, [])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !stationData) return

    // 東京駅周辺を中心に設定（関東地方全体が見える）
    const map = L.map(mapContainerRef.current, {
      center: [35.5, 139.8],
      zoom: 9,
      minZoom: 6,
      maxZoom: 18,
    })

    mapRef.current = map

    // 国土地理院 沿岸海域土地条件図タイルレイヤー
    const gsiCoastalLayer = L.tileLayer(
      'https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png',
      {
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
        maxZoom: 18,
        opacity: 1.0,
      }
    )

    // 標準地図（沿岸海域土地条件図がない地域のフォールバック用）
    const gsiStandardLayer = L.tileLayer(
      'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',
      {
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
        maxZoom: 18,
        opacity: 0.7,
      }
    )

    // 標準地図をベースとして追加し、その上に沿岸海域土地条件図を重ねる
    gsiStandardLayer.addTo(map)
    gsiCoastalLayer.addTo(map)

    // 駅データをマップに追加
    stationData.features.forEach((feature) => {
      const coords = feature.geometry.coordinates
      // LineStringの中心点を計算
      const centerIndex = Math.floor(coords.length / 2)
      const centerCoord = coords[centerIndex]
      const lat = centerCoord[1]
      const lng = centerCoord[0]

      // 沿岸からの距離に応じて色を変更
      const distance = feature.properties.distance_to_ese_coast_km
      let color: string
      if (distance < 0.5) {
        color = '#ff0000' // 0.5km未満: 赤
      } else if (distance < 1.0) {
        color = '#ff8800' // 0.5-1km: オレンジ
      } else if (distance < 1.5) {
        color = '#ffcc00' // 1-1.5km: 黄色
      } else {
        color = '#00aa00' // 1.5km以上: 緑
      }

      // 円マーカーを作成
      const marker = L.circleMarker([lat, lng], {
        radius: 6,
        fillColor: color,
        color: '#333',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8,
      })

      // ポップアップを追加
      const lastTrainInfo = feature.properties.last_train_arrival
        ? `<hr style="margin: 8px 0; border: none; border-top: 1px solid #ddd;" />
           <p style="margin: 4px 0; color: #dc2626;"><strong>🌅 最終到着:</strong> <span style="font-size: 18px; font-weight: bold;">${feature.properties.last_train_arrival}</span></p>
           <p style="margin: 4px 0; font-size: 12px; color: #666;">${feature.properties.last_train_info || ''}</p>`
        : ''
      
      marker.bindPopup(`
        <div style="min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${feature.properties.N02_005}</h3>
          <p style="margin: 4px 0;"><strong>事業者:</strong> ${feature.properties.N02_004}</p>
          <p style="margin: 4px 0;"><strong>路線名:</strong> ${feature.properties.N02_003}</p>
          <p style="margin: 4px 0;"><strong>東京駅からの距離:</strong> ${feature.properties.distance_km_from_tokyo.toFixed(1)} km</p>
          <p style="margin: 4px 0;"><strong>沿岸からの距離:</strong> ${feature.properties.distance_to_ese_coast_km.toFixed(2)} km</p>
          ${lastTrainInfo}
        </div>
      `)

      // クリックイベント
      marker.on('click', () => {
        setSelectedStation(feature.properties)
      })

      marker.addTo(map)
    })

    // レンタカー営業所データをマップに追加
    if (rentalCarData) {
      rentalCarData.features.forEach((feature) => {
        const coords = feature.geometry.coordinates
        const lat = coords[1]
        const lng = coords[0]

        // カスタムアイコン（車のマーカー）
        const carIcon = L.divIcon({
          html: `<div style="
            background-color: #3b82f6;
            border: 2px solid #1d4ed8;
            border-radius: 4px;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">🚗</div>`,
          className: 'rental-car-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        })

        const marker = L.marker([lat, lng], { icon: carIcon })

        // ポップアップを追加
        marker.bindPopup(`
          <div style="min-width: 220px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #1d4ed8;">🚗 レンタカー営業所</h3>
            <p style="margin: 4px 0;"><strong>住所:</strong> ${feature.properties.address || '不明'}</p>
            <p style="margin: 4px 0;"><strong>乗用車保有台数:</strong> <span style="color: #dc2626; font-weight: bold;">${feature.properties.passenger_car_count}台</span></p>
            <p style="margin: 4px 0;"><strong>総保有車両:</strong> ${feature.properties.owned_vehicles_total}台</p>
            <hr style="margin: 8px 0; border: none; border-top: 1px solid #ddd;" />
            <p style="margin: 4px 0; font-size: 12px;"><strong>最寄り駅:</strong> ${feature.properties.nearest_station}</p>
            <p style="margin: 4px 0; font-size: 12px;"><strong>路線:</strong> ${feature.properties.nearest_station_line}</p>
            <p style="margin: 4px 0; font-size: 12px;"><strong>駅までの距離:</strong> ${feature.properties.distance_to_station_km.toFixed(2)} km</p>
          </div>
        `)

        marker.addTo(map)
      })
    }

    // クリーンアップ
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [stationData, rentalCarData])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* 凡例 */}
      <div className="absolute top-4 right-4 bg-white/95 p-4 rounded-lg shadow-lg z-[1000]">
        <h3 className="font-bold text-sm mb-2">沿岸からの距離（駅）</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#ff0000] border border-gray-400" />
            <span>0.5km未満</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#ff8800] border border-gray-400" />
            <span>0.5〜1km</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#ffcc00] border border-gray-400" />
            <span>1〜1.5km</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#00aa00] border border-gray-400" />
            <span>1.5km以上</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200">
          <h3 className="font-bold text-sm mb-2">レンタカー営業所</h3>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-5 h-5 bg-blue-500 border-2 border-blue-700 rounded flex items-center justify-center text-xs">🚗</div>
            <span>駅から1km以内</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
          <p>駅数: {stationCount}</p>
          <p>レンタカー営業所: {rentalCarCount}件</p>
          <p className="mt-1 text-gray-500">※最終列車はJR東日本データのみ</p>
        </div>
      </div>

      {/* タイトル */}
      <div className="absolute top-4 left-4 bg-white/95 p-3 rounded-lg shadow-lg z-[1000]">
        <h1 className="font-bold text-lg">🌅 日の出撮影スポット駅マップ</h1>
        <p className="text-xs text-gray-600 mt-1">
          東京駅から200km以内・沿岸2km以内
        </p>
        <p className="text-xs text-gray-500 mt-1">
          最終電車で到着→朝まで待機→日の出撮影
        </p>
        <p className="text-xs text-gray-400 mt-1">
          地図: 国土地理院 沿岸海域土地条件図
        </p>
      </div>

      {/* 選択された駅の情報 */}
      {selectedStation && (
        <div className="absolute bottom-20 left-4 bg-white/95 p-4 rounded-lg shadow-lg z-[1000] max-w-xs">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-lg">{selectedStation.N02_005}</h3>
            <button
              onClick={() => setSelectedStation(null)}
              className="text-gray-500 hover:text-gray-700 ml-2"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">{selectedStation.N02_004}</p>
          <p className="text-sm text-gray-600">{selectedStation.N02_003}</p>
          <div className="mt-2 pt-2 border-t border-gray-200 text-sm">
            <p>東京駅から: {selectedStation.distance_km_from_tokyo.toFixed(1)} km</p>
            <p>沿岸から: {selectedStation.distance_to_ese_coast_km.toFixed(2)} km</p>
          </div>
          {selectedStation.last_train_arrival && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-red-600 font-bold">
                🌅 最終到着: <span className="text-xl">{selectedStation.last_train_arrival}</span>
              </p>
              {selectedStation.last_train_info && (
                <p className="text-xs text-gray-500 mt-1">{selectedStation.last_train_info}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 出典情報 */}
      <div className="absolute bottom-2 left-2 bg-white/90 px-3 py-2 rounded shadow z-[1000] text-xs text-gray-700">
        <p>
          出典：
          <a 
            href="https://maps.gsi.go.jp/development/ichiran.html" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            国土地理院ウェブサイト
          </a>
          （地理院タイル）を加工して作成
        </p>
        <p className="mt-1">
          鉄道データ：
          <a 
            href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-v3_1.html" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            国土数値情報（鉄道データ）
          </a>
          を加工して作成
        </p>
        <p className="mt-1">
          時刻表データ：
          <a 
            href="https://developer.odpt.org/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            公共交通オープンデータセンター
          </a>
          （JR東日本）
        </p>
      </div>
    </div>
  )
}
