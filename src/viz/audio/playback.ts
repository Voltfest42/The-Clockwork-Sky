/**
 * Plays a waveform through the speakers with Web Audio. Only ever called from
 * a click: browsers won't start sound by themselves, and the course never
 * autoplays. One sound plays at a time, course-wide; starting another stops
 * it. The audio context is made on first use, never at import time.
 */

let context: AudioContext | null = null;
let current: { source: AudioBufferSourceNode; onEnd: () => void } | null = null;

/** Whether this browser can play sound at all. */
export function canPlayAudio(): boolean {
  return typeof window !== 'undefined' && typeof window.AudioContext === 'function';
}

function audioContext(): AudioContext | null {
  if (!canPlayAudio()) return null;
  context ??= new AudioContext();
  return context;
}

export interface Playing {
  /** Seconds since the sound started, for a playhead. */
  elapsed: () => number;
  duration: number;
  stop: () => void;
}

/**
 * Plays `samples` (any scale: normalised so the loudest is at `volume`, 0 to 1), sampled at `sampleRate`, with
 * 20 ms fades at both ends so they don't click. `onEnd` is called when it finishes or is stopped. Returns null when
 * the browser can't play sound.
 */
export function playSamples(samples: ArrayLike<number>, sampleRate: number, volume: number, onEnd: () => void): Playing | null {
  const ctx = audioContext();
  if (!ctx) return null;
  stopSound();
  if (ctx.state === 'suspended') void ctx.resume();
  // Resample to the context's rate by linear interpolation, so any source rate works
  const rate = ctx.sampleRate;
  const duration = samples.length / sampleRate;
  const n = Math.max(1, Math.floor(duration * rate));
  const buffer = ctx.createBuffer(1, n, rate);
  const out = buffer.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  const gain = peak > 0 ? volume / peak : 0;
  const fade = Math.min(n / 4, Math.round(0.02 * rate));
  for (let i = 0; i < n; i++) {
    const t = (i * sampleRate) / rate;
    const j = Math.floor(t);
    const a = samples[Math.min(j, samples.length - 1)];
    const b = samples[Math.min(j + 1, samples.length - 1)];
    let v = (a + (b - a) * (t - j)) * gain;
    if (i < fade) v *= i / fade;
    if (i > n - 1 - fade) v *= (n - 1 - i) / fade;
    out[i] = v;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  const started = ctx.currentTime;
  const entry = { source, onEnd };
  source.onended = () => {
    if (current === entry) current = null;
    onEnd();
  };
  current = entry;
  source.start();
  return {
    elapsed: () => Math.min(duration, ctx.currentTime - started),
    duration,
    stop: () => {
      if (current === entry) stopSound();
    },
  };
}

/** Stops whatever is playing. */
export function stopSound(): void {
  if (!current) return;
  const { source } = current;
  current = null;
  try {
    source.stop();
  } catch {
    // Already stopped
  }
}
