import * as Cesium from "cesium";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const PATH_ENTITY_ID = "mars-walking-path";

type Place = string | { latitude: number; longitude: number };

export type RouteStop = { name: string; latitude: number; longitude: number };

export type PathOptions = {
  weights?: { slope?: number; surface?: number; temperature?: number; interest?: number };
  localSolarHour?: number;
  maxSlopeDeg?: number;
  walkingSpeedMs?: number;
  evaHoursPerSol?: number;
};

export type PathResult = {
  summary: {
    distanceKm: number;
    walkingTime: { seconds: number; hours: number; formatted: string };
    evaSols: number;
    ascentM: number;
    descentM: number;
    maxSlopeDeg: number;
    temperatureC: { average: number; min: number; max: number };
    surfaces: { surface: string; percent: number }[];
    sitesNearPath: { name: string; distanceFromPathKm: number }[];
  };
  path: {
    latitude: number;
    longitude: number;
    elevationM: number;
    temperatureC: number;
    surface: string;
    interest: number;
    distanceFromStartM: number;
    elapsedSeconds: number;
  }[];
  /** Flat [lon, lat, lon, lat, ...] */
  positions: number[];
};

export async function fetchMarsPath(
  start: Place,
  goal: Place,
  options: PathOptions = {},
): Promise<PathResult> {
  const response = await fetch(`${API_URL}/api/path`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ start, goal, ...options }),
  });

  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Path request failed");
  return body as PathResult;
}

// ==========================================
// MULTI-STOP ROUTES
// ==========================================

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

// Joins the results of consecutive legs (A->B, B->C, ...) into one result.
function mergePathResults(results: PathResult[]): PathResult {
  let km = 0;
  let seconds = 0;
  let ascentM = 0;
  let descentM = 0;
  let maxSlopeDeg = 0;
  let evaSols = 0;
  let tempWeighted = 0;
  let tMin = Infinity;
  let tMax = -Infinity;
  const surfaceKm = new Map<string, number>();
  const sites = new Map<string, number>();
  const path: PathResult["path"] = [];
  const positions: number[] = [];

  for (const r of results) {
    const s = r.summary;
    const offsetM = km * 1000;
    const offsetS = seconds;

    for (const p of r.path) {
      path.push({
        ...p,
        distanceFromStartM: p.distanceFromStartM + offsetM,
        elapsedSeconds: p.elapsedSeconds + offsetS,
      });
    }
    positions.push(...r.positions);

    km += s.distanceKm;
    seconds += s.walkingTime.seconds;
    ascentM += s.ascentM;
    descentM += s.descentM;
    evaSols += s.evaSols;
    maxSlopeDeg = Math.max(maxSlopeDeg, s.maxSlopeDeg);
    tempWeighted += s.temperatureC.average * s.distanceKm;
    tMin = Math.min(tMin, s.temperatureC.min);
    tMax = Math.max(tMax, s.temperatureC.max);

    for (const x of s.surfaces) {
      surfaceKm.set(
        x.surface,
        (surfaceKm.get(x.surface) ?? 0) + (x.percent / 100) * s.distanceKm,
      );
    }

    for (const site of s.sitesNearPath) {
      const prev = sites.get(site.name);
      if (prev === undefined || site.distanceFromPathKm < prev) {
        sites.set(site.name, site.distanceFromPathKm);
      }
    }
  }

  return {
    summary: {
      distanceKm: km,
      walkingTime: { seconds, hours: seconds / 3600, formatted: formatDuration(seconds) },
      evaSols,
      ascentM,
      descentM,
      maxSlopeDeg,
      temperatureC: { average: km ? tempWeighted / km : 0, min: tMin, max: tMax },
      surfaces: [...surfaceKm].map(([surface, k]) => ({
        surface,
        percent: km ? (k / km) * 100 : 0,
      })),
      sitesNearPath: [...sites].map(([name, distanceFromPathKm]) => ({
        name,
        distanceFromPathKm,
      })),
    },
    path,
    positions,
  };
}

// Plans a route through 2 or more places: one API call per consecutive pair,
// merged into a single result.
export async function fetchMarsRoute(
  stops: RouteStop[],
  options: PathOptions = {},
): Promise<PathResult> {
  if (stops.length < 2) throw new Error("Pick at least 2 places.");

  const legs = await Promise.all(
    stops.slice(0, -1).map((from, i) => {
      const to = stops[i + 1];
      return fetchMarsPath(
        { latitude: from.latitude, longitude: from.longitude },
        { latitude: to.latitude, longitude: to.longitude },
        options,
      );
    }),
  );

  return mergePathResults(legs);
}

// ==========================================
// DRAWING
// ==========================================

export function clearMarsPath(viewer: Cesium.Viewer) {
  viewer.entities.removeById(PATH_ENTITY_ID);
}

// Draws the route clamped to whatever surface is showing (3D tileset or the
// imagery globe). The API's elevations belong to its own terrain model, so the
// line is clamped to the ground rather than placed at those heights.
export function drawMarsPath(viewer: Cesium.Viewer, result: PathResult) {
  clearMarsPath(viewer);

  const entity = viewer.entities.add({
    id: PATH_ENTITY_ID,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray(result.positions, Cesium.Ellipsoid.MARS),
      width: 4,
      clampToGround: true,
      classificationType: Cesium.ClassificationType.BOTH,
      material: Cesium.Color.fromCssColorString("#ffb74d"),
    },
  });

  viewer.flyTo(entity, { duration: 2 });
}
