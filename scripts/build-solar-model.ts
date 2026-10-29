/**
 * Builds src/data/solarModel.json, the Sun's insides from a standard solar
 * model: J. Christensen-Dalsgaard's "Model S" (Christensen-Dalsgaard et al.
 * 1996, Science 272, 1286), the reference model for helioseismology, in its
 * GONG format (fgong.l5bi.d.15, the corrected 2018 copy) from
 * users-phys.au.dk/jcd/solar_models/. The model is published for anyone to use,
 * with that citation.
 *
 *   node scripts/build-solar-model.ts
 *
 * The raw file (1 MB) is downloaded once into scripts/.cache/solar/. The output
 * keeps about 120 shells, evenly spaced in radius with extra ones near the
 * surface, in SI units.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const URL = 'https://users-phys.au.dk/jcd/solar_models/fgong.l5bi.d.15';
const CACHE = 'scripts/.cache/solar/fgong.l5bi.d.15';
const OUT = 'src/data/solarModel.json';

async function download(): Promise<string> {
  if (!existsSync(CACHE)) {
    console.log(`Downloading ${URL}`);
    const response = await fetch(URL);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    mkdirSync('scripts/.cache/solar', { recursive: true });
    writeFileSync(CACHE, await response.text());
  }
  return readFileSync(CACHE, 'utf8');
}

const text = await download();
const lines = text.split(/\r?\n/);
// Four lines of comments, then the counts: points, global constants, variables per point.
const [nn, iconst, ivar] = lines[4].trim().split(/\s+/).map(Number);
// Numbers are written 16 characters wide with no gaps between them, so read them by pattern.
const numbers = lines
  .slice(5)
  .join('')
  .match(/[-+]?\d\.\d+E[-+]\d+/gi)!
  .map(Number);
if (numbers.length !== iconst + nn * ivar) throw new Error(`Expected ${iconst + nn * ivar} numbers, found ${numbers.length}`);
const glob = numbers.slice(0, iconst);
const [M, R, L] = glob; // grams, centimetres, erg/s
const variable = (point: number, v: number) => numbers[iconst + point * ivar + v - 1];

// The GONG format's variables (Christensen-Dalsgaard's file-format note): 1 r (cm), 2 ln(m/M), 3 T (K), 4 P (dyn/cm²),
// 5 ρ (g/cm³), 6 X, 7 L(r) (erg/s), 8 κ (cm²/g), 9 ε (erg/g/s), 15 the Ledoux discriminant A (positive where stable).
// Points run from the surface to the centre.
const points = Array.from({ length: nn }, (_, k) => ({
  r: variable(k, 1) / R,
  m: Math.exp(variable(k, 2)),
  T: variable(k, 3),
  P: variable(k, 4) / 10, // Pa
  rho: variable(k, 5) * 1000, // kg/m³
  X: variable(k, 6),
  Lr: variable(k, 7) / L,
  A: variable(k, 15),
})).reverse();

/** Linear interpolation of a variable at a fractional radius. */
function at(r: number, key: keyof (typeof points)[number]): number {
  let i = points.findIndex((p) => p.r >= r);
  if (i <= 0) i = 1;
  const a = points[i - 1];
  const b = points[i];
  const f = (r - a.r) / (b.r - a.r);
  return a[key] + f * (b[key] - a[key]);
}

// The base of the convection zone: the outermost point, going in, where the Ledoux discriminant turns clearly positive (stable).
let base = 0;
for (let k = points.length - 1; k > 0; k--) {
  if (points[k].r < 0.95 && points[k].A > 1e-4) {
    base = points[k].r;
    break;
  }
}
// The radius inside which 99% of the power is made.
const core99 = points.find((p) => p.Lr >= 0.99)!.r;

const radii = [...Array.from({ length: 96 }, (_, i) => i / 100), ...Array.from({ length: 21 }, (_, i) => 0.96 + i * 0.002)];
const sig = (x: number, d = 4) => Number(x.toPrecision(d));
const shells = radii.map((r) => ({
  r: sig(r, 4),
  T: sig(at(r, 'T')),
  rho: sig(at(r, 'rho')),
  P: sig(at(r, 'P')),
  m: sig(at(r, 'm')),
  L: sig(Math.max(0, at(r, 'Lr'))),
  X: sig(at(r, 'X')),
}));
shells[0] = { r: 0, T: sig(points[0].T), rho: sig(points[0].rho), P: sig(points[0].P), m: 0, L: 0, X: sig(points[0].X) };

const out = {
  source: 'Model S: J. Christensen-Dalsgaard and colleagues (1996), Science 272, 1286 (fgong.l5bi.d.15, users-phys.au.dk/jcd/solar_models)',
  units: 'r, m and L as fractions of the Sun’s radius, mass and luminosity; T in K; rho in kg/m³; P in Pa; X the mass fraction of hydrogen',
  age: glob[12], // years
  mass: M / 1000,
  radius: R / 100,
  luminosity: L / 1e7,
  convectionBase: sig(base),
  core99: sig(core99, 3),
  surface: { T: sig(points[points.length - 1].T), X: sig(points[points.length - 1].X) },
  shells,
};
writeFileSync(OUT, JSON.stringify(out));
console.log(
  `Wrote ${OUT}: ${shells.length} shells; centre ${shells[0].T.toExponential(3)} K, ${(shells[0].rho / 1000).toFixed(1)} g/cm³, X ${shells[0].X}; convection from ${base.toFixed(4)} R; 99% of the power inside ${core99.toFixed(3)} R; age ${glob[12]}`,
);
