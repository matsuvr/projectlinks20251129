/**
 * 海岸沿いの駅への最終列車到着時刻を抽出するスクリプト
 * 日の出撮影のために、各駅に最後に到達できる時刻を計算します
 */

import * as fs from 'fs';
import * as path from 'path';

// geojsonの日本語駅名とODPTのローマ字駅名のマッピング
// 路線名も含めて正確にマッピング
// operator: 'JREast' | 'Keikyu' で事業者を区別

interface StationMapping {
  romaji: string;
  railway: string;
  operator: 'JREast' | 'Keikyu';
}

const stationNameMapping: Record<string, StationMapping[]> = {
  // 常磐線 (JR東日本)
  '日立': [{ romaji: 'Hitachi', railway: 'Joban', operator: 'JREast' }],
  '常陸多賀': [{ romaji: 'HitachiTaga', railway: 'Joban', operator: 'JREast' }],
  '小木津': [{ romaji: 'Ogitsu', railway: 'Joban', operator: 'JREast' }],
  '南中郷': [{ romaji: 'MinamiNakago', railway: 'Joban', operator: 'JREast' }],
  '磯原': [{ romaji: 'Isohara', railway: 'Joban', operator: 'JREast' }],
  '高萩': [{ romaji: 'Takahagi', railway: 'Joban', operator: 'JREast' }],
  
  // 京葉線 (JR東日本)
  '市川塩浜': [{ romaji: 'Ichikawashiohama', railway: 'Keiyo', operator: 'JREast' }],
  
  // 外房線 (JR東日本) - Sotobo
  '三門': [{ romaji: 'Mikado', railway: 'Sotobo', operator: 'JREast' }],
  '安房鴨川': [
    { romaji: 'AwaKamogawa', railway: 'Sotobo', operator: 'JREast' },
    { romaji: 'AwaKamogawa', railway: 'Uchibo', operator: 'JREast' }
  ],
  '鵜原': [{ romaji: 'Ubara', railway: 'Sotobo', operator: 'JREast' }],
  '行川アイランド': [{ romaji: 'NamegawaIsland', railway: 'Sotobo', operator: 'JREast' }],
  '東浪見': [{ romaji: 'Torami', railway: 'Sotobo', operator: 'JREast' }],
  '浪花': [{ romaji: 'Namihana', railway: 'Sotobo', operator: 'JREast' }],
  '勝浦': [{ romaji: 'Katsuura', railway: 'Sotobo', operator: 'JREast' }],
  '上総興津': [{ romaji: 'KazusaOkitsu', railway: 'Sotobo', operator: 'JREast' }],
  
  // 内房線 (JR東日本) - Uchibo
  '千歳': [{ romaji: 'Chitose', railway: 'Uchibo', operator: 'JREast' }],
  '南三原': [{ romaji: 'Minamihara', railway: 'Uchibo', operator: 'JREast' }],
  '千倉': [{ romaji: 'Chikura', railway: 'Uchibo', operator: 'JREast' }],
  '和田浦': [{ romaji: 'Wadaura', railway: 'Uchibo', operator: 'JREast' }],
  
  // 東海道線 (JR東日本) - Tokaido
  '国府津': [{ romaji: 'Kozu', railway: 'Tokaido', operator: 'JREast' }],
  '大磯': [{ romaji: 'Oiso', railway: 'Tokaido', operator: 'JREast' }],
  '早川': [{ romaji: 'Hayakawa', railway: 'Tokaido', operator: 'JREast' }],
  '二宮': [{ romaji: 'Ninomiya', railway: 'Tokaido', operator: 'JREast' }],
  '小田原': [{ romaji: 'Odawara', railway: 'Tokaido', operator: 'JREast' }],
  '根府川': [{ romaji: 'Nebukawa', railway: 'Tokaido', operator: 'JREast' }],
  '鴨宮': [{ romaji: 'Kamonomiya', railway: 'Tokaido', operator: 'JREast' }],
  '湯河原': [{ romaji: 'Yugawara', railway: 'Tokaido', operator: 'JREast' }],
  '真鶴': [{ romaji: 'Manazuru', railway: 'Tokaido', operator: 'JREast' }],
  
  // 京急久里浜線 (京浜急行電鉄)
  'YRP野比': [{ romaji: 'YrpNobi', railway: 'Kurihama', operator: 'Keikyu' }],
  '津久井浜': [{ romaji: 'Tsukuihama', railway: 'Kurihama', operator: 'Keikyu' }],
  '京急長沢': [{ romaji: 'KeikyuNagasawa', railway: 'Kurihama', operator: 'Keikyu' }],
  '三浦海岸': [{ romaji: 'Miurakaigan', railway: 'Kurihama', operator: 'Keikyu' }],
  
  // 京急空港線 (京浜急行電鉄)
  '羽田空港第1・第2ターミナル': [{ romaji: 'HanedaAirportTerminal1and2', railway: 'Airport', operator: 'Keikyu' }],
  
  // 京急本線 (京浜急行電鉄)
  '浦賀': [{ romaji: 'Uraga', railway: 'Main', operator: 'Keikyu' }],
};

