/**
 * Famous pulsars for the P–Ṗ diagram (Figure 26.4): each one's period and
 * spin-down rate as published in the papers that found or timed it, with what
 * it is famous for.
 *
 * This is the fallback the Part III plan names (§13, question 2): the ATNF
 * Pulsar Catalogue (Manchester et al. 2005) holds every known pulsar, but its
 * data "remain the property of" ATNF/CSIRO, so a file derived from it can't be
 * shipped without their permission, which has been asked for. The figure
 * takes any list of `PulsarRecord`s (`PULSAR_SET`), so the catalogue's 4,500
 * can replace these sixty without changing it.
 *
 * Periods in seconds, spin-down rates in seconds per second. Magnetars' rates
 * wander by factors of a few between outbursts; theirs are the papers' values.
 * The count of known pulsars and magnetars is a dated fact (asOf.ts "pulsars").
 */

export type PulsarKind = 'young' | 'ordinary' | 'double-neutron-star' | 'millisecond' | 'magnetar' | 'compact-object';

export interface PulsarRecord {
  /** Its catalogue name, e.g. "PSR B0531+21". */
  name: string;
  /** A common name, if it has one: "the Crab pulsar". */
  nickname?: string;
  /** Period (s) and its rate of change (s/s); null where none is measured. */
  P: number;
  Pdot: number | null;
  kind: PulsarKind;
  /** In orbit with another star. */
  binary: boolean;
  /** Why it's famous, in a sentence. */
  note: string;
  /** Where the numbers come from. */
  source: string;
}

export const KIND_NAMES: Record<PulsarKind, string> = {
  young: 'young pulsars, most in supernova remnants',
  ordinary: 'ordinary pulsars',
  'double-neutron-star': 'pulsars in pairs of neutron stars',
  millisecond: 'millisecond pulsars',
  magnetar: 'magnetars',
  'compact-object': 'quiet neutron stars in supernova remnants',
};

