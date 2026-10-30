/**
 * Builds src/data/gaia/clusters.json: the colour–magnitude diagrams of six star
 * clusters (the Pleiades, the Hyades, Praesepe, M67, NGC 188 and 47 Tucanae)
 * from Gaia Data Release 3 (ESA/Gaia/DPAC; CC BY-NC 3.0 IGO), for Figure 17.3.
 * The output is a derived work under the same licence and is kept in its own
 * folder.
 *
 * Hunt & Reffert's (2023) member lists would do as well, but VizieR is out of
 * reach from here (as in Stages 11 and 12), so members are chosen the classic
 * way, straight from Gaia's archive: stars near the cluster's centre whose
 * motions and parallaxes match the cluster's. Each cluster starts from its
 * published centre, motion and parallax (Cantat-Gaudin et al. 2018; Vasiliev &
 * Baumgardt 2021 for 47 Tucanae) and the selection is iterated: the members'
 * own mean motion and parallax replace the starting values.
 *
 * - Near clusters (the Pleiades, the Hyades, Praesepe) are chosen by velocity,
 *   not proper motion: the cluster's space velocity is fitted to its members
 *   (with Gaia's radial velocities where it has them) and each star's proper
 *   motion is compared with what that velocity gives at its place and parallax.
 *   This allows for the Hyades, which spread over many degrees, converging.
 * - Far clusters (M67, NGC 188, 47 Tucanae) are chosen by proper motion, with
 *   each star's parallax consistent with the cluster's. 47 Tucanae's crowded
 *   middle is left out.
 *
 * Every star needs a colour, RUWE < 1.4 and a clean BP/RP excess (as in
 * build-hr.ts), except the brightest (G < 7), which often fail those cuts
 * near Gaia's saturation: the Pleiades' brightest stars would be lost. Distances and reddenings are the literature's (in CLUSTERS),
 * except that the near clusters' distances come from their members' mean
 * parallax (with Lindegren et al.'s mean zero point, +0.017 mas).
 *
 *   npx tsx scripts/build-clusters.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const TAP = 'https://gea.esac.esa.int/tap-server/tap/sync';
const CACHE = 'scripts/.cache/gaia/clusters';
const OUT = 'src/data/gaia/clusters.json';
const KMS = 4.740_47; // km/s per (mas/yr ÷ mas)
const ZERO_POINT = 0.017; // mas, added to Gaia's parallaxes
/** Stars brighter than this (G) skip the quality cuts, which the brightest stars, near Gaia's saturation, often fail. */
const BRIGHT = 7;

interface ClusterSpec {
  id: string;
  name: string;
  ra: number;
  dec: number;
  /** Search radius, degrees; and an inner radius left out for crowding. */
  radius: number;
  inner?: number;
  pmra: number;
  pmdec: number;
  parallax: number;
  /** Near clusters: how far a member's velocity may stray, km/s. Far clusters: its proper motion, mas/yr. */
  near: boolean;
  window: number;
  gMax: number;
  /** Literature: distance (pc) where Gaia's parallax won't do; E(B − V); [Fe/H]; age range (Myr) with its source. */
  distance?: number;
  ebv: number;
  feh: number;
  age: [number, number];
  ageSource: string;
  maxStars: number;
}

