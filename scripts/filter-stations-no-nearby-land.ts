/**
 * 駅から東南東（112.5度）方向に海岸線を超えた後、
 * 5km以内に再び陸地（別の海岸線）が現れる駅を除外するスクリプト
 * 
 * ロジック：
 * 1. 駅から東南東方向にレイを伸ばす
 * 2. 最初の海岸線交点を見つける（= 海に出るポイント）
 * 3. その交点から先、5km以内に再び海岸線と交差するか確認
 * 4. 再び交差する場合は対岸に陸地があると判断して除外
 */

import * as turf from '@turf/turf';
import * as shapefile from 'shapefile';
import * as fs from 'fs';
import * as path from 'path';
import type { Feature, Point, LineString, MultiLineString } from 'geojson';

// 定数
const BEARING_ESE = 112.5; // 東南東の方位角（北を0度、時計回り）
const NEARBY_LAND_DISTANCE_KM = 5; // 対岸の陸地を検出する距離
const RAY_LENGTH_KM = 50; // レイの長さ（十分な距離）

// 海岸線シェープファイルのパス
const COASTLINE_DIRS = [
  'coast-line/C23-06_08_GML', // 茨城
  'coast-line/C23-06_12_GML', // 千葉
  'coast-line/C23-06_13_GML', // 東京
  'coast-line/C23-06_14_GML', // 神奈川
];

// 入力・出力ファイルパス
const INPUT_STATIONS = 'station-data/N02-22_Station_ese_coast_2km.geojson';
const OUTPUT_STATIONS = 'station-data/N02-22_Station_ese_coast_open_sea.geojson';
const OUTPUT_PUBLIC = 'public/data/N02-22_Station_ese_coast_open_sea.geojson';

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
    distance_to_ese_coast_km?: number;
    has_nearby_land_beyond_coast?: boolean; // 追加するプロパティ
    distance_to_nearby_land_km?: number; // 対岸の陸地までの距離
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

interface CoastlineIntersection {
  point: Feature<Point>;
  distance: number;
}

/**
 * 駅のジオメトリ（LineString）から中心点を取得
 */
