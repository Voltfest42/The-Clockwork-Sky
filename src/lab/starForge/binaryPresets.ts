import type { Outcome } from '../../core/stellar/bse/outcome';
import { PAIR_DEFAULTS, type ForgePair } from './binary';

/**
 * The Star Forge's ready-made pairs, each found by a search of BSE runs for
 * the kind of system named, with a blurb, something to try and what's
 * simplified. `t` is the moment the Forge opens at (Myr), and `expect` what
 * the unit tests check the run still does.
 */

export interface PairPreset {
  id: string;
  name: string;
  pair: ForgePair;
  t: number;
  blurb: string;
  tryThis: string;
  simplified: string;
  expect: { outcome: Outcome; merges?: boolean };
}

const pair = (p: Partial<ForgePair> & Pick<ForgePair, 'm1' | 'm2' | 'period' | 'z'>): ForgePair => ({ ecc: 0, ...PAIR_DEFAULTS, ...p });

export const PAIR_PRESETS: readonly PairPreset[] = [
  {
    id: 'algol',
    name: 'Algol',
    pair: pair({ m1: 2.8, m2: 1, period: 1.8, z: 0.02 }),
    t: 911,
    blurb:
      'Figure 28.3’s pair. The heavier star swells first and fills its Roche lobe while both are still on the main sequence; it gives most of its mass away, the orbit shrinking until the masses are equal and widening after. 911 million years on it is a K-type giant of 0.70 M☉ still filling its lobe beside a B star of 3.1: Algol’s paradox, the lighter star the more evolved.',
    tryThis: 'Slide back to 443 million years, when the masses are equal and the orbit is at its tightest, then on to 1,000 million, when the companion swells in turn and the two share an envelope.',
    simplified: 'Algol’s third star, on a 680-day orbit, is left out. The pair was picked to land near Algol’s masses and period (Baron and others, 2012: 3.17 and 0.70 M☉, 2.867 days).',
    expect: { outcome: 'merger' },
  },
  {
    id: 'cataclysmic-variable',
    name: 'A cataclysmic variable',
    pair: pair({ m1: 3, m2: 0.45, period: 167, z: 0.02 }),
    t: 590,
    blurb:
      'A 3 M☉ star and a red dwarf, half a year apart. When the big star becomes an asymptotic giant it swallows its companion in a common envelope; the drag shrinks the orbit from 120 solar radii to 2 and throws the envelope off, leaving a white dwarf and a red dwarf a third of a day apart. Magnetic braking and gravitational waves draw them closer still until, at 580 million years, the red dwarf fills its lobe and feeds the white dwarf: a cataclysmic variable, a nova factory, for the rest of time.',
    tryThis: 'Show the period against time: the red dwarf whittled down to a few Jupiters while the orbit shrinks to about 70 minutes (real ones bottom out near 80) and widens again, a “period bouncer”. Then turn α down to 0.3 and see whether the pair survives its common envelope.',
    simplified:
      'BSE lets most of each nova’s gas escape (it keeps 0.1%), so the white dwarf barely grows. Real cataclysmic variables leave a gap between periods of 2 and 3 hours, when the red dwarf becomes fully convective and magnetic braking is thought to weaken; BSE’s braking follows its own recipe, and its donor shrinks in its own way.',
    expect: { outcome: 'cv' },
  },
  {
    id: 'helium-type-ia',
    name: 'A Type Ia: a white dwarf fed by a helium star',
    pair: pair({ m1: 5, m2: 2.5, period: 9.69, z: 0.02 }),
    t: 160,
    blurb:
      'Two exchanges of mass. The 5 M☉ star fills its lobe first, gives most of itself away and becomes a white dwarf of 0.82 M☉; its companion, now 6.6 M☉, swells in turn and shares an envelope with it, which leaves the white dwarf beside the companion’s bare helium core, less than a solar radius away. That helium star soon fills its lobe and pours helium onto the white dwarf, and 161 million years after birth the white dwarf is destroyed: a single-degenerate route to a Type Ia supernova.',
    tryThis: 'Look at the white dwarf’s mass when it goes: 0.82 M☉, far below the Chandrasekhar mass. Then find the helium star in the HR diagram: hotter than any main-sequence star its size.',
    simplified:
      'BSE destroys a carbon–oxygen white dwarf once a layer of 0.15 M☉ of helium has piled up on it, an “edge-lit detonation” (today the idea is called a double detonation). Whether such explosions look like normal Type Ia supernovae is argued over. In these runs BSE makes no Type Ia from a hydrogen-rich companion: novae carry off what the white dwarf is given.',
    expect: { outcome: 'typeIa' },
  },
  {
    id: 'white-dwarf-merger',
    name: 'A Type Ia: two white dwarfs merging',
    pair: pair({ m1: 5, m2: 4, period: 1610, z: 0.02 }),
    t: 4000,
    blurb:
      'A wide pair of 5 and 4 M☉ stars goes through two common envelopes, one as each star becomes a giant, and comes out as two carbon–oxygen white dwarfs of 0.98 and 0.63 M☉, two solar radii apart. For four billion years gravitational waves draw them in, until the lighter fills its lobe and they merge. Together they weigh 1.6 M☉, more than the Chandrasekhar mass, and BSE blows them apart: the double-degenerate route to a Type Ia supernova.',
    tryThis: 'Show the separation against time: two sudden plunges, the common envelopes, then the slow inspiral. Pairs like this are what the space detector LISA will hear by the thousand.',
    simplified:
      'Whether two merging white dwarfs explode, collapse to a neutron star or make a single heavier white dwarf depends on details BSE doesn’t follow; BSE explodes any carbon–oxygen pair above the Chandrasekhar mass.',
    expect: { outcome: 'typeIa' },
  },
  {
    id: 'blue-straggler',
    name: 'A blue straggler from a merger',
    pair: pair({ m1: 0.9, m2: 0.72, period: 1, z: 0.02 }),
    t: 5000,
    blurb:
      'Two dwarfs a day apart, slowly drawn together by magnetic braking. At 4.7 billion years the heavier fills its lobe, they touch, and they merge into one star of 1.62 M☉, back on the main sequence. Born today in a cluster 4.8 billion years old, where the stars at the turn-off weigh about 1.2 M☉, it looks too young: a blue straggler (Sandage, 1953). It lives out a 1.6 M☉ star’s life and dies as a white dwarf 2.4 billion years later.',
    tryThis: 'Find the merged star on the HR diagram, above the turn-off of stars as old as it is. Then lengthen the period to 1.5 days: the merger comes later, or not at all.',
    simplified:
      'BSE mixes two merging main-sequence stars into one with a new age from its burnt fraction; real mergers lose some mass and spin fast. In the cluster NGC 188 most blue stragglers were made by mass transfer instead, not by mergers (Mathieu and Geller, 2009).',
    expect: { outcome: 'merger' },
  },
  {
    id: 'stripped-supernova',
    name: 'A stripped-envelope supernova',
    pair: pair({ m1: 12, m2: 8.4, period: 10, z: 0.02 }),
    t: 20.9,
    blurb:
      'A 12 M☉ star fills its lobe as it crosses to the giants and gives its whole hydrogen envelope to its companion, in a few tens of thousands of years. What is left is its helium core, 2.7 M☉: a stripped star, hot and small, of the kind found at last in the Magellanic Clouds (Drout and others, 2023). It explodes with no hydrogen in its spectrum, a Type Ib or Ic supernova, leaving a neutron star in an eccentric orbit about a 17 M☉ blue star. Most Ib and Ic supernovae are thought to come from such pairs.',
    tryThis: 'Compare the stripped star’s radius with its companion’s just before the supernova. Then reroll the kick: some kicks unbind the pair, others leave it bound.',
    simplified:
      'BSE doesn’t say what a supernova’s spectrum looks like; the type here is read from the star that exploded, a helium star with no hydrogen left. Later the companion swells, swallows the neutron star and merges with it; BSE leaves a neutron star, a guess at what such a Thorne–Żytkow object becomes.',
    expect: { outcome: 'merger' },
  },
  {
    id: 'millisecond-pulsar',
    name: 'A millisecond pulsar from an X-ray binary',
    pair: pair({ m1: 12, m2: 1, period: 1230, z: 0.02, seed: 6 }),
    t: 12100,
    blurb:
      'A 12 M☉ star with a Sun-like companion far out. The big star’s envelope swallows the small one, which spirals in, throws the envelope off and is left beside a helium star; that explodes at 20 million years, and the neutron star, kicked at 360 km/s, holds on to its companion. After 12 billion years the companion becomes a red giant and feeds the neutron star for 150 million years: a low-mass X-ray binary. The neutron star gains 0.7 M☉, enough to spin it up to hundreds of turns a second, and is left as a millisecond pulsar beside a helium white dwarf in a 51-day orbit.',
    tryThis: 'Reroll the kick a few times: most kicks this hard break the pair. Then look at the neutron star’s mass before and after the X-ray binary.',
    simplified:
      'BSE lets the neutron star keep all it is given below the Eddington limit; real millisecond pulsars seem to have kept less. It follows mass, not spin: the spin-up is inferred, not computed.',
    expect: { outcome: 'xrb' },
  },
  {
    id: 'cygnus-x1',
    name: 'Like Cygnus X-1',
    pair: pair({ m1: 60, m2: 20, period: 6, z: 0.01, wind: 0.25 }),
    t: 6.95,
    blurb:
      'A 60 M☉ star gives most of its mass to its 20 M☉ companion, becomes a Wolf–Rayet star and collapses at 4.5 million years into a black hole of 16 M☉, beside an O star of 56 M☉ less than a week apart. By 7 million years the O star nearly fills its lobe, and its wind feeds the black hole: a high-mass X-ray binary like Cygnus X-1 (a 21 M☉ black hole and a 41 M☉ star, 5.6 days apart; Miller-Jones and others, 2021). Then the O star overflows and pours most of itself towards the black hole, which can swallow little of it; the orbit shrinks to 13 solar radii, the O star’s core becomes a black hole too, and the two merge by gravitational waves 670 million years later.',
    tryThis: 'Set the winds back to BSE’s own: the black hole comes out at about half Cygnus X-1’s mass. Its weight was one of the arguments that the winds of massive stars are weaker than older recipes said.',
    simplified:
      'The winds are a quarter of BSE’s and the metals half the Sun’s, to reach a black hole near Cygnus X-1’s mass. BSE gives a black hole no kick. The X-ray light itself isn’t computed.',
    expect: { outcome: 'bbh', merges: true },
  },
  {
    id: 'hulse-taylor',
    name: 'The Hulse–Taylor pulsar’s ancestors',
    pair: pair({ m1: 12, m2: 11.4, period: 3000, z: 0.02, seed: 31 }),
    t: 24,
    blurb:
      'Two nearly equal stars, 12 and 11.4 M☉, eight years apart. Born so alike they become giants together and share one envelope; the drag leaves two helium stars a tenth of an AU apart. The first explodes, and its kick flings the pair into an orbit of eccentricity 0.87; the second swells, swallows the new neutron star at its closest approach, and explodes inside the envelope it shares with it. Out come two neutron stars of 1.46 and 1.33 M☉ in a 7.8-hour orbit, like PSR B1913+16, whose 7.75 hours and two masses of 1.44 and 1.39 M☉ Hulse and Taylor measured. Gravitational waves merge them 1.8 billion years later.',
    tryThis: 'Reroll the kick: most seeds break the pair or leave it too wide to merge. Then look at the two supernovae’s kicks in the outcome.',
    simplified:
      'BSE ends the orbit circular, because its second supernova goes off inside a common envelope and BSE rounds the orbit off there; the real pulsar’s orbit is eccentric (0.62), which will bring its merger in 300 million years from now. Two stars this alike sharing one envelope is one proposed route to such pairs (Brown, 1995).',
    expect: { outcome: 'dns', merges: true },
  },
  {
    id: 'gw150914',
    name: 'Like GW150914',
    pair: pair({ m1: 100, m2: 45, period: 4.29, z: 0.0005, wind: 0.25 }),
    t: 6.2,
    blurb:
      'A metal-poor pair of 100 and 45 M☉, four days apart. The big star overflows on the main sequence, gives its envelope away and collapses into a black hole of 30 M☉ at 3.8 million years. The companion, now the giant, swells, shares an envelope with the black hole, which shrinks the orbit to 18 solar radii, then collapses too. Two black holes of 31 and 30 M☉ are left 22 solar radii apart, and gravitational waves bring them together 610 million years later: a merger like GW150914, the first LIGO heard (36 and 31 M☉).',
    tryThis: 'Raise the metals to the Sun’s, or the winds to BSE’s own, and watch the black holes shrink. Then turn α down: the common envelope swallows the black hole instead.',
    simplified:
      'BSE’s winds don’t weaken with fewer metals as much as modern models’, so the winds here are a quarter of its own. Its formulae stop at 100 M☉, and it gives black holes no kick and no spin.',
    expect: { outcome: 'bbh', merges: true },
  },
];

export const findPairPreset = (id: string) => PAIR_PRESETS.find((p) => p.id === id);