const CLUSTERS: ClusterSpec[] = [
  { id: 'pleiades', name: 'The Pleiades', ra: 56.75, dec: 24.12, radius: 4, pmra: 20.0, pmdec: -45.5, parallax: 7.36, near: true, window: 2.5, gMax: 19, ebv: 0.04, feh: 0.0, age: [110, 125], ageSource: 'Dahm (2015), lithium depletion: 112 ± 5 Myr; turn-off fits 100–125', maxStars: 1500 },
  { id: 'hyades', name: 'The Hyades', ra: 67.0, dec: 16.5, radius: 9, pmra: 101.0, pmdec: -28.0, parallax: 21.0, near: true, window: 3, gMax: 19, ebv: 0.0, feh: 0.15, age: [625, 750], ageSource: 'Perryman et al. (1998), 625 ± 50 Myr; Brandt & Huang (2015), 750 ± 100', maxStars: 1500 },
  { id: 'praesepe', name: 'Praesepe', ra: 130.05, dec: 19.62, radius: 3, pmra: -36.05, pmdec: -12.92, parallax: 5.37, near: true, window: 2.5, gMax: 19, ebv: 0.027, feh: 0.15, age: [600, 750], ageSource: 'Gossage et al. (2018); Brandt & Huang (2015)', maxStars: 1500 },
  { id: 'm67', name: 'M67', ra: 132.846, dec: 11.814, radius: 0.7, pmra: -10.97, pmdec: -2.94, parallax: 1.135, near: false, window: 0.6, gMax: 19, ebv: 0.04, feh: 0.0, age: [3500, 4500], ageSource: 'Barnes et al. (2016), 4.2 ± 0.7 Gyr; Sarajedini et al. (2009), 3.5–4', maxStars: 1500 },
  { id: 'ngc188', name: 'NGC 188', ra: 12.11, dec: 85.24, radius: 0.6, pmra: -2.31, pmdec: -0.96, parallax: 0.508, near: false, window: 0.5, gMax: 19, ebv: 0.087, feh: 0.0, age: [6000, 7500], ageSource: 'Meibom et al. (2009), 6.2 ± 0.2 Gyr; Sarajedini et al. (1999), 7 ± 0.5', maxStars: 1500 },
  { id: '47tuc', name: '47 Tucanae', ra: 6.024, dec: -72.081, radius: 0.4, inner: 0.1, pmra: 5.25, pmdec: -2.55, parallax: 0.22, near: false, window: 0.8, gMax: 19.5, distance: 4520, ebv: 0.04, feh: -0.72, age: [11000, 13000], ageSource: 'Thompson et al. (2020), 11.8 ± 0.2 Gyr; Dotter et al. (2010), 12.75', maxStars: 3000 },
];

const deg = Math.PI / 180;

async function download(c: ClusterSpec): Promise<string> {
  const path = `${CACHE}/${c.id}.csv`;
  if (!existsSync(path)) {
    // A generous first cut on the archive; the real selection is made below.
    const pmBox = c.near ? 60 : 5;
    const plxMin = c.near ? c.parallax * 0.55 : -2;
    const plxMax = c.near ? c.parallax * 1.6 : 3;
    const query = `SELECT source_id, ra, dec, parallax, parallax_error, pmra, pmra_error, pmdec, pmdec_error, radial_velocity, radial_velocity_error, phot_g_mean_mag, bp_rp, ruwe
FROM gaiadr3.gaia_source
WHERE 1 = CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', ${c.ra}, ${c.dec}, ${c.radius}))
AND bp_rp IS NOT NULL AND phot_g_mean_mag < ${c.gMax}
AND ((ruwe < 1.4 AND phot_bp_rp_excess_factor BETWEEN 1.0 + 0.015*bp_rp*bp_rp AND 1.3 + 0.06*bp_rp*bp_rp) OR phot_g_mean_mag < ${BRIGHT})
AND parallax BETWEEN ${plxMin} AND ${plxMax}
AND pmra BETWEEN ${c.pmra - pmBox} AND ${c.pmra + pmBox} AND pmdec BETWEEN ${c.pmdec - pmBox} AND ${c.pmdec + pmBox}`;
    console.log(`Querying the Gaia archive for ${c.name}`);
    const body = new URLSearchParams({ REQUEST: 'doQuery', LANG: 'ADQL', FORMAT: 'csv', QUERY: query });
    const response = await fetch(TAP, { method: 'POST', body });
    if (!response.ok) throw new Error(`${c.name}: ${response.status} ${await response.text()}`);
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(path, await response.text());
  }
  return readFileSync(path, 'utf8');
}

interface Star {
  ra: number;
  dec: number;
  plx: number;
  ePlx: number;
  pmra: number;
  ePmra: number;
  pmdec: number;
  ePmdec: number;
  rv: number | null;
  g: number;
  bpRp: number;
}

