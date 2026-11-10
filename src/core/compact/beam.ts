/**
 * A pulsar's beams as a lighthouse: two cones of radio waves centred on the
 * magnetic axis's two ends, which is tilted by α from the spin axis. Our line
 * of sight makes an angle ζ with the spin axis. As the star turns by φ, the
 * angle θ between the first beam's axis and us obeys (the dot product of the
 * two directions, Toolkit T7)
 *
 *   cos θ = cos α cos ζ + sin α sin ζ cos φ,
 *
 * and the second beam's axis, pointing the other way, makes π − θ. We see a
 * pulse whenever either is inside the beam's half-width ρ. The beam is drawn
 * as a core with a ring (cone) round it, as radio pulsars' beams seem to be
 * (Rankin 1983, 1993): a line of sight through the middle sees three parts,
 * one grazing the edge sees one or two.
 *
 * Angles in radians; the phase φ runs over one turn.
 */

export interface BeamGeometry {
  /** The magnetic axis's tilt from the spin axis, α. */
  alpha: number;
  /** Our line of sight's angle from the spin axis, ζ. */
  zeta: number;
  /** The beam's half-width, ρ. */
  rho: number;
}

/** The angle between beam 1's axis and our line of sight at phase φ. */
export function beamAngle(g: BeamGeometry, phase: number): number {
  const c = Math.cos(g.alpha) * Math.cos(g.zeta) + Math.sin(g.alpha) * Math.sin(g.zeta) * Math.cos(phase);
  return Math.acos(Math.max(-1, Math.min(1, c)));
}

/** How bright a beam looks from angle θ off its axis, 0 to 1: a core, and a ring at 70% of the half-width. */
export function beamBrightness(theta: number, rho: number): number {
  if (theta >= rho) return 0;
  const x = theta / rho;
  const core = Math.exp(-((x / 0.28) ** 2));
  const ring = 0.85 * Math.exp(-(((x - 0.7) / 0.13) ** 2));
  // Fade to nothing at the edge so that the pulse has no step.
  const edge = Math.min(1, (1 - x) / 0.08);
  return Math.min(1, (core + ring) * edge);
}

export interface PulseProfile {
  /** Brightness at each of n phases over one turn (0 to 1), starting with beam 1 nearest us. */
  brightness: Float64Array;
  /** Which beam each phase's light comes from (0 none, 1 or 2). */
  beam: Uint8Array;
  /** How many separate pulses a turn shows, and each one's width (radians of phase). */
  pulses: { beam: 1 | 2; centre: number; width: number; peaks: number }[];
  /** The closest each beam's axis comes to our line of sight, radians. */
  closest: [number, number];
}

/** The pulses we receive over one turn, sampled at n phases. */
export function pulseProfile(g: BeamGeometry, n = 720): PulseProfile {
  const brightness = new Float64Array(n);
  const beam = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const phase = (2 * Math.PI * i) / n;
    const t1 = beamAngle(g, phase);
    const b1 = beamBrightness(t1, g.rho);
    const b2 = beamBrightness(Math.PI - t1, g.rho);
    brightness[i] = Math.max(b1, b2);
    beam[i] = b1 > 0 ? 1 : b2 > 0 ? 2 : 0;
  }
  // Pulses: runs of phases where a beam is seen (the run through phase 0 wraps round).
  const pulses: PulseProfile['pulses'] = [];
  const seen = (i: number) => beam[((i % n) + n) % n];
  let start = 0;
  while (start < n && seen(start) !== 0) start++;
  if (start === n) {
    // Seen all turn long: a beam that always faces us.
    pulses.push({ beam: seen(0) as 1 | 2, centre: Math.PI, width: 2 * Math.PI, peaks: countPeaks(brightness, 0, n) });
  } else {
    let i = start;
    while (i < start + n) {
      if (seen(i) !== 0) {
        const b = seen(i);
        let j = i;
        while (j < start + n && seen(j) === b) j++;
        const width = ((j - i) / n) * 2 * Math.PI;
        const centre = ((((i + j - 1) / 2) % n) / n) * 2 * Math.PI;
        pulses.push({ beam: b as 1 | 2, centre, width, peaks: countPeaks(brightness, i, j) });
        i = j;
      } else i++;
    }
  }
  const closest: [number, number] = [Math.abs(g.alpha - g.zeta), Math.abs(Math.PI - g.alpha - g.zeta)];
  return { brightness, beam, pulses, closest };
}

/**
 * The width of the pulse from one beam (radians of phase), from spherical
 * geometry: cos ρ = cos α cos ζ + sin α sin ζ cos(W/2). Zero if the beam
 * misses us; 2π if it never leaves us.
 */
export function pulseWidth(alpha: number, zeta: number, rho: number): number {
  const s = Math.sin(alpha) * Math.sin(zeta);
  const c = Math.cos(rho) - Math.cos(alpha) * Math.cos(zeta);
  if (s < 1e-12) return Math.abs(alpha - zeta) < rho ? 2 * Math.PI : 0;
  const x = c / s;
  if (x >= 1) return 0;
  if (x <= -1) return 2 * Math.PI;
  return 2 * Math.acos(x);
}

/** Separate peaks in brightness[from..to) (indices wrap): maxima split by a dip below 80% of the smaller. */
function countPeaks(b: Float64Array, from: number, to: number): number {
  const n = b.length;
  const at = (i: number) => b[((i % n) + n) % n];
  const peaks: number[] = [];
  let low = Infinity;
  for (let i = from; i < to; i++) {
    const v = at(i);
    if (peaks.length) low = Math.min(low, v);
    if (v > 0.03 && v >= at(i - 1) && v > at(i + 1)) {
      if (!peaks.length || low < 0.8 * Math.min(v, peaks[peaks.length - 1])) {
        peaks.push(v);
        low = Infinity;
      } else peaks[peaks.length - 1] = Math.max(peaks[peaks.length - 1], v);
    }
  }
  return Math.max(1, peaks.length);
}
