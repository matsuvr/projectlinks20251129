const fs = require('fs');
const path = require('path');

const TOKYO_STATION = { lat: 35.681236, lon: 139.767125 };
const SEARCH_RADIUS_KM = 200;
const EARTH_RADIUS_KM = 6371;

const inputPath = path.join(__dirname, '..', 'N02-22_GML', 'UTF-8', 'N02-22_Station.geojson');
const outputPath = path.join(__dirname, '..', 'station-data', 'N02-22_Station_tokyo_200km.geojson');

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const originLat = toRadians(lat1);
  const targetLat = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(originLat) * Math.cos(targetLat);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function geometryToPoint(geometry) {
  if (!geometry) return null;

  switch (geometry.type) {
    case 'Point': {
      const [lon, lat] = geometry.coordinates;
      return { lat, lon };
    }
    case 'MultiPoint': {
      const points = geometry.coordinates;
      if (!points.length) return null;
      const [lon, lat] = points[0];
      return { lat, lon };
    }
    case 'LineString': {
      return averageCoordinates(geometry.coordinates);
    }
    case 'MultiLineString': {
      const flattened = geometry.coordinates.flat();
      return averageCoordinates(flattened);
    }
    case 'Polygon': {
      return averageCoordinates(geometry.coordinates[0] || []);
    }
    case 'MultiPolygon': {
      const flattened = geometry.coordinates.flat(2);
      return averageCoordinates(flattened);
    }
    default:
      return null;
  }
}

function averageCoordinates(coords) {
  if (!coords || !coords.length) return null;
  const accumulator = coords.reduce(
    (acc, [lon, lat]) => {
      acc.lon += lon;
      acc.lat += lat;
      return acc;
    },
    { lon: 0, lat: 0 }
  );
  return { lat: accumulator.lat / coords.length, lon: accumulator.lon / coords.length };
}

function main() {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  const geojson = JSON.parse(raw);
  const totalFeatures = geojson.features?.length || 0;

  const filteredFeatures = (geojson.features || []).reduce((acc, feature) => {
    const point = geometryToPoint(feature.geometry);
    if (!point) return acc;

    const distance = haversineDistance(point.lat, point.lon, TOKYO_STATION.lat, TOKYO_STATION.lon);
    if (distance <= SEARCH_RADIUS_KM) {
      const enrichedFeature = {
        ...feature,
        properties: {
          ...feature.properties,
          distance_km_from_tokyo: Number(distance.toFixed(3)),
        },
      };
      acc.push(enrichedFeature);
    }
    return acc;
  }, []);

  const result = {
    ...geojson,
    features: filteredFeatures,
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

  console.log(
    `Filtered ${filteredFeatures.length} of ${totalFeatures} stations into ${path.relative(
      process.cwd(),
      outputPath
    )}`
  );
}

main();