function parse(csv: string): Star[] {
  const [head, ...rows] = csv.trim().split(/\r?\n/);
  const cols = head.split(',');
  const at = (name: string) => cols.indexOf(name);
  const i = { ra: at('ra'), dec: at('dec'), plx: at('parallax'), ePlx: at('parallax_error'), pmra: at('pmra'), ePmra: at('pmra_error'), pmdec: at('pmdec'), ePmdec: at('pmdec_error'), rv: at('radial_velocity'), g: at('phot_g_mean_mag'), bpRp: at('bp_rp') };
  return rows.map((row) => {
    const f = row.split(',');
    const n = (k: number) => Number(f[k]);
    return { ra: n(i.ra), dec: n(i.dec), plx: n(i.plx), ePlx: n(i.ePlx), pmra: n(i.pmra), ePmra: n(i.ePmra), pmdec: n(i.pmdec), ePmdec: n(i.ePmdec), rv: f[i.rv] ? n(i.rv) : null, g: n(i.g), bpRp: n(i.bpRp) };
  });
}

/** Unit vectors towards a star and along increasing RA and Dec, ICRS. */
function basis(ra: number, dec: number) {
  const a = ra * deg;
  const d = dec * deg;
  return {
    r: [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)],
    ea: [-Math.sin(a), Math.cos(a), 0],
    ed: [-Math.sin(d) * Math.cos(a), -Math.sin(d) * Math.sin(a), Math.cos(d)],
  };
}
const dot = (u: number[], v: number[]) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];

/** The space velocity (km/s, ICRS) that best fits the members' tangential velocities and radial velocities. */
function fitVelocity(stars: Star[]): number[] {
  // Normal equations for V in rows (e · V = observed).
  const A = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const b = [0, 0, 0];
  const add = (e: number[], y: number, w: number) => {
    for (let p = 0; p < 3; p++) {
      b[p] += w * e[p] * y;
      for (let q = 0; q < 3; q++) A[p][q] += w * e[p] * e[q];
    }
  };
  for (const s of stars) {
    const { r, ea, ed } = basis(s.ra, s.dec);
    add(ea, (KMS * s.pmra) / s.plx, 1);
    add(ed, (KMS * s.pmdec) / s.plx, 1);
    // Radial velocities of hot stars, with few lines, are poor; only cooler, well-measured ones help.
    if (s.rv !== null && s.g < 14 && s.bpRp > 0.5) add(r, s.rv, 1);
  }
  // Solve by Cramer's rule.
  const det = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(A);
  return [0, 1, 2].map((k) => det(A.map((row, p) => row.map((x, q) => (q === k ? b[p] : x)))) / D);
}

function separation(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const u = basis(ra1, dec1).r;
  const v = basis(ra2, dec2).r;
  return Math.acos(Math.min(1, dot(u, v))) / deg;
}

