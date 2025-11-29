import * as fs from 'fs';
import * as path from 'path';

// 駅のGeoJSON型定義
interface StationProperties {
  N02_003: string;
  N02_004: string;
  N02_005: string;
  N02_005c: string;
  N02_005g: string;
  distance_km_from_tokyo: number;
  distance_to_ese_coast_km: number;
}

interface StationFeature {
  type: 'Feature';
  properties: StationProperties;
  geometry: {
    type: 'LineString';
    coordinates: number[][];
  };
}

interface StationGeoJSON {
  type: 'FeatureCollection';
  name: string;
  features: StationFeature[];
}

// レンタカー営業所の型定義
interface RentalCarOffice {
  OPERATOR_ID: string;
  ADDRESS: string;
  ADDRESS_LATITUDE: number;
  ADDRESS_LONGITUDE: number;
  PASSENGER_CAR_VEHICLE_COUNT: number;
  OFFICE_VEHICLE_ALLOCATION_LIST_OFFICE_ID: string;
  OFFICE_VEHICLE_ALLOCATION_LIST_LOCATION: string;
  OWNED_VEHICLES_PASSENGER: number;
  OWNED_VEHICLES_TOTAL: number;
  PREFECTURE_NAME: string;
  CITY_WARD_TOWN_NAME: string;
}

// GeoJSON Feature型定義
interface RentalCarFeature {
  type: 'Feature';
  properties: {
    office_id: string;
    address: string;
    prefecture: string;
    city: string;
    passenger_car_count: number;
    owned_vehicles_total: number;
    nearest_station: string;
    nearest_station_operator: string;
    nearest_station_line: string;
    distance_to_station_km: number;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

// Haversine公式で2点間の距離を計算（km）
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 地球の半径（km）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 駅の中心座標を取得
function getStationCenter(feature: StationFeature): [number, number] {
  const coords = feature.geometry.coordinates;
  const centerIndex = Math.floor(coords.length / 2);
  return [coords[centerIndex][1], coords[centerIndex][0]]; // [lat, lng]
}

// CSVを解析
function parseCSV(csvContent: string): Record<string, string>[] {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',');
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    records.push(record);
  }

  return records;
}

