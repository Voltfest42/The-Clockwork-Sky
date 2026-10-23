import { R_EARTH } from '../../core/constants';
import { AU } from '../../core/constants';
import { apparentAltitude } from '../../core/coords/refraction';
import { angularRadius, skyBodies, type SkyBodyName } from '../../core/ephemeris/bodies';
import { planetsValidAt } from '../../core/ephemeris/planets';
import { apply, normalize, type Vec3 } from '../../core/math/vec3';
import { eclipticChartFrames, horizonFrames, type Place, type SkyFrames } from '../../core/sky/frames';
import { limitingMagnitude, skyLightness } from '../../core/sky/visibility';
import { starPositionsAt, type StarPositions } from '../../core/stars/motion';
import type { StarCatalogue } from '../../core/stars/catalogue';
import type { SkyData } from '../../data/sky';

/**
 * Everything the sky view draws at one moment, already turned into the view's
 * local frame: the stars (moved by their own motions to the date), the Sun,
 * the Moon and the planets, and how light the sky is.
 */

export type SkyMode = 'horizon' | 'chart';

export interface ModelBody {
  name: SkyBodyName;
  label: string;
  /** Unit vector in the local frame, as seen from the observer (with refraction in the view from the ground). */
  local: Vec3;
  /** Distance from Earth's centre: AU. */
  distance: number;
  magnitude: number;
  /** Radius of the disc on the sky: radians. */
  angularRadius: number;
  illuminated: number;
  phaseAngle: number;
  /** Where the Sun is, in the same frame: for drawing the lit side. */
  sunLocal: Vec3;
}

export interface SkyModel {
  mode: SkyMode;
  data: SkyData;
  frames: SkyFrames;
  jdTT: number;
  /** Star directions in the local frame: x, y, z for each star. */
  starLocal: Float64Array;
  /** Star magnitudes at this date. */
  starMag: Float32Array;
  bodies: ModelBody[];
  /** The Sun's true altitude, in the view from the ground; null in charts. */
  sunAltitude: number | null;
  /** The faintest magnitude that shows (6.5 at night, less in twilight and daylight). */
  limit: number;
  /** How light the sky is, 0 (night) to 1 (day). */
  lightness: number;
  /** Whether atmospheric refraction has been applied (the view from the ground). */
  refracted: boolean;
  /** False outside 3000 BC–AD 3000, when the planets are left out. */
  planetsShown: boolean;
}

export const BODY_LABELS: Record<SkyBodyName, string> = {
  sun: 'Sun',
  moon: 'Moon',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
};

/** Earth's radius in AU, for the shift between Earth's centre and the observer (about 1° for the Moon). */
const EARTH_RADIUS_AU = R_EARTH / AU;

export interface ModelOptions {
  jdTT: number;
  mode: SkyMode;
  /** Needed for the view from the ground. */
  place?: Place;
  /** Draw the daytime and twilight sky, which hides fainter stars; off shows the stars as if at night. */
  daylight?: boolean;
  /** Include the Sun, the Moon and the planets. */
  bodies?: boolean;
}

/** Star positions are recomputed only when the date moves by more than this (years): their motions are tiny. */
const EPOCH_STEP = 0.25;
const positionCache = new WeakMap<StarCatalogue, StarPositions>();

function starsAt(cat: StarCatalogue, epoch: number): StarPositions {
  const cached = positionCache.get(cat);
  if (cached && Math.abs(cached.epoch - epoch) < EPOCH_STEP) return cached;
  const positions = starPositionsAt(cat, Math.round(epoch / EPOCH_STEP) * EPOCH_STEP);
  positionCache.set(cat, positions);
  return positions;
}

/** Lifts a local (east, north, up) direction by atmospheric refraction. */
export function refract(v: Vec3): Vec3 {
  const horizontal = Math.hypot(v[0], v[1]);
  if (horizontal < 1e-12) return v;
  const alt = Math.atan2(v[2], horizontal);
  const seen = apparentAltitude(alt);
  const k = Math.cos(seen) / horizontal;
  return [v[0] * k, v[1] * k, Math.sin(seen)];
}

export function buildSkyModel(data: SkyData, options: ModelOptions): SkyModel {
  const { jdTT, mode } = options;
  const horizon = mode === 'horizon';
  if (horizon && !options.place) throw new Error('The view from the ground needs a place');
  const frames = horizon ? horizonFrames(jdTT, options.place!) : eclipticChartFrames(jdTT);
  const M = frames.fromJ2000;
  const positions = starsAt(data.stars, frames.epoch);
  const n = data.stars.count;
  const starLocal = new Float64Array(3 * n);
  const p = positions.xyz;
  for (let i = 0; i < n; i++) {
    const x = p[3 * i];
    const y = p[3 * i + 1];
    const z = p[3 * i + 2];
    let lx = M[0][0] * x + M[0][1] * y + M[0][2] * z;
    let ly = M[1][0] * x + M[1][1] * y + M[1][2] * z;
    let lz = M[2][0] * x + M[2][1] * y + M[2][2] * z;
    if (horizon && lz > -0.05) [lx, ly, lz] = refract([lx, ly, lz]);
    starLocal[3 * i] = lx;
    starLocal[3 * i + 1] = ly;
    starLocal[3 * i + 2] = lz;
  }

  const bodies: ModelBody[] = [];
  let sunAltitude: number | null = null;
  if (options.bodies !== false) {
    const all = skyBodies(jdTT);
    // Seen from the observer, not Earth's centre: subtract the observer's position (straight up, one Earth radius).
    const seen = (v: Vec3): Vec3 => {
      const local = apply(M, v);
      return horizon ? normalize([local[0], local[1], local[2] - EARTH_RADIUS_AU]) : normalize(local);
    };
    const sun = all.find((b) => b.name === 'sun')!;
    const sunTrue = seen(sun.position);
    if (horizon) sunAltitude = Math.asin(Math.max(-1, Math.min(1, sunTrue[2])));
    for (const body of all) {
      const trueLocal = body === sun ? sunTrue : seen(body.position);
      bodies.push({
        name: body.name,
        label: BODY_LABELS[body.name],
        local: horizon ? refract(trueLocal) : trueLocal,
        distance: body.distance,
        magnitude: body.magnitude,
        angularRadius: angularRadius(body),
        illuminated: body.illuminated,
        phaseAngle: body.phaseAngle,
        sunLocal: sunTrue,
      });
    }
  }

  const daylightOn = horizon && options.daylight !== false && sunAltitude !== null;
  return {
    mode,
    data,
    frames,
    jdTT,
    starLocal,
    starMag: positions.mag,
    bodies,
    sunAltitude,
    limit: daylightOn ? limitingMagnitude(sunAltitude!) : 6.5,
    lightness: daylightOn ? skyLightness(sunAltitude!) : 0,
    refracted: horizon,
    planetsShown: planetsValidAt(jdTT),
  };
}

/** A star's direction in the local frame. */
export function starVector(model: SkyModel, i: number): Vec3 {
  return [model.starLocal[3 * i], model.starLocal[3 * i + 1], model.starLocal[3 * i + 2]];
}

/** A star's name for labels: its proper name, else its designation ("α Cen"), else its HIP number. */
export function starLabel(cat: StarCatalogue, i: number): string {
  const name = cat.names.get(i);
  if (name) return name;
  const d = cat.designations.get(i);
  if (d) return `${d.letter} ${d.constellation}`;
  return cat.hip[i] ? `HIP ${cat.hip[i]}` : `Star ${i + 1}`;
}
