import * as Astronomy from 'astronomy-engine';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RANGE_START = new Date('2010-01-01T12:00:00Z');
const RANGE_END = new Date('2035-12-31T12:00:00Z');

const BODIES = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
];

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getEclipticLon(bodyName, date) {
  const astroTime = Astronomy.MakeTime(date);

  if (bodyName === 'NorthNode') {
    // North Node is opposite the Moon's apogee; approximate via Moon's ecliptic lon + 180
    const moon = Astronomy.EclipticGeoMoon(astroTime);
    return (moon.lon + 180) % 360;
  }

  if (bodyName === 'Chiron') {
    // astronomy-engine doesn't include Chiron; use a rough approximation
    // Chiron orbital period ~50.7 years, perihelion 1996-02-14 at ~209°
    const perihelionDate = new Date('1996-02-14T00:00:00Z');
    const periodYears = 50.7;
    const periodMs = periodYears * 365.25 * 24 * 3600 * 1000;
    const elapsedMs = date - perihelionDate;
    const lon = ((elapsedMs / periodMs) * 360 + 209) % 360;
    return lon < 0 ? lon + 360 : lon;
  }

  const body = Astronomy.Body[bodyName];
  if (body === undefined) {
    throw new Error(`Unknown body: ${bodyName}`);
  }

  const ecliptic = Astronomy.SunPosition(astroTime);

  if (bodyName === 'Sun') {
    return ecliptic.elon;
  }

  // For geocentric ecliptic longitude of planets, use GeoVector then EclipticAngles
  const geoVec = Astronomy.GeoVector(body, astroTime, false);
  const eclVec = Astronomy.Ecliptic(geoVec);
  return eclVec.elon;
}

function isRetrograde(bodyName, lon1, lon2) {
  if (bodyName === 'Sun' || bodyName === 'Moon' || bodyName === 'NorthNode') return false;
  let delta = lon2 - lon1;
  // Normalize for wraparound
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta < 0;
}

async function generate() {
  const days = {};
  const allBodiesWithExtras = [...BODIES, 'Chiron', 'NorthNode'];

  let current = new Date(RANGE_START);
  let prev = null;
  let prevPositions = null;
  let dayCount = 0;
  const totalDays = Math.ceil((RANGE_END - RANGE_START) / (24 * 3600 * 1000));

  while (current <= RANGE_END) {
    const key = dateKey(current);
    const positions = {};

    for (const body of allBodiesWithExtras) {
      try {
        const lon = getEclipticLon(body, current);
        positions[body] = { lon: Math.round(lon * 10) / 10, retrograde: false };
      } catch (e) {
        positions[body] = { lon: 0, retrograde: false };
      }
    }

    if (prevPositions) {
      for (const body of allBodiesWithExtras) {
        positions[body].retrograde = isRetrograde(
          body,
          prevPositions[body]?.lon ?? 0,
          positions[body].lon
        );
      }
    }

    days[key] = positions;
    prevPositions = positions;
    dayCount++;

    if (dayCount % 365 === 0) {
      const pct = ((dayCount / totalDays) * 100).toFixed(0);
      process.stdout.write(`\rGenerating ephemeris... ${pct}%`);
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  process.stdout.write('\rGenerating ephemeris... 100%\n');

  const output = {
    meta: {
      range_start: dateKey(RANGE_START),
      range_end: dateKey(RANGE_END),
      bodies: allBodiesWithExtras,
      generated: new Date().toISOString(),
    },
    days,
  };

  const outPath = path.resolve(__dirname, '../../public/data/ephemeris.json');
  fs.writeFileSync(outPath, JSON.stringify(output));
  console.log(`\nWrote ${Object.keys(days).length} days to ${outPath}`);
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
