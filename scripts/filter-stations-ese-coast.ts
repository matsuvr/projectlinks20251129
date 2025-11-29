/**
 * 東京から200km以内の駅のうち、
 * 東南東（112.5度）方向に2km以内に海岸線がある駅を抽出するスクリプト
 */

import * as turf from '@turf/turf';
import * as shapefile from 'shapefile';
import * as fs from 'fs';
import * as path from 'path';
import type { Feature, Point, LineString, MultiLineString, FeatureCollection } from 'geojson';

// 定数
const BEARING_ESE = 112.5; // 東南東の方位角（北を0度、時計回り）
const MAX_DISTANCE_KM = 2; // 海岸線までの最大距離
const RAY_LENGTH_KM = 10; // レイの長さ（2km以上であれば十分）

// 海岸線シェープファイルのパス
const COASTLINE_DIRS = [
  'coast-line/C23-06_08_GML', // 茨城
  'coast-line/C23-06_12_GML', // 千葉
  'coast-line/C23-06_13_GML', // 東京
  'coast-line/C23-06_14_GML', // 神奈川
];

// 入力・出力ファイルパス
const INPUT_STATIONS = 'station-data/N02-22_Station_tokyo_200km.geojson';
const OUTPUT_STATIONS = 'station-data/N02-22_Station_ese_coast_2km.geojson';

interface StationFeature {
  type: 'Feature';
  properties: {
    N02_001: string;
    N02_002: string;
    N02_003: string; // 路線名
    N02_004: string; // 事業者名
    N02_005: string; // 駅名
    N02_005c: string;
    N02_005g: string;
    distance_km_from_tokyo: number;
    distance_to_ese_coast_km?: number; // 追加するプロパティ
  };
  geometry: {
    type: 'LineString';
    coordinates: number[][];
  };
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  name?: string;
  features: StationFeature[];
}

/**
 * 駅のジオメトリ（LineString）から中心点を取得
 */
function getStationCenter(station: StationFeature): Feature<Point> {
  const coords = station.geometry.coordinates;
  // LineStringの中点を計算
  const midIndex = Math.floor(coords.length / 2);
  const [lon, lat] = coords[midIndex];
  return turf.point([lon, lat]);
}

/**
 * 全ての海岸線データを読み込んでマージ
 */
async function loadAllCoastlines(basePath: string): Promise<Feature<LineString | MultiLineString>[]> {
  const allFeatures: Feature<LineString | MultiLineString>[] = [];
  
  for (const dir of COASTLINE_DIRS) {
    const dirPath = path.join(basePath, dir);
    const files = fs.readdirSync(dirPath);
    const shpFile = files.find(f => f.endsWith('.shp'));
    
    if (!shpFile) {
      console.warn(`シェープファイルが見つかりません: ${dirPath}`);
      continue;
    }
    
    const shpPath = path.join(dirPath, shpFile);
    console.log(`読み込み中: ${shpPath}`);
    
    try {
      const geojson = await shapefile.read(shpPath);
      const features = geojson.features as Feature<LineString | MultiLineString>[];
      allFeatures.push(...features);
      console.log(`  -> ${features.length} 件の海岸線データを読み込み`);
    } catch (error) {
      console.error(`エラー: ${shpPath} の読み込みに失敗:`, error);
    }
  }
  
  console.log(`合計 ${allFeatures.length} 件の海岸線データを読み込みました\n`);
  return allFeatures;
}

/**
 * 指定した地点から東南東方向に海岸線までの距離を計算
 * @returns 海岸線までの距離（km）。見つからない場合はnull
 */
function calculateDistanceToCoastESE(
  stationPoint: Feature<Point>,
  coastlineFeatures: Feature<LineString | MultiLineString>[]
): number | null {
  // 東南東へ伸びるレイ（線分）を作成
  const endPt = turf.destination(stationPoint, RAY_LENGTH_KM, BEARING_ESE);
  const rayLine = turf.lineString([
    stationPoint.geometry.coordinates,
    endPt.geometry.coordinates
  ]);
  
  let minDistance: number | null = null;
  
  // すべての海岸線に対して交差判定
  for (const coastFeature of coastlineFeatures) {
    try {
      const intersects = turf.lineIntersect(rayLine, coastFeature);
      
      if (intersects.features.length > 0) {
        for (const intersectPt of intersects.features) {
          const dist = turf.distance(stationPoint, intersectPt);
          
          if (minDistance === null || dist < minDistance) {
            minDistance = dist;
          }
        }
      }
    } catch (error) {
      // 一部のジオメトリでエラーが出る場合はスキップ
      continue;
    }
  }
  
  return minDistance;
}

