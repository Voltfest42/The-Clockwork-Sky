/** Playback speeds: how many seconds of light travel pass per second of yours. */
export const SPEEDS = [
  { factor: 1, label: 'Real speed' },
  { factor: 60, label: '1 minute a second' },
  { factor: 3_600, label: '1 hour a second' },
  { factor: 86_400, label: '1 day a second' },
  { factor: 31_557_600, label: '1 year a second' },
] as const;
