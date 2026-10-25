import type { Vec3 } from '../../core/math/vec3';
import { createIas15 } from '../../core/nbody/ias15';
import { createSystem, gmToAuDay, gravity, GM_SUN_AU_DAY, toCentreOfMassFrame } from '../../core/nbody/system';
import { stateFromElements } from '../../core/orbits/elements';
import type { MethodChoice, OrreryBody } from '../../core/orrery/engine';
import type { FrameSpec } from '../../core/orrery/frame';
import { DEG } from '../../core/units';
import galilean from '../../data/galilean.json';
import horizons from '../../data/orrery.json';
import { WORLDS, type WorldId } from '../../data/planets';

/**
 * The Orrery's ready-made systems. Each gives its bodies (AU, AU/day, G·m in
 * AU³/day², radii in AU), the integrator to start with, and how to show it:
 * the frame, how far to zoom out, how long the trails are and how fast to run.
 *
 * Sources: JPL Horizons for the Solar System, Earth and the Moon (DE441, 1
 * January 2026) and Jupiter's moons (JUP365); Simó's numbers for the
 * figure-eight (Chenciner & Montgomery 2000); Burrau (1913) and Szebehely &
 * Peters (1967) for the Pythagorean problem; Doyle et al. (2011) for Kepler-16;
 * Agol et al. (2021) for TRAPPIST-1.
 */

export type PresetId =
  | 'solar-system'
  | 'earth-moon'
  | 'galilean'
  | 'trojans'
  | 'figure-eight'
  | 'pythagorean'
  | 'kepler-16'
  | 'trappist-1'
  | 'comet'
  | 'heavy-jupiter'
  | 'one-planet';

export interface Preset {
  id: PresetId;
  name: string;
  /** What it shows, in a sentence. */
  blurb: string;
  /** Something to look for. */
  tryThis: string;
  /** What is left out, for the note. */
  simplified?: string;
  bodies: () => OrreryBody[];
  method: MethodChoice;
  frame: FrameSpec;
  /** Half the width of the view at the start, AU. */
  zoom: number;
  /** Trail length, in laps of each body's own orbit. */
  trailLaps: number;
  /** Simulated days per real second at the start. */
  rate: number;
  /** Lagrange points to mark in the turning frame. */
  lagrange?: boolean;
  /** The calendar date of the start, as a Julian Date (TT), when the system is the real one. */
  epochTT?: number;
}

const KM = 1 / 149_597_870.7;
const M_SUN = GM_SUN_AU_DAY;
const M_EARTH = gmToAuDay(398_600.435507e9 + 4_902.800118e9) - gmToAuDay(4_902.800118e9);
const M_JUPITER = gmToAuDay(126_686_531.9e9);
const R_SUN = 695_700 * KM;
const R_EARTH = 6_371 * KM;
const K = Math.sqrt(GM_SUN_AU_DAY);

export const COLOURS = {
  sun: '#ffd27a',
  orange: '#ffb36b',
  red: '#ff8a5c',
  particle: '#9fb4d8',
  comet: '#7fe0d6',
  white: '#e8e0d0',
};

const world = (id: WorldId) => WORLDS.find((w) => w.id === id)!;
const radiusOf = (id: WorldId) => (world(id).diameterKm / 2) * KM;
const colourOf = (id: WorldId) => world(id).colour;

type Raw = (typeof horizons.bodies)[number];
const raw = (id: string): Raw => horizons.bodies.find((b) => b.id === id)!;
const fromHorizons = (id: string, name: string, radius: number, colour: string, scale = 1): OrreryBody => {
  const b = raw(id);
  return { id, name, gm: gmToAuDay(b.gm * 1e9) * scale, radius, colour, x: b.x as unknown as Vec3, v: b.v as unknown as Vec3 };
};

