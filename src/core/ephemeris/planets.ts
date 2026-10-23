import { wrapPi } from '../math/angles';
import { rotateX, type Vec3 } from '../math/vec3';
import { calendarFromJd } from '../time/calendar';
import { julianCenturies, julianEpoch } from '../time/julian';
import { DEG } from '../units';
import { eccentricAnomaly } from './kepler';
import type { PlanetName } from './meanLongitude';

/**
 * Where the planets are: E. M. Standish's Keplerian elements for approximate
 * positions of the major planets (JPL Solar System Dynamics, "Approximate
 * Positions of the Planets", after Standish & Williams 1992), solved with
 * Kepler's equation.
 *
 * Table 1 covers 1800–2050; Tables 2a and 2b cover 3000 BC to AD 3000, with
 * extra terms in the mean anomaly for Jupiter to Neptune. JPL's nominal errors
 * in heliocentric longitude, arcseconds:
 *
 * |               | Mercury | Venus | EM bary | Mars | Jupiter | Saturn | Uranus | Neptune |
 * |---------------|---------|-------|---------|------|---------|--------|--------|---------|
 * | 1800–2050     | 15      | 20    | 20      | 40   | 400     | 600    | 50     | 10      |
 * | 3000 BC–3000  | 20      | 40    | 40      | 100  | 600     | 1000   | 2000   | 400     |
 *
 * Positions are heliocentric, in AU, in the J2000 ecliptic frame (x towards
 * the J2000 equinox, z towards the ecliptic's north pole); "earth" is the
 * Earth–Moon barycentre. Times are Julian Dates in TT (JPL's T_eph, within
 * 2 ms of it).
 */

interface Elements {
  /** Semi-major axis, AU. */
  a: number;
  /** Eccentricity. */
  e: number;
  /** Inclination to the J2000 ecliptic, degrees. */
  I: number;
  /** Mean longitude, degrees. */
  L: number;
  /** Longitude of perihelion, degrees. */
  peri: number;
  /** Longitude of the ascending node, degrees. */
  node: number;
}

interface Row {
  /** Values at J2000.0. */
  at: Elements;
  /** Rates, per Julian century. */
  rate: Elements;
  /** Table 2b's extra terms in the mean anomaly: b T² + c cos(fT) + s sin(fT), degrees (f in degrees per century). */
  extra?: { b: number; c: number; s: number; f: number };
}

const row = (at: number[], rate: number[], extra?: number[]): Row => {
  const els = ([a, e, I, L, peri, node]: number[]): Elements => ({ a, e, I, L, peri, node });
  return { at: els(at), rate: els(rate), extra: extra && { b: extra[0], c: extra[1], s: extra[2], f: extra[3] } };
};