async function main() {
  const basePath = process.cwd();
  
  console.log('=== 東南東方向に海岸線がある駅の抽出 ===\n');
  console.log(`方位角: ${BEARING_ESE}度（東南東）`);
  console.log(`最大距離: ${MAX_DISTANCE_KM}km\n`);
  
  // 海岸線データの読み込み
  const coastlineFeatures = await loadAllCoastlines(basePath);
  
  if (coastlineFeatures.length === 0) {
    console.error('海岸線データが読み込めませんでした');
    process.exit(1);
  }
  
  // 駅データの読み込み
  const stationsPath = path.join(basePath, INPUT_STATIONS);
  console.log(`駅データを読み込み中: ${stationsPath}`);
  const stationsData: GeoJSONFeatureCollection = JSON.parse(
    fs.readFileSync(stationsPath, 'utf-8')
  );
  console.log(`${stationsData.features.length} 件の駅データを読み込みました\n`);
  
  // フィルタリング処理
  console.log('フィルタリング処理を開始...\n');
  const filteredStations: StationFeature[] = [];
  let processedCount = 0;
  
  for (const station of stationsData.features) {
    processedCount++;
    
    // 進捗表示（100件ごと）
    if (processedCount % 100 === 0) {
      console.log(`処理中: ${processedCount}/${stationsData.features.length} 件`);
    }
    
    // 駅の中心点を取得
    const stationCenter = getStationCenter(station);
    
    // 東南東方向の海岸線までの距離を計算
    const distanceToCoast = calculateDistanceToCoastESE(stationCenter, coastlineFeatures);
    
    // 2km以内に海岸線がある場合は結果に追加
    if (distanceToCoast !== null && distanceToCoast <= MAX_DISTANCE_KM) {
      // 距離情報を追加
      const stationWithDistance: StationFeature = {
        ...station,
        properties: {
          ...station.properties,
          distance_to_ese_coast_km: Math.round(distanceToCoast * 1000) / 1000 // 小数点3桁
        }
      };
      filteredStations.push(stationWithDistance);
      
      console.log(`✓ ${station.properties.N02_005} (${station.properties.N02_003}) - 海岸線まで ${distanceToCoast.toFixed(3)} km`);
    }
  }
  
  console.log(`\n処理完了: ${processedCount} 件中 ${filteredStations.length} 件が条件に一致\n`);
  
  // 結果をGeoJSONとして保存
  const outputData: GeoJSONFeatureCollection = {
    type: 'FeatureCollection',
    name: 'N02-22_Station_ESE_Coast_2km',
    features: filteredStations
  };
  
  const outputPath = path.join(basePath, OUTPUT_STATIONS);
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
  console.log(`結果を保存しました: ${outputPath}`);
  
  // サマリーを表示
  console.log('\n=== 結果サマリー ===');
  console.log(`条件に一致した駅数: ${filteredStations.length}`);
  
  if (filteredStations.length > 0) {
    // 路線ごとにグループ化
    const byLine: Record<string, StationFeature[]> = {};
    for (const station of filteredStations) {
      const lineName = station.properties.N02_003;
      if (!byLine[lineName]) {
        byLine[lineName] = [];
      }
      byLine[lineName].push(station);
    }
    
    console.log('\n路線別の駅数:');
    for (const [lineName, stations] of Object.entries(byLine).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${lineName}: ${stations.length} 駅`);
    }
    
    // 距離順にソートして上位10件を表示
    const sortedByDistance = [...filteredStations].sort(
      (a, b) => (a.properties.distance_to_ese_coast_km ?? 999) - (b.properties.distance_to_ese_coast_km ?? 999)
    );
    
    console.log('\n海岸線に最も近い駅（上位10件）:');
    for (const station of sortedByDistance.slice(0, 10)) {
      console.log(`  ${station.properties.N02_005} (${station.properties.N02_003}) - ${station.properties.distance_to_ese_coast_km} km`);
    }
  }
}

main().catch(console.error);