function solarSystem(jupiterScale = 1): OrreryBody[] {
  return [
    fromHorizons('sun', 'Sun', R_SUN, COLOURS.sun),
    fromHorizons('mercury', 'Mercury', radiusOf('mercury'), colourOf('mercury')),
    fromHorizons('venus', 'Venus', radiusOf('venus'), colourOf('venus')),
    { ...fromHorizons('earth-moon', 'Earth', radiusOf('earth'), colourOf('earth')), id: 'earth' },
    fromHorizons('mars', 'Mars', radiusOf('mars'), colourOf('mars')),
    { ...fromHorizons('jupiter', jupiterScale === 1 ? 'Jupiter' : `Jupiter × ${jupiterScale}`, radiusOf('jupiter'), colourOf('jupiter'), jupiterScale) },
    fromHorizons('saturn', 'Saturn', radiusOf('saturn'), colourOf('saturn')),
    fromHorizons('uranus', 'Uranus', radiusOf('uranus'), colourOf('uranus')),
    fromHorizons('neptune', 'Neptune', radiusOf('neptune'), colourOf('neptune')),
    fromHorizons('pluto', 'Pluto', 1_188 * KM, '#c8b49a'),
  ];
}

/** A body on an orbit about a parent state: elements in AU and degrees. */
function onOrbit(
  parent: { gm: number; x: Vec3; v: Vec3 },
  body: Omit<OrreryBody, 'x' | 'v'>,
  el: { a: number; e?: number; i?: number; node?: number; peri?: number; M?: number },
  mu = parent.gm + body.gm,
): OrreryBody {
  const s = stateFromElements(mu, { a: el.a, e: el.e ?? 0, i: (el.i ?? 0) * DEG, node: (el.node ?? 0) * DEG, peri: (el.peri ?? 0) * DEG, M: (el.M ?? 0) * DEG });
  return { ...body, x: [parent.x[0] + s.x[0], parent.x[1] + s.x[1], parent.x[2] + s.x[2]], v: [parent.v[0] + s.v[0], parent.v[1] + s.v[1], parent.v[2] + s.v[2]] };
}

/** Puts a list of bodies in the frame of their centre of mass. */
function centred(bodies: OrreryBody[]): OrreryBody[] {
  const s = toCentreOfMassFrame(createSystem(bodies));
  return bodies.map((b, i) => ({ ...b, x: [s.x[3 * i], s.x[3 * i + 1], s.x[3 * i + 2]], v: [s.v[3 * i], s.v[3 * i + 1], s.v[3 * i + 2]] }));
}


function galileanMoons(): OrreryBody[] {
  const day = 86_400;
  const jupiter: OrreryBody = { id: 'jupiter', name: 'Jupiter', gm: gmToAuDay(galilean.jupiter.gm * 1e9), radius: galilean.jupiter.radiusKm * KM, colour: colourOf('jupiter'), x: [0, 0, 0], v: [0, 0, 0] };
  const radii: Record<string, number> = { io: 1_821.6, europa: 1_560.8, ganymede: 2_634.1, callisto: 2_410.3 };
  const colours: Record<string, string> = { io: '#f2c94c', europa: '#e8e0d0', ganymede: '#a9b8d6', callisto: '#b08a68' };
  const moons = galilean.moons.map((m) => ({
    id: m.id,
    name: m.name,
    gm: gmToAuDay(m.gm * 1e9),
    radius: radii[m.id] * KM,
    colour: colours[m.id],
    x: [m.x[0] * KM, m.x[1] * KM, m.x[2] * KM] as Vec3,
    v: [m.v[0] * KM * day, m.v[1] * KM * day, m.v[2] * KM * day] as Vec3,
  }));
  return centred([jupiter, ...moons]);
}

/** Jupiter on a circular orbit with its real mass and distance, and the Sun. */
function sunAndJupiter(): OrreryBody[] {
  const sun: OrreryBody = { id: 'sun', name: 'Sun', gm: M_SUN, radius: R_SUN, colour: COLOURS.sun, x: [0, 0, 0], v: [0, 0, 0] };
  const jupiter = onOrbit(sun, { id: 'jupiter', name: 'Jupiter', gm: M_JUPITER, radius: radiusOf('jupiter'), colour: colourOf('jupiter') }, { a: 5.2026 });
  return [sun, jupiter];
}