/** Table 1: mean ecliptic and equinox of J2000, valid 1800–2050. */
const TABLE_1: Readonly<Record<PlanetName, Row>> = {
  mercury: row(
    [0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593],
    [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
  ),
  venus: row(
    [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255],
    [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418],
  ),
  earth: row(
    [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
    [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
  ),
  mars: row(
    [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
  ),
  jupiter: row(
    [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
  ),
  saturn: row(
    [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
    [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
  ),
  uranus: row(
    [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503],
    [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
  ),
  neptune: row(
    [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
    [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664],
  ),
};

/** Tables 2a and 2b: mean ecliptic and equinox of J2000, valid 3000 BC to AD 3000. */
const TABLE_2: Readonly<Record<PlanetName, Row>> = {
  mercury: row(
    [0.38709843, 0.20563661, 7.00559432, 252.25166724, 77.45771895, 48.33961819],
    [0.0, 0.00002123, -0.00590158, 149472.67486623, 0.15940013, -0.12214182],
  ),
  venus: row(
    [0.72332102, 0.00676399, 3.39777545, 181.9797085, 131.76755713, 76.67261496],
    [-0.00000026, -0.00005107, 0.00043494, 58517.8156026, 0.05679648, -0.27274174],
  ),
  earth: row(
    [1.00000018, 0.01673163, -0.00054346, 100.46691572, 102.93005885, -5.11260389],
    [-0.00000003, -0.00003661, -0.01337178, 35999.37306329, 0.3179526, -0.24123856],
  ),
  mars: row(
    [1.52371243, 0.09336511, 1.85181869, -4.56813164, -23.91744784, 49.71320984],
    [0.00000097, 0.00009149, -0.00724757, 19140.29934243, 0.45223625, -0.26852431],
  ),
  jupiter: row(
    [5.20248019, 0.0485359, 1.29861416, 34.33479152, 14.27495244, 100.29282654],
    [-0.00002864, 0.00018026, -0.00322699, 3034.90371757, 0.18199196, 0.13024619],
    [-0.00012452, 0.0606406, -0.35635438, 38.35125],
  ),
  saturn: row(
    [9.54149883, 0.05550825, 2.49424102, 50.07571329, 92.86136063, 113.63998702],
    [-0.00003065, -0.00032044, 0.00451969, 1222.11494724, 0.54179478, -0.25015002],
    [0.00025899, -0.13434469, 0.87320147, 38.35125],
  ),
  uranus: row(
    [19.18797948, 0.0468574, 0.77298127, 314.20276625, 172.43404441, 73.96250215],
    [-0.00020455, -0.0000155, -0.00180155, 428.49512595, 0.09266985, 0.05739699],
    [0.00058331, -0.97731848, 0.17689245, 7.67025],
  ),
  neptune: row(
    [30.06952752, 0.00895439, 1.7700552, 304.22289287, 46.68158724, 131.78635853],
    [0.00006447, 0.00000818, 0.000224, 218.46515314, 0.01009938, -0.00606302],
    [-0.00041348, 0.68346318, -0.10162547, 7.67025],
  ),
};

/** The obliquity of the J2000 ecliptic that JPL uses with these elements: 23.43928°. */
export const J2000_OBLIQUITY = 23.43928 * DEG;

/** Whether planet positions can be computed for a Julian Date: 3000 BC (year −2999) to AD 3000, inclusive. */
export function planetsValidAt(jdTT: number): boolean {
  const { year } = calendarFromJd(jdTT);
  return year >= -2999 && year <= 3000;
}

/** Which table applies: Table 1 for 1800–2050, Tables 2a and 2b otherwise. */
export function standishTable(jdTT: number): 1 | 2 {
  const epoch = julianEpoch(jdTT);
  return epoch >= 1800 && epoch <= 2050 ? 1 : 2;
}

/** A planet's osculating-style elements at a Julian Date (TT), with its mean anomaly. Angles in radians, a in AU. */
export function planetElements(planet: PlanetName, jdTT: number, table = standishTable(jdTT)) {
  const r = (table === 1 ? TABLE_1 : TABLE_2)[planet];
  const T = julianCenturies(jdTT);
  const at = (k: keyof Elements) => r.at[k] + r.rate[k] * T;
  const L = at('L');
  const peri = at('peri');
  let M = L - peri;
  if (r.extra) {
    const { b, c, s, f } = r.extra;
    M += b * T * T + c * Math.cos(f * T * DEG) + s * Math.sin(f * T * DEG);
  }
  return {
    a: at('a'),
    e: at('e'),
    inclination: at('I') * DEG,
    node: at('node') * DEG,
    /** Argument of perihelion ω = ϖ − Ω. */
    argPeri: (peri - at('node')) * DEG,
    meanAnomaly: wrapPi(M * DEG),
  };
}

/**
 * The giant planets' masses as fractions of the Sun's (IAU 2009 / DE430
 * values), for finding how far the Sun sits from the Solar System's centre of
 * mass.
 */
const GIANT_MASSES: readonly [PlanetName, number][] = [
  ['jupiter', 1 / 1047.348_644],
  ['saturn', 1 / 3497.901_768],
  ['uranus', 1 / 22_902.98],
  ['neptune', 1 / 19_412.26],
];

/**
 * Standish's elements for Uranus and Neptune follow their orbits about the
 * Solar System's barycentre, not about the Sun: against JPL's DE441 they fit
 * barycentric positions to about 10″ but heliocentric ones only to about a
 * minute of arc, because the Sun itself circles the barycentre (by up to about
 * 0.01 AU, driven mostly by Jupiter). Their heliocentric positions are found by
 * subtracting the Sun's offset.
 */
const BARYCENTRIC: ReadonlySet<PlanetName> = new Set(['uranus', 'neptune']);

/** Where the Sun is relative to the Solar System's barycentre, from the four giant planets: AU, J2000 ecliptic. */
export function sunFromBarycentre(jdTT: number): Vec3 {
  let x = 0;
  let y = 0;
  let z = 0;
  let total = 1;
  for (const [planet, mu] of GIANT_MASSES) {
    const [px, py, pz] = keplerPosition(planet, jdTT);
    x -= mu * px;
    y -= mu * py;
    z -= mu * pz;
    total += mu;
  }
  return [x / total, y / total, z / total];
}

/**
 * A planet's heliocentric position at a Julian Date (TT): AU, in the J2000
 * ecliptic frame. Throws outside 3000 BC–AD 3000 (check planetsValidAt first).
 */
export function heliocentricEcliptic(planet: PlanetName, jdTT: number): Vec3 {
  if (!planetsValidAt(jdTT)) throw new RangeError('Planet positions are only computed for 3000 BC to AD 3000');
  const p = keplerPosition(planet, jdTT);
  if (!BARYCENTRIC.has(planet)) return p;
  const sun = sunFromBarycentre(jdTT);
  return [p[0] - sun[0], p[1] - sun[1], p[2] - sun[2]];
}

/** The position on the Keplerian orbit given by a planet's elements: AU, J2000 ecliptic. */
function keplerPosition(planet: PlanetName, jdTT: number): Vec3 {
  const { a, e, inclination: I, node: O, argPeri: w, meanAnomaly } = planetElements(planet, jdTT);
  const E = eccentricAnomaly(meanAnomaly, e);
  // In the orbit's own plane, with x towards perihelion…
  const x = a * (Math.cos(E) - e);
  const y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  // …then turned into the ecliptic frame (JPL's explicit form of Rz(Ω) Rx(I) Rz(ω)).
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const cO = Math.cos(O);
  const sO = Math.sin(O);
  const cI = Math.cos(I);
  const sI = Math.sin(I);
  return [
    (cw * cO - sw * sO * cI) * x + (-sw * cO - cw * sO * cI) * y,
    (cw * sO + sw * cO * cI) * x + (-sw * sO + cw * cO * cI) * y,
    sw * sI * x + cw * sI * y,
  ];
}

/** A vector in the J2000 ecliptic frame turned into the J2000 equatorial frame (same units). */
export function equatorialFromEclipticJ2000(v: Vec3): Vec3 {
  return rotateX(v, J2000_OBLIQUITY);
}