export const FAMOUS_PULSARS: readonly PulsarRecord[] = [
  // ---------- young ----------
  { name: 'PSR B0531+21', nickname: 'the Crab pulsar', P: 0.0333924, Pdot: 4.21e-13, kind: 'young', binary: false, note: 'At the heart of the Crab Nebula, left by the supernova of 1054; its spin-down lights the whole nebula.', source: 'Lyne, Pritchard & Graham-Smith 1993' },
  { name: 'PSR B0833−45', nickname: 'the Vela pulsar', P: 0.0893284, Pdot: 1.25e-13, kind: 'young', binary: false, note: 'Every few years it suddenly spins faster, a glitch, as its superfluid inside catches up with its crust.', source: 'Large, Vaughan & Mills 1968; Dodson et al. 2002' },
  { name: 'PSR B1509−58', P: 0.1508, Pdot: 1.53e-12, kind: 'young', binary: false, note: 'In the supernova remnant MSH 15−52; one of the few whose slowing has been measured well enough to test the magnet’s braking law.', source: 'Seward & Harnden 1982; Kaspi et al. 1994' },
  { name: 'PSR J0537−6910', P: 0.016122, Pdot: 5.18e-14, kind: 'young', binary: false, note: 'The fastest-spinning young pulsar, in the Large Magellanic Cloud; it glitches more often than any other.', source: 'Marshall et al. 1998' },
  { name: 'PSR B0540−69', P: 0.05057, Pdot: 4.79e-13, kind: 'young', binary: false, note: 'The Crab’s twin in the Large Magellanic Cloud, with its own glowing nebula.', source: 'Seward, Harnden & Helfand 1984' },
  { name: 'PSR J1846−0258', P: 0.3266, Pdot: 7.08e-12, kind: 'young', binary: false, note: 'In the remnant Kes 75, with one of the youngest characteristic ages; in 2006 it flared like a magnetar.', source: 'Gotthelf et al. 2000' },
  { name: 'PSR J1119−6127', P: 0.408, Pdot: 4.02e-12, kind: 'young', binary: false, note: 'A radio pulsar with a field of 4 × 10¹³ gauss that burst like a magnetar in 2016.', source: 'Camilo et al. 2000' },
  { name: 'PSR J0205+6449', P: 0.06568, Pdot: 1.94e-13, kind: 'young', binary: false, note: 'In the nebula 3C 58.', source: 'Murray et al. 2002' },
  { name: 'PSR B1951+32', P: 0.03953, Pdot: 5.85e-15, kind: 'young', binary: false, note: 'In the remnant CTB 80, moving through it.', source: 'Kulkarni et al. 1988' },
  { name: 'PSR J0633+1746', nickname: 'Geminga', P: 0.2371, Pdot: 1.097e-14, kind: 'young', binary: false, note: 'Bright in gamma rays and X-rays, almost silent in radio: its radio beam misses us.', source: 'Halpern & Holt 1992' },
  { name: 'PSR J1124−5916', P: 0.1353, Pdot: 7.47e-13, kind: 'young', binary: false, note: 'In the oxygen-rich remnant G292.0+1.8.', source: 'Camilo et al. 2002' },
  { name: 'PSR B1706−44', P: 0.1025, Pdot: 9.3e-14, kind: 'young', binary: false, note: 'A gamma-ray pulsar much like Vela.', source: 'Johnston et al. 1992' },
  { name: 'PSR J2229+6114', P: 0.05162, Pdot: 7.83e-14, kind: 'young', binary: false, note: 'Powers the “Boomerang” nebula.', source: 'Halpern et al. 2001' },
  { name: 'PSR J1811−1925', P: 0.06467, Pdot: 4.4e-14, kind: 'young', binary: false, note: 'Found by its X-ray pulses in the remnant G11.2−0.3.', source: 'Torii et al. 1997' },

  // ---------- ordinary ----------
  { name: 'PSR B1919+21', nickname: 'CP 1919', P: 1.3373, Pdot: 1.348e-15, kind: 'ordinary', binary: false, note: 'The first pulsar, found by Jocelyn Bell in 1967.', source: 'Hewish et al. 1968' },
  { name: 'PSR B0329+54', P: 0.71452, Pdot: 2.05e-15, kind: 'ordinary', binary: false, note: 'The brightest pulsar in the northern sky.', source: 'Cole & Pilkington 1968' },
  { name: 'PSR B0950+08', P: 0.25307, Pdot: 2.3e-16, kind: 'ordinary', binary: false, note: 'One of the nearest, about 260 parsecs away.', source: 'Pilkington et al. 1968' },
  { name: 'PSR B1133+16', P: 1.18791, Pdot: 3.73e-15, kind: 'ordinary', binary: false, note: 'One of the first found, and among the brightest.', source: 'Pilkington et al. 1968' },
  { name: 'PSR B0809+74', P: 1.29224, Pdot: 1.68e-16, kind: 'ordinary', binary: false, note: 'Its pulses’ parts drift steadily across its window, as its beam’s sparks circle the pole.', source: 'found in 1968' },
  { name: 'PSR B0031−07', P: 0.94295, Pdot: 4.08e-16, kind: 'ordinary', binary: false, note: 'Switches between three patterns of drifting pulses, and sometimes stops.', source: 'Large, Vaughan & Wielebinski 1968' },
  { name: 'PSR B1237+25', P: 1.38245, Pdot: 9.6e-16, kind: 'ordinary', binary: false, note: 'Its pulse has five parts: our line of sight cuts across the middle of its beam.', source: 'found in 1968' },
  { name: 'PSR B0943+10', P: 1.09771, Pdot: 3.53e-15, kind: 'ordinary', binary: false, note: 'Flips between two modes, and its X-rays flip with its radio.', source: 'Hermsen et al. 2013' },
  { name: 'PSR B2016+28', P: 0.55795, Pdot: 1.48e-16, kind: 'ordinary', binary: false, note: 'An old, slowly slowing pulsar with drifting pulses.', source: 'found in 1968' },
  { name: 'PSR B0826−34', P: 1.84884, Pdot: 9.96e-16, kind: 'ordinary', binary: false, note: 'Switched off most of the time: it nulls for long stretches.', source: 'found in 1978' },
  { name: 'PSR J2144−3933', P: 8.50983, Pdot: 4.96e-16, kind: 'ordinary', binary: false, note: 'Far past the death line, yet still shining: the theory of the line isn’t settled.', source: 'Young, Manchester & Johnston 1999' },
  { name: 'PSR J0250+5854', P: 23.535, Pdot: 2.72e-14, kind: 'ordinary', binary: false, note: 'The slowest radio pulsar when LOFAR found it in 2018: one turn in 23.5 seconds.', source: 'Tan et al. 2018' },
  { name: 'PSR J1847−0130', P: 6.7071, Pdot: 1.27e-12, kind: 'ordinary', binary: false, note: 'An ordinary radio pulsar with a magnetar’s field, 9 × 10¹³ gauss, but no outbursts.', source: 'McLaughlin et al. 2003' },
  { name: 'PSR J1819−1458', P: 4.26316, Pdot: 5.75e-13, kind: 'ordinary', binary: false, note: 'A rotating radio transient: single bright pulses minutes apart, with nothing between.', source: 'McLaughlin et al. 2006' },

  // ---------- in pairs of neutron stars ----------
  { name: 'PSR B1913+16', nickname: 'the Hulse–Taylor pulsar', P: 0.05903, Pdot: 8.63e-18, kind: 'double-neutron-star', binary: true, note: 'Its orbit shrinks exactly as gravitational waves predict (Chapter 29).', source: 'Hulse & Taylor 1975' },
  { name: 'PSR J0737−3039A', nickname: 'the double pulsar (A)', P: 0.022699, Pdot: 1.76e-18, kind: 'double-neutron-star', binary: true, note: 'The only pair in which both neutron stars were seen as pulsars.', source: 'Burgay et al. 2003' },
  { name: 'PSR J0737−3039B', nickname: 'the double pulsar (B)', P: 2.7735, Pdot: 8.92e-16, kind: 'double-neutron-star', binary: true, note: 'The young one of the pair, never recycled; its beam has since precessed away from us.', source: 'Lyne et al. 2004' },
  { name: 'PSR B1534+12', P: 0.037904, Pdot: 2.42e-18, kind: 'double-neutron-star', binary: true, note: 'A second test of gravitational waves from a pair.', source: 'Wolszczan 1991' },
  { name: 'PSR B2127+11C', P: 0.030529, Pdot: 4.99e-18, kind: 'double-neutron-star', binary: true, note: 'A pair of neutron stars in the globular cluster M15.', source: 'Anderson et al. 1990' },
  { name: 'PSR J1906+0746', P: 0.14407, Pdot: 2.03e-14, kind: 'double-neutron-star', binary: true, note: 'A young pulsar orbiting an older neutron star.', source: 'Lorimer et al. 2006' },

  // ---------- millisecond ----------
  { name: 'PSR B1937+21', P: 0.0015578, Pdot: 1.05e-19, kind: 'millisecond', binary: false, note: 'The first millisecond pulsar, 642 turns a second.', source: 'Backer et al. 1982' },
  { name: 'PSR J1748−2446ad', P: 0.001396, Pdot: null, kind: 'millisecond', binary: true, note: 'The fastest known, 716 turns a second, in the globular cluster Terzan 5. Its slowing isn’t measured: the cluster’s pull swamps it.', source: 'Hessels et al. 2006' },
  { name: 'PSR J0437−4715', P: 0.0057575, Pdot: 5.73e-20, kind: 'millisecond', binary: true, note: 'The nearest and brightest millisecond pulsar; NICER measured its radius.', source: 'Johnston et al. 1993' },
  { name: 'PSR B1957+20', nickname: 'the Black Widow', P: 0.0016074, Pdot: 1.69e-20, kind: 'millisecond', binary: true, note: 'Its wind is boiling away its companion.', source: 'Fruchter, Stinebring & Taylor 1988' },
  { name: 'PSR J0740+6620', P: 0.0028858, Pdot: 1.22e-20, kind: 'millisecond', binary: true, note: 'One of the heaviest neutron stars measured well, 2.08 Suns.', source: 'Cromartie et al. 2020; Fonseca et al. 2021' },
  { name: 'PSR J0348+0432', P: 0.039123, Pdot: 2.41e-19, kind: 'millisecond', binary: true, note: 'A 2.01-Sun neutron star with a white dwarf in a 2.5-hour orbit.', source: 'Antoniadis et al. 2013' },
  { name: 'PSR J0952−0607', P: 0.0014138, Pdot: null, kind: 'millisecond', binary: true, note: 'The heaviest neutron star measured, 2.35 Suns, eating its companion.', source: 'Bassa et al. 2017; Romani et al. 2022' },
  { name: 'PSR J1614−2230', P: 0.0031508, Pdot: 9.62e-21, kind: 'millisecond', binary: true, note: 'The first neutron star weighed at about two Suns (2010), by the delay its companion puts in its pulses.', source: 'Demorest et al. 2010' },
  { name: 'PSR J0030+0451', P: 0.0048654, Pdot: 1.02e-20, kind: 'millisecond', binary: false, note: 'NICER’s first radius, from its X-ray hot spots.', source: 'Lommen et al. 2000' },
  { name: 'PSR B1855+09', P: 0.0053621, Pdot: 1.78e-20, kind: 'millisecond', binary: true, note: 'One of the first neutron stars weighed by the delay of its pulses past its companion.', source: 'Segelstein et al. 1986' },
  { name: 'PSR J1909−3744', P: 0.0029471, Pdot: 1.4e-20, kind: 'millisecond', binary: true, note: 'One of the steadiest clocks known, timed to tens of nanoseconds.', source: 'Jacoby et al. 2003' },
  { name: 'PSR J1713+0747', P: 0.0045702, Pdot: 8.53e-21, kind: 'millisecond', binary: true, note: 'A mainstay of the pulsar timing arrays listening for gravitational waves.', source: 'Foster, Wolszczan & Camilo 1993' },
  { name: 'PSR B1257+12', P: 0.0062185, Pdot: 1.14e-19, kind: 'millisecond', binary: true, note: 'The first planets known beyond the Solar System orbit it (1992).', source: 'Wolszczan & Frail 1992' },
  { name: 'PSR J0337+1715', P: 0.0027326, Pdot: 1.77e-20, kind: 'millisecond', binary: true, note: 'In a triple with two white dwarfs: a test that everything falls alike.', source: 'Ransom et al. 2014' },
  { name: 'PSR J1023+0038', P: 0.001688, Pdot: 6.93e-21, kind: 'millisecond', binary: true, note: 'Seen switching between a radio pulsar and an X-ray star fed by its companion: recycling caught in the act.', source: 'Archibald et al. 2009' },
  { name: 'PSR B1821−24A', P: 0.0030543, Pdot: 1.62e-18, kind: 'millisecond', binary: false, note: 'The first pulsar found in a globular cluster (M28), and the most powerful millisecond pulsar.', source: 'Lyne et al. 1987' },
  { name: 'PSR J2124−3358', P: 0.0049311, Pdot: 2.06e-20, kind: 'millisecond', binary: false, note: 'A millisecond pulsar with no companion left.', source: 'Bailes et al. 1997' },

  // ---------- magnetars ----------
  { name: 'SGR 1806−20', P: 7.47, Pdot: 8.3e-11, kind: 'magnetar', binary: false, note: 'Its giant flare of 27 December 2004 outshone every other X-ray source in the sky.', source: 'Kouveliotou et al. 1998' },
  { name: 'SGR 1900+14', P: 5.16, Pdot: 1.1e-10, kind: 'magnetar', binary: false, note: 'A giant flare on 27 August 1998 that disturbed Earth’s upper air.', source: 'Kouveliotou et al. 1999' },
  { name: 'SGR 1935+2154', P: 3.245, Pdot: 1.43e-11, kind: 'magnetar', binary: false, note: 'Made a fast radio burst seen on 28 April 2020: the first from a known source.', source: 'Israel et al. 2016' },
  { name: '1E 2259+586', P: 6.979, Pdot: 4.84e-13, kind: 'magnetar', binary: false, note: 'In the remnant CTB 109; its outburst in 2002 showed the “anomalous X-ray pulsars” were magnetars too.', source: 'Gavriil & Kaspi 2002' },
  { name: '4U 0142+61', P: 8.688, Pdot: 2.03e-12, kind: 'magnetar', binary: false, note: 'The brightest of the anomalous X-ray pulsars.', source: 'Gavriil & Kaspi 2002' },
  { name: '1E 1547.0−5408', P: 2.0698, Pdot: 2.32e-11, kind: 'magnetar', binary: false, note: 'A magnetar that pulses in radio.', source: 'Camilo et al. 2007' },
  { name: 'SGR 0418+5729', P: 9.078, Pdot: 4e-15, kind: 'magnetar', binary: false, note: 'Bursts like a magnetar with an ordinary pulsar’s field outside: its strong field is hidden inside.', source: 'Rea et al. 2013' },
  { name: '1E 1841−045', P: 11.78, Pdot: 4.1e-11, kind: 'magnetar', binary: false, note: 'In the remnant Kes 73.', source: 'Vasisht & Gotthelf 1997' },
  { name: 'PSR J1745−2900', P: 3.7635, Pdot: 6.6e-12, kind: 'magnetar', binary: false, note: 'Orbits the Galaxy’s central black hole, about a tenth of a parsec from it.', source: 'Mori et al. 2013; Kaspi et al. 2014' },

  // ---------- quiet neutron stars in remnants ----------
  { name: 'PSR J0821−4300', P: 0.1128, Pdot: 9.3e-18, kind: 'compact-object', binary: false, note: 'In Puppis A: a young neutron star with a feeble field, an “anti-magnetar”.', source: 'Gotthelf, Halpern & Alford 2013' },
  { name: 'PSR J1852+0040', P: 0.1049, Pdot: 8.7e-18, kind: 'compact-object', binary: false, note: 'In Kes 79: young, hot, and barely magnetic.', source: 'Halpern & Gotthelf 2010' },
];

/** The pulsars the figure shows, and where they come from: swap in the ATNF catalogue here if permission is granted. */
export const PULSAR_SET = {
  pulsars: FAMOUS_PULSARS,
  source: 'famous pulsars, each from the paper that found or timed it',
} as const;

/** How many pulsars and magnetars are known: dated facts (asOf.ts "pulsars"). */
export const PULSAR_COUNTS = {
  /** The ATNF Pulsar Catalogue v2.9.0 (6 October 2026): its count is a fact, not its data. */
  pulsars: 4503,
  pulsarsRounded: 'about 4,500',
  /** The McGill Online Magnetar Catalog: about two dozen confirmed and a handful of candidates. */
  magnetars: 30,
  asOf: 'October 2026',
} as const;
