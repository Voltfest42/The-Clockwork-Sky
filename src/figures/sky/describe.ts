import { AU, C } from '../../core/constants';
import { precessionMatrix } from '../../core/coords/precession';
import { moonPhaseName } from '../../core/ephemeris/phase';
import { formatDms, formatHms } from '../../core/math/angles';
import { apply, toSpherical, type Vec3 } from '../../core/math/vec3';
import { azAlt } from '../../core/sky/projection';
import { dailyPath, type DailyPath } from '../../core/sky/visibility';
import { starAt } from '../../core/stars/motion';
import { temperatureFromBV } from '../../core/stars/photometry';
import { ARCSEC, LIGHT_YEAR, PARSEC } from '../../core/units';
import type { SkyData } from '../../data/sky';
import { compassWord } from '../../viz/sky/words';
import { starLabel, starVector, type SkyModel } from '../../viz/sky/model';

/**
 * Facts about whatever the reader picks in a sky view, in words: for the info
 * card and the captions.
 */

export interface PickedFacts {
  title: string;
  subtitle?: string;
  rows: { label: string; value: string }[];
  /** The direction in the local frame, for pointing the camera at it. */
  local: Vec3;
}

const DEG = Math.PI / 180;

const PATH_WORDS: Record<DailyPath, string> = {
  circumpolar: 'never sets from here: it circles the pole all night',
  'rises-and-sets': 'rises and sets from here',
  'never-rises': 'never rises from here',
};

/** A star's J2000 direction at the model's date (with its own motion). */
export function starJ2000(data: SkyData, i: number, epoch: number): Vec3 {
  const c = data.stars;
  const s = starAt(c.ra[i], c.dec[i], c.pmra[i], c.pmdec[i], c.parallax[i], c.rv[i], epoch);
  return [s.x, s.y, s.z];
}

/** The constellation's full name for an abbreviation ("CMa" → "Canis Major"). */
export function constellationName(data: SkyData, id: string): string {
  return data.constellations.find((c) => c.id === id)?.name ?? id;
}

function position(model: SkyModel, local: Vec3, j2000: Vec3, latitude: number | null): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const ofDate = toSpherical(apply(precessionMatrix(model.jdTT), j2000));
  if (model.mode === 'horizon') {
    const { az, alt } = azAlt(local);
    rows.push({
      label: 'In your sky',
      value: `${(alt / DEG).toFixed(1)}° ${alt >= 0 ? 'above' : 'below'} the horizon, towards the ${compassWord(az)} (azimuth ${((az / DEG + 360) % 360).toFixed(0)}°)`,
    });
  }
  rows.push({ label: 'Right ascension, declination', value: `${formatHms(ofDate.lon)}, ${formatDms(ofDate.lat)} (of date)` });
  if (latitude !== null) rows.push({ label: 'Each day it', value: PATH_WORDS[dailyPath(ofDate.lat, latitude)] });
  return rows;
}

export function describePick(model: SkyModel, id: string, latitude: number | null): PickedFacts | null {
  const data = model.data;
  if (id.startsWith('star:')) {
    const i = Number(id.slice(5));
    const c = data.stars;
    if (!(i >= 0 && i < c.count)) return null;
    const name = c.names.get(i);
    const d = c.designations.get(i);
    const designation = d ? `${d.letter} ${constellationName(data, d.constellation)}` : null;
    const rows: { label: string; value: string }[] = [];
    rows.push({ label: 'Brightness', value: `magnitude ${model.starMag[i].toFixed(2)} (smaller numbers are brighter)` });
    if (c.parallax[i] > 0) {
      const parsecs = 1 / (c.parallax[i] / ARCSEC);
      const ly = (parsecs * PARSEC) / LIGHT_YEAR;
      rows.push({
        label: 'Distance',
        value: `${ly < 100 ? ly.toFixed(1) : Math.round(ly).toLocaleString('en-GB')} light-years: you see light that left it ${ly < 100 ? ly.toFixed(0) : Math.round(ly).toLocaleString('en-GB')} years ago`,
      });
    }
    if (Number.isFinite(c.bv[i])) rows.push({ label: 'Colour', value: `B−V ${c.bv[i].toFixed(2)}: about ${(Math.round(temperatureFromBV(c.bv[i]) / 100) * 100).toLocaleString('en-GB')} K at the surface` });
    rows.push(...position(model, starVector(model, i), starJ2000(data, i, model.frames.epoch), latitude));
    if (c.hip[i]) rows.push({ label: 'Catalogue', value: `HIP ${c.hip[i]}` });
    return { title: name ?? designation ?? starLabel(c, i), subtitle: name && designation ? designation : undefined, rows, local: starVector(model, i) };
  }
  if (id.startsWith('body:')) {
    const body = model.bodies.find((b) => `body:${b.name}` === id);
    if (!body) return null;
    const rows: { label: string; value: string }[] = [];
    if (body.name === 'moon') {
      rows.push({ label: 'Phase', value: `${moonPhaseName(model.jdTT)}, ${Math.round(body.illuminated * 100)}% lit` });
      rows.push({ label: 'Distance', value: `${Math.round((body.distance * AU) / 1000).toLocaleString('en-GB')} km` });
    } else if (body.name === 'sun') {
      rows.push({ label: 'Distance', value: `${body.distance.toFixed(4)} AU: its light left ${((body.distance * AU) / C / 60).toFixed(1)} minutes ago` });
    } else {
      rows.push({ label: 'Brightness', value: `magnitude ${body.magnitude.toFixed(1)}` });
      const minutes = (body.distance * AU) / C / 60;
      rows.push({ label: 'Distance', value: `${body.distance.toFixed(2)} AU: its light left ${minutes < 120 ? `${minutes.toFixed(0)} minutes` : `${(minutes / 60).toFixed(1)} hours`} ago` });
      if (body.illuminated < 0.995) rows.push({ label: 'Lit', value: `${Math.round(body.illuminated * 100)}% of the disc we see` });
    }
    // Back to J2000 for the coordinates: the local vector has refraction and parallax in it, which don't matter at this precision.
    const m = model.frames.fromJ2000;
    const j2000: Vec3 = [
      m[0][0] * body.local[0] + m[1][0] * body.local[1] + m[2][0] * body.local[2],
      m[0][1] * body.local[0] + m[1][1] * body.local[1] + m[2][1] * body.local[2],
      m[0][2] * body.local[0] + m[1][2] * body.local[1] + m[2][2] * body.local[2],
    ];
    rows.push(...position(model, body.local, j2000, body.name === 'sun' || body.name === 'moon' ? null : latitude));
    return { title: body.label, rows, local: body.local };
  }
  return null;
}
