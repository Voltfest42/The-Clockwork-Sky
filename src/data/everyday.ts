/**
 * Everyday sizes and distances, for turning a scale model into things a reader
 * can picture (Figure 1.2). Rough, typical values: metres. Distances between
 * cities are great-circle distances, rounded.
 */

export interface Thing {
  /** As it reads after "about the size of": "a grain of sand". */
  name: string;
  /** Typical size across, m. */
  size: number;
}

export const EVERYDAY_SIZES: readonly Thing[] = [
  { name: 'a red blood cell', size: 8e-6 },
  { name: 'the width of a hair', size: 7e-5 },
  { name: 'a speck of dust', size: 2.5e-4 },
  { name: 'a grain of sand', size: 9e-4 },
  { name: 'a peppercorn', size: 5e-3 },
  { name: 'a pea', size: 0.01 },
  { name: 'a cherry', size: 0.015 },
  { name: 'a grape', size: 0.022 },
  { name: 'a golf ball', size: 0.043 },
  { name: 'a tennis ball', size: 0.067 },
  { name: 'a grapefruit', size: 0.1 },
  { name: 'a football', size: 0.22 },
  { name: 'a beach ball', size: 0.5 },
  { name: 'a big exercise ball', size: 1 },
  { name: 'a person', size: 1.7 },
  { name: 'a car', size: 4.5 },
  { name: 'a house', size: 10 },
  { name: 'a tennis court', size: 24 },
  { name: 'a football pitch', size: 105 },
  { name: 'the Eiffel Tower', size: 330 },
];

export const EVERYDAY_DISTANCES: readonly Thing[] = [
  { name: 'a marathon', size: 42_195 },
  { name: 'London to Paris', size: 344e3 },
  { name: 'London to Rome', size: 1_434e3 },
  { name: 'London to Cairo', size: 3_510e3 },
  { name: 'London to New York', size: 5_570e3 },
  { name: 'Earth’s diameter', size: 12_742e3 },
  { name: 'once round the Earth', size: 40_075e3 },
  { name: 'Earth to the Moon', size: 384_400e3 },
];

/** A walking step, m. */
export const STEP = 0.75;

/** A football pitch's length, m. */
export const PITCH = 105;

/** What the Sun can be in the scale model. Sizes across, m. */
export const SUN_MODELS: readonly Thing[] = [
  { name: 'a marble', size: 0.016 },
  { name: 'a grapefruit', size: 0.1 },
  { name: 'a beach ball', size: 0.5 },
  { name: 'a house', size: 10 },
];
