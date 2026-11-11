/**
 * A supernova's kick and its effect on the orbit, ported from kick.f of Hurley's
 * BSE (Hurley, Tout & Pols 2002, MNRAS 329, 897, §2.7). The kick speed is drawn
 * from a Maxwellian of dispersion sigma (km/s; Hansen & Phinney 1997) in a random
 * direction, at a random point of the orbit (by mean anomaly); the remnant's mass
 * loss and the kick give the new orbit. Masses in M☉, separations in R☉,
 * angular momentum in M☉ R☉² per year, speeds in km/s.
 */
import type { Ran3 } from './ran3';

/** The orbit, which the kick changes in place as the Fortran changes its arguments. */
export interface KickOrbit {
  ecc: number;
  /** Separation (semi-major axis), R☉. */
  sep: number;
  /** Orbital angular momentum, M☉ R☉² yr⁻¹. */
  jorb: number;
}

export interface KickSwitches {
  /** The Maxwellian's dispersion, km/s (BSE: 190). */
  sigma: number;
  /** 0: black holes get no kick. */
  bhflag: number;
}

/**
 * Kicks a new neutron star or black hole of type kw (mass m1 before, m1n after, M☉) with companion m2 (M☉),
 * updating `orbit` (ecc > 1 means the pair came apart). Returns the new centre of mass's velocity, km/s.
 * With no companion pass sep = -1 and ecc = 0. Random numbers are drawn even when the kick is switched off,
 * as in the Fortran, so the sequence stays in step with Hurley's.
 */
export function kick(kw: number, m1: number, m1n: number, m2: number, orbit: KickOrbit, sw: KickSwitches, ran: Ran3): [number, number, number] {
  let { ecc, sep, jorb } = orbit;
  const vs: [number, number, number] = [0, 0, 0];
  const twopi = 2 * Math.PI;
  // Velocities in km/s from masses and radii in solar units
  const gmrkm = 1.906125e5;
  const yearsc = 3.1557e7;
  const rsunkm = 6.96e5;

  // The separation at a random mean anomaly
  let r = 0;
  let vr: number;
  let vr2: number;
  let salpha: number;
  let calpha: number;
  if (sep > 0 && ecc >= 0) {
    const xx = ran.next();
    const mm = xx * twopi;
    let em = mm;
    for (;;) {
      const dif = em - ecc * Math.sin(em) - mm;
      if (Math.abs(dif / mm) <= 1.0e-4) break;
      const der = 1 - ecc * Math.cos(em);
      const del = dif / der;
      em = em - del;
    }
    r = sep * (1 - ecc * Math.cos(em));
    // The relative velocity there
    salpha = Math.sqrt((sep * sep * (1 - ecc * ecc)) / (r * (2 * sep - r)));
    calpha = (-1 * ecc * Math.sin(em)) / Math.sqrt(1 - ecc * ecc * Math.cos(em) * Math.cos(em));
    vr2 = gmrkm * (m1 + m2) * (2 / r - 1 / sep);
    vr = Math.sqrt(vr2);
  } else {
    vr = 0;
    vr2 = 0;
    salpha = 0;
    calpha = 0;
  }

  // The kick: a Maxwellian by Hénon's method for pairs of components
  const v = [0, 0, 0, 0, 0];
  let u1 = 0;
  let theta = 0;
  for (let k = 1; k <= 2; k++) {
    u1 = ran.next();
    const u2 = ran.next();
    const s = sw.sigma * Math.sqrt(-2 * Math.log(1 - u1));
    theta = twopi * u2;
    v[2 * k - 1] = s * Math.cos(theta);
    v[2 * k] = s * Math.sin(theta);
  }
  let vk2 = v[1] ** 2 + v[2] ** 2 + v[3] ** 2;
  let vk = Math.sqrt(vk2);
  if ((kw === 14 && sw.bhflag === 0) || kw < 0) {
    vk2 = 0;
    vk = 0;
  }
  const sphi = -1 + 2 * u1;
  const phi = Math.asin(sphi);
  const cphi = Math.cos(phi);
  const stheta = Math.sin(theta);
  const ctheta = Math.cos(theta);

  if (!(sep <= 0 || ecc < 0)) {
    // The new relative speed, semi-major axis and eccentricity
    const vn2 = vk2 + vr2 - 2 * vk * vr * (ctheta * cphi * salpha - stheta * cphi * calpha);
    sep = 2 / r - vn2 / (gmrkm * (m1n + m2));
    sep = 1 / sep;
    const v1 = vk2 * sphi * sphi;
    const v2 = (vk * ctheta * cphi - vr * salpha) ** 2;
    const hn2 = r * r * (v1 + v2);
    let ecc2 = 1 - hn2 / (gmrkm * sep * (m1n + m2));
    ecc2 = Math.max(ecc2, 0);
    ecc = Math.sqrt(ecc2);
    // The new orbital angular momentum, with hn in R☉² per year
    jorb = ((m1n * m2) / (m1n + m2)) * Math.sqrt(hn2) * (yearsc / rsunkm);
  }
  if (ecc <= 1.0) {
    // The new centre of mass's velocity
    const mx1 = (vk * m1n) / (m1n + m2);
    const mx2 = (vr * (m1 - m1n) * m2) / ((m1n + m2) * (m1 + m2));
    vs[0] = mx1 * ctheta * cphi + mx2 * salpha;
    vs[1] = mx1 * stheta * cphi + mx2 * calpha;
    vs[2] = mx1 * sphi;
  } else {
    // The relative speed at infinity of a pair that came apart (the simple method)
    sep = r / (ecc - 1);
    const mu = Math.acos(1 / ecc);
    vr2 = (gmrkm * (m1n + m2)) / sep;
    vr = Math.sqrt(vr2);
    vs[0] = vr * Math.sin(mu);
    vs[1] = vr * Math.cos(mu);
    vs[2] = 0;
    ecc = Math.min(ecc, 99.99);
  }
  orbit.ecc = ecc;
  orbit.sep = sep;
  orbit.jorb = jorb;
  return vs;
}
