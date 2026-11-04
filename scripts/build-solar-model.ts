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
 * surface, in SI units: radius, mass and luminosity inside, temperature,
 * density, pressure, make-up (X, Z), opacity, the burning rate, Γ₁, and the
 * actual, adiabatic and radiative temperature gradients.
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
// 5 ρ (g/cm³), 6 X, 7 L(r) (erg/s), 8 κ (cm²/g), 9 ε (erg/g/s), 10 Γ₁, 11 ∇_ad, 15 the Ledoux discriminant A (positive
// where stable), 17 Z. Points run from the surface to the centre.
const points = Array.from({ length: nn }, (_, k) => ({
  r: variable(k, 1) / R,
  m: Math.exp(variable(k, 2)),
  T: variable(k, 3),
  P: variable(k, 4) / 10, // Pa
  rho: variable(k, 5) * 1000, // kg/m³
  X: variable(k, 6),
  Lr: variable(k, 7) / L,
  kappa: variable(k, 8) / 10, // m²/kg
  eps: variable(k, 9) / 1e4, // W/kg
  gamma1: variable(k, 10),
  nablaAd: variable(k, 11),
  A: variable(k, 15),
  Z: variable(k, 17),
  nabla: 0,
  nablaRad: 0,
})).reverse();

// The actual temperature gradient ∇ = d ln T / d ln P, from neighbouring points, and the radiative gradient
// ∇_rad = 3κLP/(16πacGmT⁴): the gradient radiation alone would need to carry the luminosity (cgs here).
const G_CGS = glob[14] || 6.67232e-8;
const A_CGS = 7.5657e-15;
const C_CGS = 2.99792458e10;
const gradients = points.map((p, k) => {
  const a = points[Math.max(0, k - 1)];
  const b = points[Math.min(points.length - 1, k + 1)];
  const nabla = Math.log(b.T / a.T) / Math.log(b.P / a.P);
  const m = p.m * M;
  const nablaRad = m > 0 ? (3 * p.kappa * 10 * p.Lr * L * p.P * 10) / (16 * Math.PI * A_CGS * C_CGS * G_CGS * m * p.T ** 4) : NaN;
  return { nabla, nablaRad };
});
for (let k = 0; k < points.length; k++) Object.assign(points[k], gradients[k]);
// At the centre ∇_rad is a limit (L/m → ε): take the next point's.
points[0].nablaRad = points[1].nablaRad;

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
  Z: sig(at(r, 'Z'), 3),
  kappa: sig(at(r, 'kappa'), 3),
  eps: sig(Math.max(0, at(r, 'eps')), 3),
  gamma1: sig(at(r, 'gamma1'), 4),
  nablaAd: sig(at(r, 'nablaAd'), 3),
  nabla: sig(at(r, 'nabla'), 3),
  nablaRad: sig(at(r, 'nablaRad'), 3),
}));
const c0 = points[0];
shells[0] = {
  ...shells[0],
  r: 0,
  T: sig(c0.T),
  rho: sig(c0.rho),
  P: sig(c0.P),
  m: 0,
  L: 0,
  X: sig(c0.X),
  kappa: sig(c0.kappa, 3),
  eps: sig(c0.eps, 3),
  gamma1: sig(c0.gamma1, 4),
  nablaAd: sig(c0.nablaAd, 3),
};

const out = {
  source: 'Model S: J. Christensen-Dalsgaard and colleagues (1996), Science 272, 1286 (fgong.l5bi.d.15, users-phys.au.dk/jcd/solar_models)',
  units: 'r, m and L as fractions of the Sun’s radius, mass and luminosity; T in K; rho in kg/m³; P in Pa; X and Z the mass fractions of hydrogen and metals; kappa in m²/kg; eps in W/kg; gamma1 = (dlnP/dlnρ) at constant entropy; nabla, nablaAd and nablaRad = dlnT/dlnP actual, adiabatic and needed by radiation alone',
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
