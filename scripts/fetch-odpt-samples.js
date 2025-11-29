/*
  Fetch 3 station samples for each railway per operator.
  Strategy to avoid 403: use the exact URLs defined in
  `station-data/station-data-api-urls.json` (which include hosts and
  tokens appropriate for each operator like api-challenge or api-public).
*/

'use strict';

const fs = require('fs/promises');
const path = require('path');

const STATION_URLS_PATH = path.join(process.cwd(), 'station-data', 'station-data-api-urls.json');

async function getJSON(url, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

function inferType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'array<any>';
    return `array<${inferType(value[0])}>`;
  }
  const t = typeof value;
  if (t === 'object') return 'object';
  return t; // string | number | boolean | undefined | function
}

function summarizeObjectSchema(obj) {
  const summary = {};
  for (const [k, v] of Object.entries(obj)) {
    summary[k] = inferType(v);
  }
  return summary;
}

function getParam(urlStr, key) {
  try {
    const u = new URL(urlStr);
    return u.searchParams.get(key);
  } catch {
    return null;
  }
}

async function main() {
  console.log('ODPT sample fetch started...');
  const startedAt = new Date().toISOString();

  // Load operator station URLs
  const raw = await fs.readFile(STATION_URLS_PATH, 'utf-8');
  const entries = JSON.parse(raw); // array of { company, url, description_jp }

  const railwayResults = [];

  for (const entry of entries) {
    let url = entry.url;
    try {
      const u = new URL(url);
      const hasKey = !!u.searchParams.get('acl:consumerKey');
      if (u.hostname === 'api.odpt.org' && hasKey) {
        u.hostname = 'api-challenge.odpt.org';
        url = u.toString();
      }
    } catch {}
    const operator = getParam(url, 'odpt:operator') || 'unknown';
    console.log(`Fetching stations for ${entry.company} (${operator}) ...`);
    try {
      const stations = await getJSON(url);
      // Group by odpt:railway
      const byRailway = new Map();
      for (const s of stations) {
        const rw = s['odpt:railway'] || 'unknown';
        if (!byRailway.has(rw)) byRailway.set(rw, []);
        byRailway.get(rw).push(s);
      }

      for (const [railwaySameAs, stationList] of byRailway.entries()) {
        const samples = stationList.slice(0, 3);
        const railwayEntry = {
          company: entry.company,
          operator,
          railwaySameAs,
          stationSamples: samples.map(s => ({
            stationSameAs: s['owl:sameAs'] || s['@id'],
            stationTitle: s['odpt:stationTitle'] || {},
            schema: summarizeObjectSchema(s),
          })),
        };
        railwayResults.push(railwayEntry);
      }
    } catch (e) {
      console.warn(`Failed to fetch stations for ${entry.company}: ${e.message}`);
    }
  }

  const outDir = path.join(process.cwd(), 'station-data');
  await fs.mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, 'railway-station-samples.json');
  await fs.writeFile(jsonPath, JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), railwayResults }, null, 2));

  // Build a concise markdown report
  const lines = [];
  lines.push(`# ODPT データ構造レポート (路線ごとに駅データ3件)`);
  lines.push('');
  lines.push(`- 取得対象: 事業者リストは station-data-api-urls.json を参照`);
  lines.push(`- 各路線: 駅データ3件をサンプル取得`);
  lines.push(`- 生成時刻: ${new Date().toLocaleString('ja-JP')}`);
  lines.push('');

  for (const r of railwayResults) {
    lines.push(`## ${r.railwaySameAs}`);
    lines.push(`- company: ${r.company}`);
    lines.push(`- operator: ${r.operator}`);
    lines.push(`- railway: \`${r.railwaySameAs}\``);

    if (!r.stationSamples || !r.stationSamples.length) {
      lines.push(`- Station samples: none`);
      lines.push('');
      continue;
    }

    for (const [idx, s] of r.stationSamples.entries()) {
      const sja = s.stationTitle && (s.stationTitle.ja || s.stationTitle['ja-Hrkt'] || '');
      const sen = s.stationTitle && s.stationTitle.en ? ` / ${s.stationTitle.en}` : '';
      const sKeys = Object.entries(s.schema || {}).slice(0, 10).map(([k, t]) => `\`${k}\` (${t})`).join(', ');
      lines.push(`  - Sample ${idx + 1}: ${sja || s.stationSameAs}${sen}`);
      lines.push(`    - station: \`${s.stationSameAs}\``);
      lines.push(`    - keys: ${sKeys}`);
    }
    lines.push('');
  }

  const mdPath = path.join(outDir, 'odpt-data-structure-report.md');
  await fs.writeFile(mdPath, lines.join('\n'));

  console.log('Done.');
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- Report: ${mdPath}`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