async function main() {
  // 駅データを読み込み
  const stationsPath = path.join(__dirname, '../public/data/N02-22_Station_ese_coast_open_sea.geojson');
  const stationsData: StationGeoJSON = JSON.parse(fs.readFileSync(stationsPath, 'utf-8'));
  console.log(`読み込んだ駅数: ${stationsData.features.length}`);

  // レンタカー営業所CSVを読み込み
  const rentalCarPath = path.join(__dirname, '../kokudokoutsusho/01_kashiwatashijissekihoukokusho.csv');
  const csvContent = fs.readFileSync(rentalCarPath, 'utf-8');
  const rentalCarRecords = parseCSV(csvContent);
  console.log(`読み込んだレンタカー営業所レコード数: ${rentalCarRecords.length}`);

  // 駅の座標を準備（重複除去）
  const stationMap = new Map<string, { center: [number, number]; properties: StationProperties }>();
  stationsData.features.forEach(feature => {
    const key = feature.properties.N02_005; // 駅名をキーに
    if (!stationMap.has(key)) {
      stationMap.set(key, {
        center: getStationCenter(feature),
        properties: feature.properties
      });
    }
  });
  console.log(`ユニークな駅数: ${stationMap.size}`);

  // 有効な位置情報を持つレンタカー営業所をフィルタリング
  const validRentalCars: RentalCarOffice[] = [];
  const seenOffices = new Set<string>();

  rentalCarRecords.forEach(record => {
    const lat = parseFloat(record.ADDRESS_LATITUDE);
    const lng = parseFloat(record.ADDRESS_LONGITUDE);
    const officeId = record.OFFICE_VEHICLE_ALLOCATION_LIST_OFFICE_ID;
    const location = record.OFFICE_VEHICLE_ALLOCATION_LIST_LOCATION;
    
    // 有効な座標を持ち、重複しないもののみ
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && officeId) {
      const uniqueKey = `${officeId}-${lat}-${lng}`;
      if (!seenOffices.has(uniqueKey)) {
        seenOffices.add(uniqueKey);
        validRentalCars.push({
          OPERATOR_ID: record.OPERATOR_ID,
          ADDRESS: record.ADDRESS,
          ADDRESS_LATITUDE: lat,
          ADDRESS_LONGITUDE: lng,
          PASSENGER_CAR_VEHICLE_COUNT: parseInt(record.PASSENGER_CAR_VEHICLE_COUNT) || 0,
          OFFICE_VEHICLE_ALLOCATION_LIST_OFFICE_ID: officeId,
          OFFICE_VEHICLE_ALLOCATION_LIST_LOCATION: location,
          OWNED_VEHICLES_PASSENGER: parseInt(record.OWNED_VEHICLES_PASSENGER) || 0,
          OWNED_VEHICLES_TOTAL: parseInt(record.OWNED_VEHICLES_TOTAL) || 0,
          PREFECTURE_NAME: record.PREFECTURE_NAME,
          CITY_WARD_TOWN_NAME: record.CITY_WARD_TOWN_NAME,
        });
      }
    }
  });
  console.log(`有効な座標を持つユニーク営業所数: ${validRentalCars.length}`);

  // 駅から1km以内のレンタカー営業所を抽出
  const nearbyRentalCars: RentalCarFeature[] = [];
  const processedOffices = new Set<string>();

  validRentalCars.forEach(office => {
    let nearestDistance = Infinity;
    let nearestStationProps: StationProperties | null = null;

    stationMap.forEach((station) => {
      const distance = calculateDistance(
        office.ADDRESS_LATITUDE,
        office.ADDRESS_LONGITUDE,
        station.center[0],
        station.center[1]
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestStationProps = station.properties;
      }
    });

    // 1km以内の営業所のみを追加
    if (nearestDistance <= 1.0 && nearestStationProps !== null) {
      const uniqueKey = `${office.ADDRESS_LATITUDE}-${office.ADDRESS_LONGITUDE}`;
      if (!processedOffices.has(uniqueKey)) {
        processedOffices.add(uniqueKey);
        const props = nearestStationProps as StationProperties;
        nearbyRentalCars.push({
          type: 'Feature',
          properties: {
            office_id: office.OFFICE_VEHICLE_ALLOCATION_LIST_OFFICE_ID,
            address: office.ADDRESS || office.OFFICE_VEHICLE_ALLOCATION_LIST_LOCATION,
            prefecture: office.PREFECTURE_NAME,
            city: office.CITY_WARD_TOWN_NAME,
            passenger_car_count: office.OWNED_VEHICLES_PASSENGER || office.PASSENGER_CAR_VEHICLE_COUNT,
            owned_vehicles_total: office.OWNED_VEHICLES_TOTAL,
            nearest_station: props.N02_005,
            nearest_station_operator: props.N02_004,
            nearest_station_line: props.N02_003,
            distance_to_station_km: Math.round(nearestDistance * 1000) / 1000,
          },
          geometry: {
            type: 'Point',
            coordinates: [office.ADDRESS_LONGITUDE, office.ADDRESS_LATITUDE],
          },
        });
      }
    }
  });

  console.log(`駅から1km以内のレンタカー営業所数: ${nearbyRentalCars.length}`);

  // GeoJSONを作成
  const geojson = {
    type: 'FeatureCollection',
    name: 'Rental_Car_Offices_Near_Stations',
    features: nearbyRentalCars,
  };

  // ファイルに保存
  const outputPath = path.join(__dirname, '../public/data/rental_car_offices_near_stations.geojson');
  fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2), 'utf-8');
  console.log(`\nGeoJSONを保存しました: ${outputPath}`);

  // 駅ごとの営業所数を集計
  const stationOfficeCount = new Map<string, number>();
  nearbyRentalCars.forEach(office => {
    const station = office.properties.nearest_station;
    stationOfficeCount.set(station, (stationOfficeCount.get(station) || 0) + 1);
  });

  console.log('\n--- 駅ごとのレンタカー営業所数 ---');
  const sortedStations = Array.from(stationOfficeCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  
  sortedStations.forEach(([station, count]) => {
    console.log(`${station}: ${count}件`);
  });
}

main().catch(console.error);