/**
 * Trojans and their cousins: test particles near Jupiter's orbit. Each starts
 * at an angle ahead of or behind Jupiter (in degrees) on a circular orbit a
 * little wider or narrower than Jupiter's. Near L4 and L5 they swing to and fro
 * in tadpoles; further round, from opposite Jupiter, in horseshoes that wrap
 * round both points.
 */
export const TROJAN_STARTS: readonly { name: string; angle: number; da: number }[] = [
  { name: 'Tadpole at L4', angle: 60, da: 0.012 },
  { name: 'Wide tadpole at L4', angle: 30, da: 0 },
  { name: 'Tadpole at L5', angle: -60, da: -0.012 },
  { name: 'Wide tadpole at L5', angle: -25, da: 0 },
  { name: 'Horseshoe', angle: 180, da: 0.003 },
];

function trojans(): OrreryBody[] {
  const [sun, jupiter] = sunAndJupiter();
  const particles = TROJAN_STARTS.map((p, k) =>
    onOrbit(sun, { id: `trojan-${k + 1}`, name: p.name, gm: 0, radius: 0, colour: k === 4 ? COLOURS.comet : COLOURS.particle }, { a: 5.2026 * (1 + p.da), M: p.angle }, M_SUN + M_JUPITER),
  );
  return centred([sun, jupiter, ...particles]);
}

/**
 * Comets meeting Jupiter. Each is set up at its closest approach to Jupiter,
 * `closest` AU away, `at` days after the preset starts, passing at a multiple
 * of Jupiter's escape speed there (`angle` degrees from Jupiter's
 * direction of motion's right), and then run
 * backwards with the Sun and Jupiter to the start, so the encounters happen on
 * cue. The comets weigh nothing, so each can be run back on its own. The
 * slowest is caught for years, as comet Shoemaker–Levy 9 was.
 */
export const COMET_PASSES: readonly { name: string; closest: number; escapeFraction: number; angle: number; at: number }[] = [
  { name: 'Comet A', closest: 0.012, escapeFraction: 1.3, angle: 150, at: 300 },
  { name: 'Comet B', closest: 0.08, escapeFraction: 1.6, angle: 200, at: 330 },
  { name: 'Comet C (caught)', closest: 0.02, escapeFraction: 0.964, angle: 270, at: 4400 },
];

function comets(): OrreryBody[] {
  const [sun, jupiter] = centred(sunAndJupiter());
  const n = Math.sqrt((sun.gm + jupiter.gm) / 5.2026 ** 3);
  const list = COMET_PASSES.map((c, k) => {
    // Jupiter's circular orbit, turned on to the time of the pass.
    const turn = (p: Vec3, by: number): Vec3 => [p[0] * Math.cos(by) - p[1] * Math.sin(by), p[0] * Math.sin(by) + p[1] * Math.cos(by), p[2]];
    const theta = n * c.at;
    const sunThen = { ...sun, x: turn(sun.x, theta), v: turn(sun.v, theta) };
    const jupiterThen = { ...jupiter, x: turn(jupiter.x, theta), v: turn(jupiter.v, theta) };
    // Closest approach: offset from Jupiter at right angles to the relative velocity, turned with Jupiter.
    const a = c.angle * DEG + theta;
    const speed = c.escapeFraction * Math.sqrt((2 * jupiter.gm) / c.closest);
    const u: Vec3 = [Math.cos(a) * speed, Math.sin(a) * speed, 0];
    const r: Vec3 = [Math.sin(a) * c.closest, -Math.cos(a) * c.closest, 0];
    const comet: OrreryBody = {
      id: `comet-${k + 1}`,
      name: c.name,
      gm: 0,
      radius: 2 * KM,
      colour: COLOURS.comet,
      x: [jupiterThen.x[0] + r[0], jupiterThen.x[1] + r[1], jupiterThen.x[2] + r[2]],
      v: [jupiterThen.v[0] + u[0], jupiterThen.v[1] + u[1], jupiterThen.v[2] + u[2]],
    };
    return runBackwards([sunThen, jupiterThen, comet], c.at)[2];
  });
  return [sun, jupiter, ...list];
}