function getStationCenter(station: StationFeature): Feature<Point> {
  const coords = station.geometry.coordinates;
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
 * 指定した地点から東南東方向にレイを伸ばし、全ての海岸線交点を取得
 * 距離順でソートして返す
 */
function getAllCoastlineIntersections(
  startPoint: Feature<Point>,
  coastlineFeatures: Feature<LineString | MultiLineString>[],
  rayLengthKm: number
): CoastlineIntersection[] {
  // 東南東へ伸びるレイ（線分）を作成
  const endPt = turf.destination(startPoint, rayLengthKm, BEARING_ESE);
  const rayLine = turf.lineString([
    startPoint.geometry.coordinates,
    endPt.geometry.coordinates
  ]);
  
  const intersections: CoastlineIntersection[] = [];
  
  // すべての海岸線に対して交差判定
  for (const coastFeature of coastlineFeatures) {
    try {
      const intersects = turf.lineIntersect(rayLine, coastFeature);
      
      for (const intersectPt of intersects.features) {
        const dist = turf.distance(startPoint, intersectPt);
        intersections.push({
          point: intersectPt as Feature<Point>,
          distance: dist
        });
      }
    } catch (error) {
      // 一部のジオメトリでエラーが出る場合はスキップ
      continue;
    }
  }
  
  // 距離順にソート
  intersections.sort((a, b) => a.distance - b.distance);
  
  return intersections;
}

/**
 * 駅から東南東方向に進んで、海を超えた後5km以内に再び陸地があるかチェック
 * @returns { hasNearbyLand: boolean, distanceToNearbyLand: number | null }
 */
function checkNearbyLandBeyondCoast(
  stationPoint: Feature<Point>,
  coastlineFeatures: Feature<LineString | MultiLineString>[]
): { hasNearbyLand: boolean; distanceToNearbyLand: number | null } {
  // 全ての海岸線交点を取得
  const intersections = getAllCoastlineIntersections(stationPoint, coastlineFeatures, RAY_LENGTH_KM);
  
  if (intersections.length < 1) {
    // 海岸線と交差しない場合（既にフィルタリング済みなので通常は発生しない）
    return { hasNearbyLand: false, distanceToNearbyLand: null };
  }
  
  // 最初の交点（海に出るポイント）
  const firstIntersection = intersections[0];
  
  // 2番目以降の交点（対岸の陸地）をチェック
  if (intersections.length >= 2) {
    const secondIntersection = intersections[1];
    
    // 最初の交点から2番目の交点までの距離
    const distanceBetween = secondIntersection.distance - firstIntersection.distance;
    
    if (distanceBetween <= NEARBY_LAND_DISTANCE_KM) {
      // 5km以内に再び陸地がある
      return {
        hasNearbyLand: true,
        distanceToNearbyLand: Math.round(distanceBetween * 1000) / 1000
      };
    }
  }
  
  // 5km以内に対岸の陸地はない
  return { hasNearbyLand: false, distanceToNearbyLand: null };
}

async function main() {
  const basePath = process.cwd();
  
  console.log('=== 対岸に陸地がある駅を除外するフィルタリング ===\n');
  console.log(`方位角: ${BEARING_ESE}度（東南東）`);
  console.log(`対岸の陸地検出距離: ${NEARBY_LAND_DISTANCE_KM}km\n`);
  
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
  const excludedStations: StationFeature[] = [];
  let processedCount = 0;
  
  for (const station of stationsData.features) {
    processedCount++;
    
    // 進捗表示（50件ごと）
    if (processedCount % 50 === 0) {
      console.log(`処理中: ${processedCount}/${stationsData.features.length} 件`);
    }
    
    // 駅の中心点を取得
    const stationCenter = getStationCenter(station);
    
    // 対岸に陸地があるかチェック
    const { hasNearbyLand, distanceToNearbyLand } = checkNearbyLandBeyondCoast(stationCenter, coastlineFeatures);
    
    if (hasNearbyLand) {
      // 対岸に陸地がある → 除外
      console.log(`✗ 除外: ${station.properties.N02_005} (${station.properties.N02_003}) - 対岸まで ${distanceToNearbyLand} km`);
      excludedStations.push({
        ...station,
        properties: {
          ...station.properties,
          has_nearby_land_beyond_coast: true,
          distance_to_nearby_land_km: distanceToNearbyLand ?? undefined
        }
      });
    } else {
      // 対岸に陸地がない → 残す
      console.log(`✓ 残す: ${station.properties.N02_005} (${station.properties.N02_003}) - 開けた海`);
      filteredStations.push(station);
    }
  }
  
  console.log(`\n処理完了: ${processedCount} 件中 ${filteredStations.length} 件が条件に一致（${excludedStations.length} 件除外）\n`);
  
  // 結果をGeoJSONとして保存
  const outputData: GeoJSONFeatureCollection = {
    type: 'FeatureCollection',
    name: 'N02-22_Station_ESE_Coast_Open_Sea',
    features: filteredStations
  };
  
  // station-data に保存
  const outputPath = path.join(basePath, OUTPUT_STATIONS);
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
  console.log(`結果を保存しました: ${outputPath}`);
  
  // public/data にもコピー
  const outputPublicPath = path.join(basePath, OUTPUT_PUBLIC);
  fs.writeFileSync(outputPublicPath, JSON.stringify(outputData, null, 2), 'utf-8');
  console.log(`結果を保存しました: ${outputPublicPath}`);
  
  // サマリーを表示
  console.log('\n=== 結果サマリー ===');
  console.log(`入力駅数: ${stationsData.features.length}`);
  console.log(`残った駅数: ${filteredStations.length}`);
  console.log(`除外された駅数: ${excludedStations.length}`);
  
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
    
    console.log('\n残った駅（路線別）:');
    for (const [lineName, stations] of Object.entries(byLine).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${lineName}: ${stations.length} 駅`);
      for (const s of stations) {
        console.log(`    - ${s.properties.N02_005} (海岸まで ${s.properties.distance_to_ese_coast_km} km)`);
      }
    }
  }
  
  if (excludedStations.length > 0) {
    console.log('\n除外された駅（対岸に陸地あり）:');
    // 路線ごとにグループ化
    const byLineExcluded: Record<string, StationFeature[]> = {};
    for (const station of excludedStations) {
      const lineName = station.properties.N02_003;
      if (!byLineExcluded[lineName]) {
        byLineExcluded[lineName] = [];
      }
      byLineExcluded[lineName].push(station);
    }
    
    for (const [lineName, stations] of Object.entries(byLineExcluded).sort((a, b) => b[1].length - a[1].length).slice(0, 10)) {
      console.log(`  ${lineName}: ${stations.length} 駅`);
      for (const s of stations.slice(0, 5)) {
        console.log(`    - ${s.properties.N02_005} (対岸まで ${s.properties.distance_to_nearby_land_km} km)`);
      }
      if (stations.length > 5) {
        console.log(`    ... 他 ${stations.length - 5} 駅`);
      }
    }
  }
}

main().catch(console.error);
