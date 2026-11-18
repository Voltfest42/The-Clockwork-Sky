import { DYING_SUN_PLANETS, EARTH_MASS, engulfmentBoundary, followPlanet, R_SUN_AU, starAt, SUN_NOW, SUN_Z, type PlanetPath, type StarNow } from '../../core/orrery/dyingSun';
import { lifeOf, TYPE_NAMES } from '../../core/stellar/lives';

/**
 * The Sun's death in words and charts, for the Orrery (SunsDeathPanel.tsx):
 * the averaged model for some winds and tide, each planet's fate, and the Sun
 * now.
 */

export const TIDE_CHOICES = [0, 0.1, 0.3, 1, 3, 10] as const;

/** The window the charts show, Myr: from the red giant's last swelling to the white dwarf. */
export const FROM = 12_200;
export const TO = 12_480;

export const PLANET_STYLE: Record<string, { color: string; dashed?: boolean }> = {
  mercury: { color: 'var(--text-muted)', dashed: true },
  venus: { color: 'var(--series-3)' },
  earth: { color: 'var(--series-1)' },
  mars: { color: 'var(--series-3)', dashed: true },
};

export interface SunsDeathModel {
  paths: { id: string; name: string; path: PlanetPath }[];
  sun: { x: number; y: number }[];
  earthLine: number;
  jupiterLine: number;
  /** The Sun's mass today, as a share of its starting mass. */
  todayMass: number;
}

/** The averaged model for some winds and tide: each planet's path, the Sun's radius in the charts' window, and the boundaries. */
export function sunsDeathModel(windScale: number, tide: number): SunsDeathModel {
  const track = lifeOf(1, SUN_Z, { windScale });
  const paths = DYING_SUN_PLANETS.map((p) => ({ id: p.id, name: p.name, path: followPlanet(track, p.a, p.mass * EARTH_MASS, tide) }));
  const sun: { x: number; y: number }[] = [];
  for (const s of track.steps) if (s.t >= FROM && s.t <= TO && s.kw < 10) sun.push({ x: s.t / 1000, y: s.R * R_SUN_AU });
  const wd = track.steps.find((s) => s.kw >= 10 && s.t >= FROM);
  if (wd && wd.t <= TO) sun.push({ x: wd.t / 1000, y: wd.R * R_SUN_AU });
  return {
    paths,
    sun,
    earthLine: engulfmentBoundary(track, EARTH_MASS, tide),
    jupiterLine: engulfmentBoundary(track, 317.83 * EARTH_MASS, tide),
    todayMass: starAt(track, SUN_NOW).mass,
  };
}

/** A planet's fate in words. */
export function fateWords(name: string, path: PlanetPath): string {
  if (path.engulfed !== null) return `${name} is swallowed ${(path.engulfed / 1000).toFixed(3)} billion years after the Sun’s birth.`;
  const reach = Math.round(path.closest * 100);
  return `${name} survives, ending ${path.final.toFixed(2)} AU from the white dwarf; the Sun’s surface reached ${reach}% of the way to its orbit.`;
}

/** The Sun now, in words, for the clock and the caption. */
export function sunWords(star: StarNow): string {
  const age = `${(star.t / 1000).toFixed(star.t > 12_000 ? 3 : 2)} billion years old`;
  const kind = star.ejecting ? 'throwing off its last envelope' : (TYPE_NAMES[star.kw] ?? 'a star').toLowerCase();
  const size = star.kw >= 10 ? 'about the size of Earth' : `${(star.radius / R_SUN_AU).toPrecision(star.radius / R_SUN_AU >= 10 ? 3 : 2)} times its present radius`;
  return `The Sun at ${age}: ${star.kw >= 10 ? 'a white dwarf' : kind}, ${size}, with ${star.mass.toFixed(3)} of its mass now`;
}

