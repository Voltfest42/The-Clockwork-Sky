import { useEffect, useRef, useState } from 'react';
import { useAnimationFrame } from '../hooks';
import { canPlayAudio, playSamples, type Playing } from './playback';

/**
 * Sound for a figure: `play` starts a waveform (only call it from a click), `stop` ends it, and while something
 * plays, `elapsed` counts its seconds for a playhead. The sound stops when the figure goes away.
 */
export function useSound() {
  const [playing, setPlaying] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const handle = useRef<Playing | null>(null);

  useAnimationFrame(playing !== null, () => setElapsed(handle.current?.elapsed() ?? 0));
  useEffect(() => () => handle.current?.stop(), []);

  const play = (id: string, samples: ArrayLike<number>, sampleRate: number, volume: number): boolean => {
    handle.current?.stop();
    const h = playSamples(samples, sampleRate, volume, () => {
      if (handle.current === h) {
        handle.current = null;
        setPlaying(null);
      }
    });
    handle.current = h;
    setPlaying(h ? id : null);
    setElapsed(0);
    setDuration(h?.duration ?? 0);
    return h !== null;
  };
  const stop = () => handle.current?.stop();

  return { playing, elapsed, duration, play, stop, supported: canPlayAudio() };
}
