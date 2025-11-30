// 駅のプロパティ型（GeoJSONから読み込む生データ）
export interface StationProperties {
  N02_003: string // 路線名
  N02_004: string // 事業者名
  N02_005: string // 駅名
  distance_km_from_tokyo: number
  distance_to_ese_coast_km: number
  last_train_arrival?: string // 最終列車到着時刻
  last_train_info?: string // 最終列車情報
}

// アプリ内で使用する駅データ型
export interface Station {
  id: number
  name: string // 駅名
  operator: string // 事業者名
  line: string // 路線名
  lat: number
  lng: number
  distanceFromTokyo: number // 東京駅からの距離(km)
  distanceToCoast: number // 沿岸からの距離(km)
  lastTrainArrival?: string // 最終列車到着時刻
  lastTrainInfo?: string // 最終列車情報
}

// GeoJSON Feature型
export interface StationFeature {
  type: 'Feature'
  properties: StationProperties
  geometry: {
    type: 'LineString'
    coordinates: number[][]
  }
}

// GeoJSON FeatureCollection型
export interface StationGeoJSON {
  type: 'FeatureCollection'
  features: StationFeature[]
}

// GeoJSONのfeatureをStation型に変換する関数
export function convertFeatureToStation(feature: StationFeature, index: number): Station {
  const coords = feature.geometry.coordinates
  const centerIndex = Math.floor(coords.length / 2)
  const centerCoord = coords[centerIndex]
  
  return {
    id: index + 1,
    name: feature.properties.N02_005,
    operator: feature.properties.N02_004,
    line: feature.properties.N02_003,
    lat: centerCoord[1],
    lng: centerCoord[0],
    distanceFromTokyo: feature.properties.distance_km_from_tokyo,
    distanceToCoast: feature.properties.distance_to_ese_coast_km,
    lastTrainArrival: feature.properties.last_train_arrival,
    lastTrainInfo: feature.properties.last_train_info,
  }
}

// 沿岸からの距離に応じてカテゴリを返す
export function getDistanceCategory(distance: number): string {
  if (distance < 0.5) return '極近'
  if (distance < 1.0) return '近い'
  if (distance < 1.5) return '普通'
  return '遠め'
}

// 沿岸からの距離に応じた色を返す
export function getDistanceColor(distance: number): string {
  if (distance < 0.5) return '#ff0000'
  if (distance < 1.0) return '#ff8800'
  if (distance < 1.5) return '#ffcc00'
  return '#00aa00'
}
