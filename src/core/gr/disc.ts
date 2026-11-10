import { AMU, C, G, H, K_B, L_SUN, M_E, M_SUN, PROTON_ELECTRON_MASS_RATIO, SIGMA } from '../constants';

/**
 * Accretion discs round black holes: the innermost stable orbit and the
 * energy gas gives out falling to it, the Eddington limit, and a thin disc's
 * temperature and light (Shakura & Sunyaev 1973).
 *
 * Units: SI (kg, m, W, K) at the edges; spins as the dimensionless a = Jc/GM².
 */

const M_P = M_E * PROTON_ELECTRON_MASS_RATIO;
/** Thomson's cross-section for an electron, m². */
export const SIGMA_T = 6.6524587e-29;

/** The innermost stable circular orbit of a black hole spinning at a (0 to 1), for gas orbiting the way it spins, in GM/c² (Bardeen, Press & Teukolsky 1972). */
export function iscoRadius(a: number): number {
  const z1 = 1 + Math.cbrt(1 - a * a) * (Math.cbrt(1 + a) + Math.cbrt(1 - a));
  const z2 = Math.sqrt(3 * a * a + z1 * z1);
  return 3 + z2 - Math.sqrt((3 - z1) * (3 + z1 + 2 * z2));
}

/** The share of its rest-mass energy gas gives out on reaching the innermost stable orbit, 1 − E_isco = 1 − √(1 − 2/3r_isco). */
export function accretionEfficiency(a: number): number {
  return 1 - Math.sqrt(1 - 2 / (3 * iscoRadius(a)));
}

/** The Eddington luminosity 4πGMm_pc/σ_T for a mass (kg) of hydrogen gas, W. */
export function eddingtonLuminosity(massKg: number): number {
  return (4 * Math.PI * G * massKg * M_P * C) / SIGMA_T;
}

/** The gravitational radius GM/c² of a mass (kg), m. */
export function gravitationalRadius(massKg: number): number {
  return (G * massKg) / (C * C);
}

export interface Disc {
  massKg: number;
  spin: number;
  /** Luminosity, W, and as a share of Eddington's. */
  luminosity: number;
  eddingtonShare: number;
  /** The gas it swallows, kg/s, at the relativistic efficiency. */
  accretionRate: number;
  efficiency: number;
  /** Inner edge (the innermost stable orbit), m and GM/c². */
  rIn: number;
  rInGravitational: number;
  /** The temperature scale T* = (3GMṀ'/8πσr_in³)^¼ and the hottest the disc gets (0.488 T*, at 49/36 r_in), K. */
  tStar: number;
  tMax: number;
}

/**
 * A thin disc round a black hole of mass M (kg) spinning at a, shining at a
 * share of its Eddington luminosity. The disc is Newtonian with its inner edge
 * at the relativistic innermost orbit, scaled so that its light adds up to L:
 * its temperatures use Ṁ' = 2r_in L/GM, the rate at which a Newtonian disc
 * would give out L.
 */
export function makeDisc(massKg: number, spin: number, eddingtonShare: number): Disc {
  const L = eddingtonShare * eddingtonLuminosity(massKg);
  const efficiency = accretionEfficiency(spin);
  const rg = gravitationalRadius(massKg);
  const rInG = iscoRadius(spin);
  const rIn = rInG * rg;
  const mdotNewton = (2 * rIn * L) / (G * massKg);
  const tStar = ((3 * G * massKg * mdotNewton) / (8 * Math.PI * SIGMA * rIn ** 3)) ** 0.25;
  return {
    massKg,
    spin,
    luminosity: L,
    eddingtonShare,
    accretionRate: L / (efficiency * C * C),
    efficiency,
    rIn,
    rInGravitational: rInG,
    tStar,
    tMax: tStar * maxTemperatureFactor(),
  };
}

/** The disc's temperature at r (m): T*(r_in/r)^¾ (1 − √(r_in/r))^¼. */
export function discTemperature(disc: Disc, r: number): number {
  if (r <= disc.rIn) return 0;
  const x = disc.rIn / r;
  return disc.tStar * x ** 0.75 * (1 - Math.sqrt(x)) ** 0.25;
}

/** max over x of x^¾(1 − √x)^¼, at x = 36/49: 0.488. */
export function maxTemperatureFactor(): number {
  const x = 36 / 49;
  return x ** 0.75 * (1 - Math.sqrt(x)) ** 0.25;
}

/** Planck's B_ν(T), W m⁻² Hz⁻¹ sr⁻¹. */
function planckNu(nu: number, T: number): number {
  const x = (H * nu) / (K_B * T);
  if (x > 700) return 0;
  return ((2 * H * nu ** 3) / (C * C)) / Math.expm1(x);
}

