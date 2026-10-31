import type { ForgeStar } from '../../core/stellar/forge';

/**
 * The Star Forge's ready-made stars and clusters, each with a blurb, something
 * to try and what's simplified. Values from the famous stars file
 * (src/data/stars.ts) where there is one; the engine does the rest.
 */

export interface ForgePreset {
  id: string;
  name: string;
  blurb: string;
  tryThis: string;
  simplified: string;
  /** Stars to forge (one, or several to compare), or a cluster to age. */
  stars?: readonly ForgeStar[];
  cluster?: { id: string; age: number };
}

export const PRESETS: readonly ForgePreset[] = [
  {
    id: 'sun',
    name: 'The Sun',
    stars: [{ mass: 1, z: 0.02, wind: 1 }],
    blurb:
      'Our star: about 11 billion years on the main sequence, slowly brightening; then a red giant, the helium flash, a second swelling on the asymptotic giant branch, and a white dwarf of half its mass.',
    tryThis: 'Set time to run “as time before the end” and slide through the last stages. Watch the inside view: the core holds half the mass in a sliver of the width.',
    simplified:
      'SSE’s Sun starts on the zero-age main sequence with SSE’s solar make-up, Z = 0.02, and comes out 4% dimmer than the real Sun at 4.6 billion years. Its last crossing from giant to white dwarf, when the shed layers glow as a planetary nebula, is drawn as a jump.',
  },
  {
    id: 'sirius',
    name: 'Sirius A',
    stars: [{ mass: 2.06, z: 0.02, wind: 1 }],
    blurb:
      'Twice the Sun’s mass and 25 times its light, so its main sequence lasts about a billion years. Sirius is a quarter of a billion years old, so it has most of that still ahead.',
    tryThis: 'Add a star of 5 Suns to compare: about the mass Sirius B was born with. It has already lived its whole life and become the white dwarf beside Sirius A.',
    simplified: 'Sirius is a pair, but the Forge makes single stars; at their distance apart the two never exchanged mass. Sirius’s slight excess of metals is left out.',
  },
  {
    id: 'red-dwarf',
    name: 'A red dwarf (0.12 Suns)',
    stars: [{ mass: 0.12, z: 0.02, wind: 1 }],
    blurb:
      'A red dwarf like Proxima Centauri burns its fuel so slowly that its main sequence lasts trillions of years, about two hundred times as long as the Galaxy has existed. No star this small has yet died.',
    tryThis: 'Compare it with the Sun, and look at the inside view: the whole star is one churning convection zone, so it can burn nearly all its hydrogen, not just its core’s.',
    simplified:
      'Below half a Sun, SSE’s formulas are stretched beyond the models they were fitted to. Its end, a brief swelling to about the Sun’s size and a helium white dwarf, is a guess about a future no one has seen: detailed models (Laughlin and others, 1997) have such stars heat up into “blue dwarfs” instead of swelling.',
  },
  {
    id: 'brown-dwarf',
    name: 'A brown dwarf (0.05 Suns)',
    stars: [{ mass: 0.05, z: 0.02, wind: 1 }],
    blurb:
      'Fifty-two Jupiters: too light to fuse hydrogen for long. It burns its little deuterium in its first few million years, then shrinks, fades and cools for ever, from a red dwarf’s colour to a T dwarf glowing in infrared.',
    tryThis: 'Slide the mass up past 0.075 Suns, the hydrogen-burning limit, and watch the fade turn into a life of trillions of years.',
    simplified:
      'Brown dwarfs aren’t in SSE. They follow Baraffe and others’ (2015) published tracks to their end, and Burrows and others’ (2001) power laws beyond, to 10 billion years; between the tracks’ masses the Forge interpolates.',
  },
  {
    id: 'betelgeuse',
    name: 'Betelgeuse (18 Suns)',
    stars: [{ mass: 18, z: 0.02, wind: 1 }],
    blurb:
      'A red supergiant: about ten million years on the main sequence, about a million burning helium as a star a thousand times the Sun’s width, then a supernova that leaves a neutron star.',
    tryThis: 'Find the moment it swells: the crossing from blue to red takes a few tens of thousands of years, a blink in its life. Then turn the winds up to three times and see what changes.',
    simplified:
      'Betelgeuse’s mass is uncertain (16–19 Suns). SSE’s remnant masses (Belczynski and others, 2002) make its neutron star 2.0 Suns; most measured neutron stars are near 1.4. Betelgeuse spins, has a companion, and may have swallowed another star; the Forge’s star does none of these.',
  },
  {
    id: 'winds-20',
    name: '20 Suns, rich and poor in metals',
    stars: [
      { mass: 20, z: 0.02, wind: 1 },
      { mass: 20, z: 0.001, wind: 1 },
    ],
    blurb:
      'Two stars of 20 Suns, one with the Sun’s metals and one with a twentieth of them. Metals make winds stronger, so the metal-rich star blows away more of itself and leaves a neutron star; the metal-poor one keeps its mass and collapses to a black hole.',
    tryThis: 'Compare their mass charts, then turn the metal-rich star’s winds down to half and see which way its fate goes.',
    simplified:
      'Where a star of about 20 Suns makes a neutron star or a black hole is one of the least certain things in the Forge: real stars of the same mass explode or collapse depending on the details of their cores (the grey zones on the calibration map’s fates).',
  },
  {
    id: 'heavy-100',
    name: '100 Suns, the Sun’s metals',
    stars: [{ mass: 100, z: 0.02, wind: 1 }],
    blurb:
      'A star of 100 Suns, a million times as bright as the Sun. Its winds blow away its whole hydrogen envelope in under four million years, leaving a hot, naked helium star, a Wolf–Rayet star, which collapses to a black hole of only 15 Suns.',
    tryThis: 'Look at its mass chart, then set the winds to a tenth: the black hole more than doubles.',
    simplified:
      'SSE’s formulas are stated valid up to 100 Suns, and its strongest winds, for stars brighter than the Humphreys–Davidson limit, are a rough recipe. Modern hot-star winds (Vink and others, 2001) are weaker; they are planned for version 2.',
  },
  {
    id: 'pair-instability',
    name: '150 Suns, almost no metals',
    stars: [{ mass: 150, z: 0.0001, wind: 0.1 }],
    blurb:
      'A star of 150 Suns with almost no metals and winds turned down to a tenth. Here the engine and other models part ways: SSE’s formulas stop growing at 100 Suns, so its helium core ends at 40, enough only for pair instability to make it pulse. Models of metal-free stars that keep their mass give it a helium core of 70 Suns, which a pair-instability supernova blows apart, leaving nothing.',
    tryThis: 'Slide the mass from 100 to 300 Suns and watch the “other models” line: pulses, then nothing left from about 140 Suns, then a collapse to a black hole above about 270.',
    simplified:
      'Stars this heavy may have formed only in the early Universe, and none has been seen to explode this way for certain. The other models’ helium cores follow Heger and Woosley’s (2002) rule for metal-free stars that keep their mass; where pair instability begins and ends is uncertain by several Suns.',
  },
  {
    id: 'pleiades',
    name: 'The Pleiades (a cluster)',
    cluster: { id: 'pleiades', age: 120 },
    blurb: 'Over a thousand stars born together about 110–125 million years ago, measured by Gaia. The heaviest have just begun to leave the main sequence.',
    tryThis: 'Slide the age up and watch the turn-off creep down the main sequence. Then “Forge the turn-off star” to see the life of a star leaving it now.',
    simplified:
      'Members, distances and dust are as in Figure 17.3. Every star in the line is single and started at the same moment; real clusters have pairs, which sit a little above the main sequence.',
  },
  {
    id: 'm67',
    name: 'M67 (a cluster)',
    cluster: { id: 'm67', age: 4000 },
    blurb: 'An old cluster of about four billion years, nearly the Sun’s age and make-up: its turn-off stars are a little heavier than the Sun, and it has red giants and a clump of helium-burning stars.',
    tryThis: 'Find the age where the line’s hook, the turn-off, meets Gaia’s stars. Then try the Pleiades’ age on M67.',
    simplified:
      'The line uses main-sequence colours and corrections for its giants, so its giant branch is only roughly placed. Members are chosen from Gaia’s data by position, motion and distance, so a few strangers will have slipped in.',
  },
];

export const findPreset = (id: string) => PRESETS.find((p) => p.id === id);
