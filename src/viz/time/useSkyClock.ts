import { useRef, useState, type RefObject } from 'react';
import { clamp } from '../../core/math/angles';
import { jdFromCalendar } from '../../core/time/calendar';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../hooks';

/**
 * A figure's clock: the moment it shows (a Julian Date, TT), whether it is
 * running, and how fast. It runs only while the figure is on screen. With
 * reduced motion it moves in jumps twice a second rather than gliding.
 */

export interface SkyClock {
  jdTT: number;
  setJdTT: (jd: number) => void;
  playing: boolean;
  setPlaying: (playing: boolean) => void;
  /** Seconds of sky time per second of real time. */
  speed: number;
  setSpeed: (speed: number) => void;
  /** The earliest and latest moments allowed (JD, TT). */
  min: number;
  max: number;
}

export const SPEEDS: readonly { label: string; seconds: number }[] = [
  { label: 'Real time', seconds: 1 },
  { label: '1 min a second', seconds: 60 },
  { label: '10 min a second', seconds: 600 },
  { label: '1 hour a second', seconds: 3600 },
  { label: '1 day a second', seconds: 86_400 },
  { label: '1 month a second', seconds: 30 * 86_400 },
  { label: '1 year a second', seconds: 365.25 * 86_400 },
];

/** 1 January 3000 BC to 31 December AD 3000: the range of the planets' elements. */
export const SKY_MIN_JD = jdFromCalendar({ year: -2999, month: 1, day: 1 });
export const SKY_MAX_JD = jdFromCalendar({ year: 3000, month: 12, day: 31.99 });

export function useSkyClock(
  ref: RefObject<Element | null>,
  initial: () => number,
  options: { speed?: number; min?: number; max?: number; onEnd?: () => void } = {},
): SkyClock {
  const min = options.min ?? SKY_MIN_JD;
  const max = options.max ?? SKY_MAX_JD;
  const [jdTT, setJd] = useState(() => clamp(initial(), min, max));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(options.speed ?? 600);
  const onScreen = useOnScreen(ref);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);

  useAnimationFrame(playing && onScreen, (dt) => {
    let advance = dt;
    if (reducedMotion) {
      pending.current += dt;
      if (pending.current < 0.5) return;
      advance = pending.current;
      pending.current = 0;
    }
    const next = clamp(jdTT + (advance * speed) / 86_400, min, max);
    setJd(next);
    if (next === min || next === max) {
      setPlaying(false);
      options.onEnd?.();
    }
  });

  return {
    jdTT,
    setJdTT: (jd: number) => setJd(clamp(jd, min, max)),
    playing,
    setPlaying,
    speed,
    setSpeed,
    min,
    max,
  };
}