interface StationTimetableObject {
  'odpt:train'?: string;
  'odpt:trainType'?: string;
  'odpt:trainNumber'?: string;
  'odpt:departureTime'?: string;
  'odpt:arrivalTime'?: string;
  'odpt:destinationStation'?: string[];
}

interface StationTimetable {
  '@id': string;
  '@type': string;
  'owl:sameAs': string;
  'odpt:railway': string;
  'odpt:station': string;
  'odpt:calendar': string;
  'odpt:operator': string;
  'odpt:railDirection': string;
  'odpt:stationTimetableObject': StationTimetableObject[];
}

interface GeoJSONFeature {
  type: string;
  properties: {
    N02_001: string;
    N02_002: string;
    N02_003: string; // 路線名
    N02_004: string; // 鉄道事業者
    N02_005: string; // 駅名
    N02_005c: string;
    N02_005g: string;
    distance_km_from_tokyo: number;
    distance_to_ese_coast_km: number;
    last_train_arrival?: string;
    last_train_info?: string;
  };
  geometry: {
    type: string;
    coordinates: number[][] | number[][][];
  };
}

interface GeoJSON {
  type: string;
  name: string;
  features: GeoJSONFeature[];
}

function extractLastTrainTime(timetableObjects: StationTimetableObject[]): { time: string; trainInfo: string } | null {
  if (!timetableObjects || timetableObjects.length === 0) {
    return null;
  }

  // 時刻を時間の数値に変換（深夜帯は24時以降として扱う）
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    // 深夜0-3時は24-27時として扱う
    const adjustedHours = hours < 4 ? hours + 24 : hours;
    return adjustedHours * 60 + minutes;
  };

  // 時刻でソートして最後の時刻を取得
  const sortedTimetables = [...timetableObjects]
    .filter(obj => obj['odpt:departureTime'] || obj['odpt:arrivalTime'])
    .sort((a, b) => {
      const timeA = a['odpt:departureTime'] || a['odpt:arrivalTime'] || '00:00';
      const timeB = b['odpt:departureTime'] || b['odpt:arrivalTime'] || '00:00';
      return parseTime(timeA) - parseTime(timeB);
    });

  if (sortedTimetables.length === 0) {
    return null;
  }

  const lastTrain = sortedTimetables[sortedTimetables.length - 1];
  const lastTime = lastTrain['odpt:departureTime'] || lastTrain['odpt:arrivalTime'] || '';
  const trainType = lastTrain['odpt:trainType']?.split('.').pop() || '';
  const trainNumber = lastTrain['odpt:trainNumber'] || '';
  
  return {
    time: lastTime,
    trainInfo: `${trainType} ${trainNumber}`.trim()
  };
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  
  // GeoJSONファイルを読み込み
  const geojsonPath = path.join(projectRoot, 'station-data/N02-22_Station_ese_coast_open_sea.geojson');
  const geojsonData: GeoJSON = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));
  
  // JR東日本の時刻表データを読み込み（統合ファイル）
  const jreastTimetablePath = path.join(projectRoot, 'train-timetables/odpt_StationTimetable-jreast-combined.json');
  const jreastTimetableData: StationTimetable[] = JSON.parse(fs.readFileSync(jreastTimetablePath, 'utf-8'));
  
  // 京急の時刻表データを読み込み
  const keikyuTimetablePath = path.join(projectRoot, 'train-timetables/odpt_StationTimetable-keikyu.json');
  const keikyuTimetableData: StationTimetable[] = JSON.parse(fs.readFileSync(keikyuTimetablePath, 'utf-8'));
  
  console.log(`GeoJSON stations: ${geojsonData.features.length}`);
  console.log(`JR East timetable entries: ${jreastTimetableData.length}`);
  console.log(`Keikyu timetable entries: ${keikyuTimetableData.length}`);
  
  // 事業者ごとに駅時刻表データをグループ化
  const jreastStationTimetables: Map<string, StationTimetable[]> = new Map();
  const keikyuStationTimetables: Map<string, StationTimetable[]> = new Map();
  
  // JR東日本のデータを処理
  for (const timetable of jreastTimetableData) {
    const stationParts = timetable['odpt:station']?.split('.') || [];
    const railwayParts = timetable['odpt:railway']?.split('.') || [];
    
    if (stationParts.length >= 3 && railwayParts.length >= 3) {
      const stationName = stationParts[stationParts.length - 1];
      const railwayName = railwayParts[railwayParts.length - 1];
      const key = `${railwayName}.${stationName}`;
      
      if (!jreastStationTimetables.has(key)) {
        jreastStationTimetables.set(key, []);
      }
      jreastStationTimetables.get(key)!.push(timetable);
    }
  }
  
  // 京急のデータを処理
  for (const timetable of keikyuTimetableData) {
    const stationParts = timetable['odpt:station']?.split('.') || [];
    const railwayParts = timetable['odpt:railway']?.split('.') || [];
    
    if (stationParts.length >= 3 && railwayParts.length >= 3) {
      const stationName = stationParts[stationParts.length - 1];
      const railwayName = railwayParts[railwayParts.length - 1];
      const key = `${railwayName}.${stationName}`;
      
      if (!keikyuStationTimetables.has(key)) {
        keikyuStationTimetables.set(key, []);
      }
      keikyuStationTimetables.get(key)!.push(timetable);
    }
  }
  
  console.log(`\nJR East unique station-railway combinations: ${jreastStationTimetables.size}`);
  console.log(`Keikyu unique station-railway combinations: ${keikyuStationTimetables.size}`);
  
  // GeoJSONの各駅に最終列車情報を追加
  let matchedCount = 0;
  let unmatchedStations: string[] = [];
  
  for (const feature of geojsonData.features) {
    const stationName = feature.properties.N02_005;
    const operator = feature.properties.N02_004;
    const lineName = feature.properties.N02_003;
    
    // 既に処理済みの駅はスキップしない（上書き可能にする）
    const mappings = stationNameMapping[stationName];
    
    if (!mappings) {
      // マッピングがない場合はスキップ（他の鉄道事業者など）
      if (operator === '東日本旅客鉄道' || operator === '京浜急行電鉄') {
        unmatchedStations.push(`${stationName} (${lineName}, ${operator})`);
      } else {
        console.log(`Skipping station without mapping: ${stationName} (${operator})`);
      }
      continue;
    }
    
    // 複数のマッピングがある場合は全て検索
    let allTimetables: StationTimetable[] = [];
    for (const mapping of mappings) {
      const key = `${mapping.railway}.${mapping.romaji}`;
      
      if (mapping.operator === 'JREast') {
        const timetables = jreastStationTimetables.get(key);
        if (timetables) {
          allTimetables = allTimetables.concat(timetables);
        }
      } else if (mapping.operator === 'Keikyu') {
        const timetables = keikyuStationTimetables.get(key);
        if (timetables) {
          allTimetables = allTimetables.concat(timetables);
        }
      }
    }
    
    if (allTimetables.length === 0) {
      const keys = mappings.map(m => `${m.operator}.${m.railway}.${m.romaji}`).join(', ');
      console.log(`No timetable found for: ${stationName} (keys: ${keys})`);
      continue;
    }
    
    // 土日祝日と平日の両方から最終電車を探す
    let latestTime = '';
    let latestTrainInfo = '';
    
    for (const timetable of allTimetables) {
      const timetableObjects = timetable['odpt:stationTimetableObject'];
      const result = extractLastTrainTime(timetableObjects);
      
      if (result) {
        // より遅い時刻を採用
        const parseTime = (timeStr: string): number => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          const adjustedHours = hours < 4 ? hours + 24 : hours;
          return adjustedHours * 60 + minutes;
        };
        
        if (!latestTime || parseTime(result.time) > parseTime(latestTime)) {
          latestTime = result.time;
          latestTrainInfo = result.trainInfo;
        }
      }
    }
    
    if (latestTime) {
      feature.properties.last_train_arrival = latestTime;
      feature.properties.last_train_info = latestTrainInfo;
      matchedCount++;
      console.log(`✓ ${stationName} (${operator}): Last train at ${latestTime} (${latestTrainInfo})`);
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Matched stations: ${matchedCount}`);
  console.log(`Unmatched stations (need mapping): ${unmatchedStations.length}`);
  if (unmatchedStations.length > 0) {
    console.log('Unmatched:');
    unmatchedStations.forEach(s => console.log(`  - ${s}`));
  }
  
  // 結果を保存
  const outputPath = path.join(projectRoot, 'station-data/N02-22_Station_ese_coast_open_sea_with_trains.geojson');
  fs.writeFileSync(outputPath, JSON.stringify(geojsonData, null, 2), 'utf-8');
  console.log(`\nOutput saved to: ${outputPath}`);
  
  // public/data にもコピー
  const publicOutputPath = path.join(projectRoot, 'public/data/stations_with_last_train.geojson');
  fs.writeFileSync(publicOutputPath, JSON.stringify(geojsonData, null, 2), 'utf-8');
  console.log(`Public data saved to: ${publicOutputPath}`);
}

main().catch(console.error);