/** The system as it was `days` earlier, by running it backwards with IAS15. */
function runBackwards(bodies: OrreryBody[], days: number): OrreryBody[] {
  const s = createSystem(bodies);
  const ias = createIas15(s.x.length, gravity(s.gm), { dt: -1, minDt: 1e-9 });
  let t = 0;
  while (t > -days) t += ias.step(s.x, s.v, -days - t);
  return bodies.map((b, i) => ({ ...b, x: [s.x[3 * i], s.x[3 * i + 1], s.x[3 * i + 2]], v: [s.v[3 * i], s.v[3 * i + 1], s.v[3 * i + 2]] }));
}

/** The figure-eight: three Suns on one curve (Simó's numbers, with G = m = 1 scaled to solar masses and AU). */
export const FIGURE_EIGHT_PERIOD_DAYS = 6.32591398 / K;

function figureEight(): OrreryBody[] {
  const star = (k: number, x: Vec3, v: Vec3): OrreryBody => ({
    id: `star-${k}`,
    name: ['Star A', 'Star B', 'Star C'][k - 1],
    gm: M_SUN,
    radius: R_SUN,
    colour: [COLOURS.sun, COLOURS.orange, COLOURS.white][k - 1],
    x,
    v: [v[0] * K, v[1] * K, v[2] * K],
  });
  return [
    star(1, [0.97000436, -0.24308753, 0], [0.466203685, 0.43236573, 0]),
    star(2, [-0.97000436, 0.24308753, 0], [0.466203685, 0.43236573, 0]),
    star(3, [0, 0, 0], [-0.93240737, -0.86473146, 0]),
  ];
}

function pythagorean(): OrreryBody[] {
  const star = (m: number, x: Vec3, colour: string): OrreryBody => ({ id: `star-${m}`, name: `Star of ${m} Suns`, gm: m * M_SUN, radius: 0, colour, x, v: [0, 0, 0] });
  return centred([star(3, [1, 3, 0], COLOURS.white), star(4, [-2, -1, 0], COLOURS.orange), star(5, [1, -1, 0], COLOURS.sun)]);
}

/** Kepler-16: an orange and a red dwarf 41 days apart, and a Saturn-sized planet round both (Doyle et al. 2011). */
export const KEPLER_16 = {
  massA: 0.6897,
  massB: 0.20255,
  radiusA: 0.6489,
  radiusB: 0.22623,
  binaryPeriod: 41.07922,
  binaryE: 0.15944,
  binaryPeri: 263.464,
  planetMassEarths: 105.833,
  planetRadiusEarths: 8.449,
  planetPeriod: 228.776,
  planetE: 0.0069,
  planetPeri: 318,
};

