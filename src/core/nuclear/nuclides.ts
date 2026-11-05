/**
 * The chart of nuclides (Chapter 23): every known nucleus by its protons Z
 * and neutrons N, with its mass, half-life, decays and natural abundance, from
 * the IAEA's LiveChart (ENSDF, NUBASE2020, AME2020), built into
 * src/data/nuclides.json by scripts/build-nuclides.ts.
 *
 * Masses are atomic mass excesses Δ = (M − A u)c² in keV, as AME tabulates
 * them. Binding energies and separation energies follow from them: B(Z, N) =
 * ZΔ(¹H) + NΔ(n) − Δ(Z, N), the energy it would take to pull the nucleus
 * (with its electrons) apart into hydrogen atoms and neutrons. Energies cross
 * this module's boundary in keV, as nuclear tables give them; half-lives in
 * seconds.
 */

/** The atomic mass excess of hydrogen-1 and of the neutron, keV (AME2020). */
export const MASS_EXCESS_H = 7288.971064;
export const MASS_EXCESS_N = 8071.31806;

/** The magic numbers of protons or neutrons that close a shell (Goeppert Mayer and Jensen, 1949). */
export const MAGIC = [2, 8, 20, 28, 50, 82, 126] as const;

/** The elements' symbols, by atomic number (0 for the neutron). */
export const SYMBOLS = [
  'n', 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe',
  'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn', 'Sb',
  'Te', 'I', 'Xe', 'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os',
  'Ir', 'Pt', 'Au', 'Hg', 'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th', 'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md',
  'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og',
] as const;

/** The elements' names in British spelling, by atomic number. */
export const ELEMENT_NAMES = [
  'neutron', 'hydrogen', 'helium', 'lithium', 'beryllium', 'boron', 'carbon', 'nitrogen', 'oxygen', 'fluorine', 'neon', 'sodium', 'magnesium',
  'aluminium', 'silicon', 'phosphorus', 'sulphur', 'chlorine', 'argon', 'potassium', 'calcium', 'scandium', 'titanium', 'vanadium', 'chromium',
  'manganese', 'iron', 'cobalt', 'nickel', 'copper', 'zinc', 'gallium', 'germanium', 'arsenic', 'selenium', 'bromine', 'krypton', 'rubidium',
  'strontium', 'yttrium', 'zirconium', 'niobium', 'molybdenum', 'technetium', 'ruthenium', 'rhodium', 'palladium', 'silver', 'cadmium', 'indium',
  'tin', 'antimony', 'tellurium', 'iodine', 'xenon', 'caesium', 'barium', 'lanthanum', 'cerium', 'praseodymium', 'neodymium', 'promethium',
  'samarium', 'europium', 'gadolinium', 'terbium', 'dysprosium', 'holmium', 'erbium', 'thulium', 'ytterbium', 'lutetium', 'hafnium', 'tantalum',
  'tungsten', 'rhenium', 'osmium', 'iridium', 'platinum', 'gold', 'mercury', 'thallium', 'lead', 'bismuth', 'polonium', 'astatine', 'radon',
  'francium', 'radium', 'actinium', 'thorium', 'protactinium', 'uranium', 'neptunium', 'plutonium', 'americium', 'curium', 'berkelium',
  'californium', 'einsteinium', 'fermium', 'mendelevium', 'nobelium', 'lawrencium', 'rutherfordium', 'dubnium', 'seaborgium', 'bohrium', 'hassium',
  'meitnerium', 'darmstadtium', 'roentgenium', 'copernicium', 'nihonium', 'flerovium', 'moscovium', 'livermorium', 'tennessine', 'oganesson',
] as const;

/** How a nucleus decays, grouped as charts colour them. */
export type DecayKind = 'stable' | 'beta-minus' | 'beta-plus' | 'alpha' | 'proton' | 'neutron' | 'fission' | 'unknown';

export interface Decay {
  /** The mode as ENSDF writes it: "B-", "EC+B+", "A", "SF", "B-N" … */
  mode: string;
  kind: DecayKind;
  /** Share of decays, %, when known. */
  share: number | null;
}