function select(c: ClusterSpec, all: Star[]): { members: Star[]; parallax: number } {
  const inRing = all.filter((s) => {
    const sep = separation(s.ra, s.dec, c.ra, c.dec);
    return sep <= c.radius && sep >= (c.inner ?? 0);
  });
  let members: Star[] = [];
  let parallax = c.parallax;
  if (c.near) {
    // Start from the published motion, as a velocity at the centre.
    const { r, ea, ed } = basis(c.ra, c.dec);
    const vt = [(KMS * c.pmra) / c.parallax, (KMS * c.pmdec) / c.parallax];
    // A first guess at V with no radial part, refined from the members' own motions.
    let V = [0, 1, 2].map((k) => vt[0] * ea[k] + vt[1] * ed[k] + 0 * r[k]);
    let window = c.window * 3;
    for (let pass = 0; pass < 6; pass++) {
      members = inRing.filter((s) => {
        if (s.plx / s.ePlx < 5) return false;
        if (Math.abs(1000 / s.plx - 1000 / parallax) > 0.25 * (1000 / parallax) + 3 * (1000 * s.ePlx) / (s.plx * s.plx)) return false;
        const b = basis(s.ra, s.dec);
        const da = (KMS * s.pmra) / s.plx - dot(V, b.ea);
        const dd = (KMS * s.pmdec) / s.plx - dot(V, b.ed);
        // The velocity's error, from the proper motion's and from the parallax's (which scales the whole velocity).
        const vt = (KMS * Math.hypot(s.pmra, s.pmdec)) / s.plx;
        const err = Math.hypot((KMS * Math.hypot(s.ePmra, s.ePmdec)) / s.plx, (vt * s.ePlx) / s.plx);
        return Math.hypot(da, dd) < Math.hypot(window, 2 * err);
      });
      V = fitVelocity(members);
      parallax = members.reduce((sum, s) => sum + s.plx, 0) / members.length;
      window = Math.max(c.window, window * 0.6);
    }
    console.log(`  ${c.name}: V = (${V.map((v) => v.toFixed(2)).join(', ')}) km/s, |V| = ${Math.hypot(...V).toFixed(1)}`);
  } else {
    let pm = [c.pmra, c.pmdec];
    for (let pass = 0; pass < 4; pass++) {
      members = inRing.filter((s) => {
        const dp = Math.hypot(s.pmra - pm[0], s.pmdec - pm[1]);
        if (dp > Math.hypot(c.window, 2.5 * Math.hypot(s.ePmra, s.ePmdec))) return false;
        return Math.abs(s.plx - parallax) < 3 * Math.hypot(s.ePlx, 0.05);
      });
      pm = [members.reduce((a, s) => a + s.pmra, 0) / members.length, members.reduce((a, s) => a + s.pmdec, 0) / members.length];
      // Weighted mean parallax of the better-measured members.
      const good = members.filter((s) => s.ePlx < 0.1);
      const w = good.map((s) => 1 / (s.ePlx * s.ePlx));
      parallax = good.reduce((a, s, k) => a + s.plx * w[k], 0) / w.reduce((a, x) => a + x, 0);
    }
    console.log(`  ${c.name}: proper motion (${pm.map((v) => v.toFixed(3)).join(', ')}) mas/yr`);
  }
  return { members, parallax };
}

/** A small seeded generator (mulberry32), so the sample is the same every build. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const out = [];
for (const c of CLUSTERS) {
  const all = parse(await download(c));
  const { members, parallax } = select(c, all);
  const distance = c.distance ?? Math.round(1000 / (parallax + ZERO_POINT));
  let kept = members;
  if (members.length > c.maxStars) {
    const random = seeded(2026);
    kept = [...members];
    for (let i = kept.length - 1; i > 0; i--) {
      const k = Math.floor(random() * (i + 1));
      [kept[i], kept[k]] = [kept[k], kept[i]];
    }
    // Keep every bright star (the turn-off and giants are few) and sample the rest.
    const bright = members.filter((s) => s.g < 5 * Math.log10(distance) - 5 + 2.5);
    const faint = kept.filter((s) => !bright.includes(s)).slice(0, Math.max(0, c.maxStars - bright.length));
    kept = [...bright, ...faint];
  }
  kept.sort((a, b) => a.g - b.g);
  console.log(`  ${c.name}: ${all.length} queried, ${members.length} members, ${kept.length} kept, parallax ${parallax.toFixed(3)} mas, ${distance} pc`);
  out.push({
    id: c.id,
    name: c.name,
    members: members.length,
    distance,
    distanceSource: c.distance ? 'Baumgardt & Vasiliev (2021)' : 'the members’ mean Gaia parallax',
    ebv: c.ebv,
    feh: c.feh,
    age: c.age,
    ageSource: c.ageSource,
    stars: kept.flatMap((s) => [Math.round(s.bpRp * 1000), Math.round(s.g * 100)]),
  });
}

mkdirSync('src/data/gaia', { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify({
    source: 'Gaia Data Release 3 (ESA/Gaia/DPAC, 2022): members chosen by position, proper motion (or velocity) and parallax; see scripts/build-clusters.ts',
    licence: 'CC BY-NC 3.0 IGO (https://creativecommons.org/licenses/by-nc/3.0/igo/). This file is derived from Gaia DR3 and is shared under the same licence.',
    units: { stars: 'pairs: (G_BP − G_RP) × 1000, apparent G × 100', distance: 'pc', ebv: 'E(B − V), magnitudes', age: 'Myr' },
    clusters: out,
  }) + '\n',
);
console.log(`Wrote ${OUT}`);