/**
 * The disc's spectrum as νL_ν (W) at each wavelength (m): both faces of
 * annuli from r_in out to 10⁵ r_in, each glowing as a black body.
 */
export function discSpectrum(disc: Disc, wavelengths: readonly number[], rings = 240): { wavelength: number; nuLnu: number }[] {
  const lnIn = Math.log(disc.rIn);
  const lnOut = Math.log(disc.rIn * 1e5);
  const temps: { area: number; T: number }[] = [];
  for (let i = 0; i < rings; i++) {
    const r0 = Math.exp(lnIn + ((lnOut - lnIn) * i) / rings);
    const r1 = Math.exp(lnIn + ((lnOut - lnIn) * (i + 1)) / rings);
    const r = Math.sqrt(r0 * r1);
    temps.push({ area: 2 * Math.PI * (r1 * r1 - r0 * r0), T: discTemperature(disc, r) }); // both faces
  }
  return wavelengths.map((lambda) => {
    const nu = C / lambda;
    let Lnu = 0;
    for (const t of temps) if (t.T > 0) Lnu += t.area * Math.PI * planckNu(nu, t.T);
    return { wavelength: lambda, nuLnu: nu * Lnu };
  });
}

/** The disc's total light by adding up its rings, W (a check: it should be L). */
export function discLuminosity(disc: Disc, rings = 2000): number {
  const lnIn = Math.log(disc.rIn);
  const lnOut = Math.log(disc.rIn * 1e6);
  let L = 0;
  for (let i = 0; i < rings; i++) {
    const r0 = Math.exp(lnIn + ((lnOut - lnIn) * i) / rings);
    const r1 = Math.exp(lnIn + ((lnOut - lnIn) * (i + 1)) / rings);
    const T = discTemperature(disc, Math.sqrt(r0 * r1));
    L += 2 * Math.PI * (r1 * r1 - r0 * r0) * SIGMA * T ** 4; // both faces
  }
  return L;
}

/** Ways to get energy from a kilogram, as the share of its rest-mass energy each gives out (Figure 27.4's bars). */
export interface Fuel {
  id: string;
  name: string;
  efficiency: number;
  how: string;
}

/** A neutron star of 1.4 M☉ and 12 km: falling onto it from far away releases 1 − √(1 − 2GM/Rc²) of the rest energy. */
const NS_EFFICIENCY = 1 - Math.sqrt(1 - (2 * G * 1.4 * M_SUN) / (12e3 * C * C));
/** A white dwarf of 0.6 M☉ and 8,700 km: GM/Rc². */
const WD_EFFICIENCY = (G * 0.6 * M_SUN) / (8.7e6 * C * C);
/** Burning methane: 55.5 MJ/kg of fuel (with the oxygen it needs, about a fifth as much per kilogram burnt). */
const CHEMICAL = 55.5e6 / (C * C);
/** Fission of uranium-235: about 200 MeV per nucleus. */
const FISSION = 200 / (235.04 * (AMU * C * C) / 1.602176634e-13);
/** Hydrogen to helium: 4 × 1.007825 u → 4.002603 u. */
const FUSION = (4 * 1.00782503 - 4.00260325) / (4 * 1.00782503);

export const FUELS: readonly Fuel[] = [
  { id: 'chemical', name: 'Burning gas', efficiency: CHEMICAL, how: 'methane burnt in air' },
  { id: 'white-dwarf', name: 'Falling onto a white dwarf', efficiency: WD_EFFICIENCY, how: 'gas falling onto a white dwarf of 0.6 Suns' },
  { id: 'fission', name: 'Fission', efficiency: FISSION, how: 'uranium-235 split in a reactor' },
  { id: 'fusion', name: 'Fusion', efficiency: FUSION, how: 'hydrogen made into helium, as in the Sun' },
  { id: 'bh0', name: 'A black hole that doesn’t spin', efficiency: accretionEfficiency(0), how: 'gas spiralling down to the innermost stable orbit, 6GM/c²' },
  { id: 'neutron-star', name: 'Falling onto a neutron star', efficiency: NS_EFFICIENCY, how: 'gas falling onto a neutron star of 1.4 Suns and 12 km' },
  { id: 'bh-max', name: 'A black hole spinning as fast as it can', efficiency: accretionEfficiency(1), how: 'the innermost orbit moves in to GM/c²' },
  { id: 'annihilation', name: 'Matter meeting antimatter', efficiency: 1, how: 'all of it' },
];

/** The Eddington luminosity per solar mass, in L☉. */
export function eddingtonPerSolarMass(): number {
  return eddingtonLuminosity(M_SUN) / L_SUN;
}