export interface Nuclide {
  Z: number;
  N: number;
  A: number;
  /** Atomic mass excess, keV, or null when unknown. */
  massExcess: number | null;
  /** The mass is extrapolated from its neighbours' trends (AME's "systematics"), not measured. */
  fromSystematics: boolean;
  /** Half-life, s: Infinity for stable nuclides, null when unknown. */
  halfLife: number | null;
  /** "<", ">", "≥" or "~" when the half-life is only a bound or an estimate. */
  halfLifeBound: string | null;
  decays: Decay[];
  /** Share of the element on Earth, %, for nuclides found in nature. */
  abundance: number | null;
  /** Spin and parity of the ground state, as ENSDF writes it ("0+", "9/2+", "(3/2-)"). */
  spin: string;
  /** Year of discovery, when known. */
  discovered: number | null;
}

/** The columns of src/data/nuclides.json. */
export interface NuclidesData {
  Z: number[];
  N: number[];
  me: (number | null)[];
  sys: number[];
  hl: (number | null)[];
  hlOp: Record<string, string>;
  d1: string[];
  p1: (number | null)[];
  d2: string[];
  p2: (number | null)[];
  ab: Record<string, number>;
  jp: string[];
  year: (number | null)[];
}

/** The kind of a decay mode as ENSDF writes it. */
export function decayKind(mode: string): DecayKind {
  if (!mode) return 'unknown';
  if (mode === 'SF' || mode === 'ECSF') return 'fission';
  if (mode.startsWith('B-') || mode === '2B-') return 'beta-minus';
  if (mode.startsWith('EC') || mode.startsWith('B+') || mode === '2EC' || mode === '2B+') return 'beta-plus';
  if (mode === 'A') return 'alpha';
  if (mode === 'P' || mode === '2P') return 'proton';
  if (mode === 'N' || mode === '2N') return 'neutron';
  if (mode === 'IT') return 'unknown';
  return 'unknown';
}

export interface NuclideTable {
  list: readonly Nuclide[];
  /** The nuclide with Z protons and N neutrons, if known. */
  get(Z: number, N: number): Nuclide | undefined;
  /** The range of N known for each Z. */
  minN: readonly number[];
  maxN: readonly number[];
  maxZ: number;
}

const key = (Z: number, N: number) => Z * 1000 + N;

/** Unpacks the data file's columns into nuclides, with a lookup by Z and N. */
export function nuclideTable(data: NuclidesData): NuclideTable {
  const systematic = new Set(data.sys);
  const list: Nuclide[] = data.Z.map((Z, i) => {
    const decays: Decay[] = [];
    const hl = data.hl[i];
    if (hl === -1) decays.push({ mode: 'stable', kind: 'stable', share: null });
    if (data.d1[i]) decays.push({ mode: data.d1[i], kind: decayKind(data.d1[i]), share: data.p1[i] });
    if (data.d2[i]) decays.push({ mode: data.d2[i], kind: decayKind(data.d2[i]), share: data.p2[i] });
    return {
      Z,
      N: data.N[i],
      A: Z + data.N[i],
      massExcess: data.me[i],
      fromSystematics: systematic.has(i),
      halfLife: hl === -1 ? Infinity : hl,
      halfLifeBound: data.hlOp[i] ?? null,
      decays,
      abundance: data.ab[i] ?? null,
      spin: data.jp[i],
      discovered: data.year[i],
    };
  });
  const byKey = new Map(list.map((n) => [key(n.Z, n.N), n]));
  const maxZ = Math.max(...list.map((n) => n.Z));
  const minN = Array.from({ length: maxZ + 1 }, () => Infinity);
  const maxN = Array.from({ length: maxZ + 1 }, () => -Infinity);
  for (const n of list) {
    minN[n.Z] = Math.min(minN[n.Z], n.N);
    maxN[n.Z] = Math.max(maxN[n.Z], n.N);
  }
  return { list, get: (Z, N) => byKey.get(key(Z, N)), minN, maxN, maxZ };
}

/** The decay that colours a nuclide on the chart: stable, or its main decay. */
export function mainKind(n: Nuclide): DecayKind {
  return n.decays[0]?.kind ?? 'unknown';
}