function kepler16(): OrreryBody[] {
  const k = KEPLER_16;
  const a: OrreryBody = { id: 'kepler-16a', name: 'Kepler-16 A', gm: k.massA * M_SUN, radius: k.radiusA * R_SUN, colour: COLOURS.orange, x: [0, 0, 0], v: [0, 0, 0] };
  const gmB = k.massB * M_SUN;
  const muAB = a.gm + gmB;
  const aBin = Math.cbrt((muAB * k.binaryPeriod ** 2) / (4 * Math.PI ** 2));
  const b = onOrbit(a, { id: 'kepler-16b-star', name: 'Kepler-16 B', gm: gmB, radius: k.radiusB * R_SUN, colour: COLOURS.red }, { a: aBin, e: k.binaryE, peri: k.binaryPeri });
  const gmP = k.planetMassEarths * M_EARTH;
  const centre = { gm: muAB, x: [(b.x[0] * gmB) / muAB, (b.x[1] * gmB) / muAB, (b.x[2] * gmB) / muAB] as Vec3, v: [(b.v[0] * gmB) / muAB, (b.v[1] * gmB) / muAB, (b.v[2] * gmB) / muAB] as Vec3 };
  const aP = Math.cbrt(((muAB + gmP) * k.planetPeriod ** 2) / (4 * Math.PI ** 2));
  const planet = onOrbit(centre, { id: 'kepler-16b', name: 'Kepler-16 b', gm: gmP, radius: k.planetRadiusEarths * R_EARTH, colour: colourOf('saturn') }, { a: aP, e: k.planetE, peri: k.planetPeri, M: 90 });
  return centred([a, b, planet]);
}

/** TRAPPIST-1's seven planets (Agol et al. 2021): mass (Earths), radius (Earths), period (days). */
export const TRAPPIST_1 = {
  starMass: 0.0898,
  starRadius: 0.1192,
  planets: [
    { name: 'b', mass: 1.374, radius: 1.116, period: 1.510826 },
    { name: 'c', mass: 1.308, radius: 1.097, period: 2.421937 },
    { name: 'd', mass: 0.388, radius: 0.788, period: 4.049219 },
    { name: 'e', mass: 0.692, radius: 0.92, period: 6.101013 },
    { name: 'f', mass: 1.039, radius: 1.045, period: 9.20754 },
    { name: 'g', mass: 1.321, radius: 1.129, period: 12.352446 },
    { name: 'h', mass: 0.326, radius: 0.755, period: 18.772866 },
  ],
};
const TRAPPIST_COLOURS = ['#d98b6a', '#c99a6e', '#b7a37f', '#7fa3c9', '#6fb3a8', '#8f9fd6', '#b49ad1'];

function trappist1(): OrreryBody[] {
  const t = TRAPPIST_1;
  const star: OrreryBody = { id: 'trappist-1', name: 'TRAPPIST-1', gm: t.starMass * M_SUN, radius: t.starRadius * R_SUN, colour: COLOURS.red, x: [0, 0, 0], v: [0, 0, 0] };
  const planets = t.planets.map((p, k) => {
    const gm = p.mass * M_EARTH;
    const a = Math.cbrt(((star.gm + gm) * p.period ** 2) / (4 * Math.PI ** 2));
    // Spread round their orbits by the golden angle: the real phases matter to the resonances' fine detail, not to the picture.
    return onOrbit(star, { id: `trappist-1${p.name}`, name: `TRAPPIST-1 ${p.name}`, gm, radius: p.radius * R_EARTH, colour: TRAPPIST_COLOURS[k] }, { a, M: (k * 137.508) % 360 });
  });
  return centred([star, ...planets]);
}

function earthAndMoon(): OrreryBody[] {
  return [
    fromHorizons('sun', 'Sun', R_SUN, COLOURS.sun),
    fromHorizons('earth', 'Earth', radiusOf('earth'), colourOf('earth')),
    fromHorizons('moon', 'Moon', radiusOf('moon'), colourOf('moon')),
  ];
}

function onePlanet(): OrreryBody[] {
  const sun: OrreryBody = { id: 'sun', name: 'Sun', gm: M_SUN, radius: R_SUN, colour: COLOURS.sun, x: [0, 0, 0], v: [0, 0, 0] };
  return centred([sun, onOrbit(sun, { id: 'planet', name: 'Planet', gm: M_EARTH, radius: R_EARTH, colour: colourOf('earth') }, { a: 1, e: 0.5 })]);
}

const day = (n: number) => n;
const year = (n: number) => 365.25 * n;

