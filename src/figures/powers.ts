import { formatSignificant, type Scientific } from '../core/math/scientific';

/** The worked examples for the exponent machine (Toolkit T1). */

export type Operation = 'times' | 'over';

export interface Preset {
  question: string;
  a: Scientific;
  aName: string;
  op: Operation;
  b: Scientific;
  bName: string;
  /** The answer's unit, and what it means. */
  unit: string;
  meaning: (result: number) => string;
}

/** Worked examples, with values from the research brief (docs/part1/research.md §2). */
export const PRESETS: readonly Preset[] = [
  {
    question: 'How long does sunlight take to reach Earth?',
    a: { mantissa: 1.496, exponent: 11 },
    aName: 'the distance to the Sun, in metres',
    op: 'over',
    b: { mantissa: 2.998, exponent: 8 },
    bName: 'the speed of light, in metres per second',
    unit: 's',
    meaning: (s) => `${formatSignificant(s, 3)} seconds, or about ${Math.floor(s / 60)} minutes ${Math.round(s % 60)} seconds.`,
  },
  {
    question: 'How many Earths fit across the Sun?',
    a: { mantissa: 1.391, exponent: 9 },
    aName: 'the Sun’s diameter, in metres',
    op: 'over',
    b: { mantissa: 1.274, exponent: 7 },
    bName: 'Earth’s diameter, in metres',
    unit: '',
    meaning: (n) => `about ${Math.round(n)} Earths.`,
  },
  {
    question: 'How far is a light-year?',
    a: { mantissa: 2.998, exponent: 8 },
    aName: 'the speed of light, in metres per second',
    op: 'times',
    b: { mantissa: 3.156, exponent: 7 },
    bName: 'the seconds in a year',
    unit: 'm',
    meaning: (m) => `${formatSignificant(m / 1e3 / 1e12, 3)} trillion kilometres.`,
  },
  {
    question: 'How many seconds are there in 80 years?',
    a: { mantissa: 8, exponent: 1 },
    aName: 'the years',
    op: 'times',
    b: { mantissa: 3.156, exponent: 7 },
    bName: 'the seconds in a year',
    unit: 's',
    meaning: (s) => `about ${formatSignificant(s / 1e9, 2)} billion seconds.`,
  },
];