/** Whether a nuclide is stable, or so long-lived (over `years`, default 10⁹) that nature still has it. */
export function isStable(n: Nuclide, years = 0): boolean {
  if (n.halfLife === Infinity) return true;
  return years > 0 && n.halfLife !== null && n.halfLife > years * 3.15576e7;
}

/** Total binding energy, keV, from the mass excess. */
export function bindingEnergy(n: Pick<Nuclide, 'Z' | 'N' | 'massExcess'>): number | null {
  if (n.massExcess === null) return null;
  return n.Z * MASS_EXCESS_H + n.N * MASS_EXCESS_N - n.massExcess;
}

/** Binding energy per nucleon, keV. */
export function bindingPerNucleon(n: Pick<Nuclide, 'Z' | 'N' | 'massExcess'>): number | null {
  const B = bindingEnergy(n);
  return B === null ? null : B / (n.Z + n.N);
}

/** The energy to pull one neutron out, S_n = B(Z, N) − B(Z, N − 1), keV, from a table of mass excesses (or any function giving them). */
export function neutronSeparation(massExcess: (Z: number, N: number) => number | null, Z: number, N: number): number | null {
  const m = massExcess(Z, N);
  const m1 = massExcess(Z, N - 1);
  return m === null || m1 === null ? null : m1 + MASS_EXCESS_N - m;
}

/** The energy to pull one proton out, S_p = B(Z, N) − B(Z − 1, N), keV. */
export function protonSeparation(massExcess: (Z: number, N: number) => number | null, Z: number, N: number): number | null {
  const m = massExcess(Z, N);
  const m1 = massExcess(Z - 1, N);
  return m === null || m1 === null ? null : m1 + MASS_EXCESS_H - m;
}

/** The energy a β⁻ decay of (Z, N) releases, keV: Q_β = Δ(Z, N) − Δ(Z + 1, N − 1). */
export function betaMinusQ(massExcess: (Z: number, N: number) => number | null, Z: number, N: number): number | null {
  const m = massExcess(Z, N);
  const d = massExcess(Z + 1, N - 1);
  return m === null || d === null ? null : m - d;
}

/** A mass-excess lookup on the table, for the functions above. */
export function measuredMasses(table: NuclideTable): (Z: number, N: number) => number | null {
  return (Z, N) => table.get(Z, N)?.massExcess ?? null;
}

/** A nuclide's name in the usual form: "iron-56". */
export function nuclideName(Z: number, A: number): string {
  return Z === 0 ? 'the neutron' : `${ELEMENT_NAMES[Z]}-${A}`;
}

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';
/** A nuclide's symbol with its mass number raised: "⁵⁶Fe". */
export function nuclideSymbol(Z: number, A: number): string {
  if (Z === 0) return 'n';
  return `${[...String(A)].map((d) => SUPERSCRIPT[Number(d)]).join('')}${SYMBOLS[Z]}`;
}

/**
 * The most tightly bound nuclei: for each mass number A, the known nuclide
 * with the largest binding energy per nucleon. Its curve rises to the iron
 * peak and falls beyond.
 */
export function mostBoundByMass(table: NuclideTable, measuredOnly = true): Nuclide[] {
  const best = new Map<number, { n: Nuclide; b: number }>();
  for (const n of table.list) {
    if (n.Z === 0 || n.massExcess === null || (measuredOnly && n.fromSystematics)) continue;
    const b = bindingPerNucleon(n)!;
    const cur = best.get(n.A);
    if (!cur || b > cur.b) best.set(n.A, { n, b });
  }
  return [...best.values()].sort((a, b) => a.n.A - b.n.A).map((x) => x.n);
}

/** The nuclide with the largest binding energy per nucleon. */
export function mostBound(table: NuclideTable): Nuclide {
  let best: Nuclide | undefined;
  let bestB = -Infinity;
  for (const n of table.list) {
    const b = n.Z > 0 ? bindingPerNucleon(n) : null;
    if (b !== null && !n.fromSystematics && b > bestB) {
      best = n;
      bestB = b;
    }
  }
  return best!;
}

/** The stable nuclides (and those that outlast the Solar System), for the valley of stability. */
export function stableNuclides(table: NuclideTable, years = 1e9): Nuclide[] {
  return table.list.filter((n) => n.Z > 0 && isStable(n, years));
}