export const PRESETS: readonly Preset[] = [
  {
    id: 'solar-system',
    name: 'The Solar System today',
    blurb: 'The Sun, the eight planets and Pluto where JPL puts them on 1 January 2026. Speed time up to centuries a second.',
    tryThis: 'Speed up to a century a second and watch Pluto and Neptune: Pluto goes round twice for every three laps of Neptune, and they never come close.',
    simplified: 'Each planet with moons is one body carrying its moons’ mass, at their centre of mass. Asteroids, relativity and the Sun’s slow loss of mass are left out.',
    bodies: () => solarSystem(),
    method: 'auto',
    frame: { centre: 'sun', rotate: null },
    zoom: 34,
    trailLaps: 1,
    rate: year(1),
    epochTT: horizons.epochTT,
  },
  {
    id: 'earth-moon',
    name: 'Earth and Moon',
    blurb: 'Earth and the Moon going round their shared centre of mass once a month, while the Sun pulls on both.',
    tryThis: 'Turn with Earth and the Moon and zoom in on the middle of the view, now their shared centre of mass: Earth’s centre is about 4,700 km from it, so the point both go round is inside the Earth.',
    simplified: 'The other planets are left out, and so are Earth’s bulge and the tides, which slowly push the Moon away (3.8 cm a year).',
    bodies: earthAndMoon,
    method: 'auto',
    frame: { centre: 'earth', rotate: null },
    zoom: 0.004,
    trailLaps: 1,
    rate: day(4),
    epochTT: horizons.epochTT,
  },
  {
    id: 'galilean',
    name: 'Jupiter’s Galilean moons',
    blurb: 'Io, Europa, Ganymede and Callisto from JPL’s positions on 1 January 2026, with Io, Europa and Ganymede locked in step, 4 : 2 : 1.',
    tryThis: 'Turn the frame with Jupiter and Ganymede: Io and Europa then trace closed loops, because their laps fit Ganymede’s exactly.',
    simplified: 'The Sun’s pull and Jupiter’s flattened shape are left out, so over weeks the computed moons drift from the real ones.',
    bodies: galileanMoons,
    method: 'auto',
    frame: { centre: 'jupiter', rotate: null },
    zoom: 0.014,
    trailLaps: 1,
    rate: day(1),
    epochTT: galilean.epochTT,
  },
  {
    id: 'trojans',
    name: 'Sun, Jupiter and the Trojans',
    blurb: 'Asteroids sharing Jupiter’s orbit, seen in a frame that turns with Jupiter: they swing about the L4 and L5 points in tadpoles, or round both in a horseshoe.',
    tryThis: 'Switch the turning frame off: in the frame of the stars the same asteroids just go round the Sun in near-circles. The tadpoles only show from Jupiter’s point of view.',
    simplified: 'Jupiter’s orbit is a circle and Saturn is left out, so these swings repeat for ever; the real Trojans’ are disturbed a little.',
    bodies: trojans,
    method: 'auto',
    frame: { centre: null, rotate: ['sun', 'jupiter'] },
    zoom: 7,
    trailLaps: 30,
    rate: year(20),
    lagrange: true,
  },
  {
    id: 'figure-eight',
    name: 'The figure-eight',
    blurb: 'Three equal stars chasing each other round one figure-eight curve, found by Cris Moore in 1993 and proved by Chenciner and Montgomery in 2000.',
    tryThis: 'Pick Star B, make it 1% faster and run on: the eight wobbles but holds. Start again and make it 10% faster: within a few laps the stars fall out of step.',
    simplified: 'The stars are points with the Sun’s mass; the shape is Simó’s numbers, scaled so the curve is about 2 AU across.',
    bodies: figureEight,
    method: 'auto',
    frame: { centre: null, rotate: null },
    zoom: 1.6,
    trailLaps: 1,
    rate: day(60),
  },
  {
    id: 'pythagorean',
    name: 'The Pythagorean problem',
    blurb: 'Stars of 3, 4 and 5 Suns let go at rest at the corners of a 3-4-5 triangle: decades of chaos, then a pair flies off one way and the lightest star the other.',
    tryThis: 'Watch the energy error through the close passes: IAS15 shrinks its step to seconds and holds the error to a few parts in ten billion.',
    simplified: 'The stars are points, as in the classic problem, so they can pass as close as they like without touching.',
    bodies: pythagorean,
    method: 'auto',
    frame: { centre: null, rotate: null },
    zoom: 5,
    trailLaps: 0.3,
    rate: day(200),
  },
  {
    id: 'kepler-16',
    name: 'A planet with two suns',
    blurb: 'Kepler-16: an orange and a red dwarf that go round each other every 41 days, with a Saturn-sized planet going round both every 229.',
    tryThis: 'Turn the frame with the two stars: the planet’s path is a slightly wobbling circle about the pair. From the planet, two suns rise and set together.',
    simplified: 'The orbits are in one plane (the real ones are within half a degree) and where each body starts along its orbit is made up.',
    bodies: kepler16,
    method: 'auto',
    frame: { centre: null, rotate: null },
    zoom: 1,
    trailLaps: 1,
    rate: day(30),
  },
  {
    id: 'trappist-1',
    name: 'TRAPPIST-1',
    blurb: 'Seven Earth-sized planets round a small red star, all closer in than Mercury is to the Sun. Neighbours’ periods come in near-whole ratios, a resonant chain.',
    tryThis: 'Read the periods in the table: 1.51, 2.42, 4.05, 6.10, 9.21, 12.35 and 18.77 days. Each pair of neighbours goes round about 8 : 5, 5 : 3, 3 : 2, 3 : 2, 4 : 3 and 3 : 2.',
    simplified: 'The masses and periods are measured; where each planet starts along its orbit is made up, so the chain’s fine timing differs from the real one.',
    bodies: trappist1,
    method: 'auto',
    frame: { centre: null, rotate: null },
    zoom: 0.075,
    trailLaps: 1,
    rate: day(2),
  },
  {
    id: 'comet',
    name: 'A comet meets Jupiter',
    blurb: 'Three comets fly past Jupiter. One is flung onto a new orbit and one is nudged; the slowest is caught, loops round Jupiter for years, and is then pulled away again by the Sun.',
    tryThis: 'Follow Jupiter and zoom in to watch the passes around day 300; then compare each comet’s orbit in the table before and after.',
    simplified: 'Jupiter’s orbit is a circle and the comets are points that weigh nothing: they feel Jupiter, but it doesn’t feel them.',
    bodies: comets,
    method: 'auto',
    frame: { centre: 'sun', rotate: null },
    zoom: 9,
    trailLaps: 0.5,
    rate: day(60),
  },
  {
    id: 'heavy-jupiter',
    name: 'What if Jupiter were 100 times heavier?',
    blurb: 'The real Solar System with one change: Jupiter as heavy as a small star. Saturn and the outer planets don’t stay put for long.',
    tryThis: 'Watch the event log, and the method: the first close pass switches the engine to IAS15. Then try 10 times heavier instead, with the mass control.',
    simplified: 'As in the Solar System preset, with Jupiter’s mass multiplied by 100 and nothing else changed.',
    bodies: () => solarSystem(100),
    method: 'auto',
    frame: { centre: 'sun', rotate: null },
    zoom: 34,
    trailLaps: 1,
    rate: year(5),
    epochTT: horizons.epochTT,
  },
  {
    id: 'one-planet',
    name: 'One planet, for testing methods',
    blurb: 'A single planet on a stretched orbit, as in Figure 7.2, run by leapfrog. Switch methods and watch the energy error.',
    tryThis: 'Switch from leapfrog to Wisdom–Holman: with only the Sun pulling, Wisdom–Holman is exact, and the energy error drops to round-off.',
    bodies: onePlanet,
    method: 'leapfrog',
    frame: { centre: 'sun', rotate: null },
    zoom: 1.8,
    trailLaps: 1,
    rate: day(30),
  },
];

export function findPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

