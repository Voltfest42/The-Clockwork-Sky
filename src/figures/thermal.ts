import { AU, L_SUN, SOLAR_IRRADIANCE, T_SUN } from '../core/constants';
import { blackBodyBV } from '../core/light/filters';
import { fractionBetween, peakWavelength, planck, surfaceFlux, VISIBLE } from '../core/light/planck';
import { voyagerSunDistanceAu } from '../core/scale/catalogue';
import { jdFromUnixMs } from '../core/time/julian';
import { ORBITS } from '../data/orbits';
import { famousStar } from '../data/stars';
import { formatKelvin, formatWavelength } from '../viz/spectrum/format';

/**
 * Chapter 11's figures: black bodies (11.1), two filters (11.2), size,
 * temperature and power (11.3) and the inverse-square law (11.4).
 */

// ---------- 11.1, the blackbody explorer ----------

export const GLOWS = [
  { id: 'you', name: 'You', kelvin: 310 },
  { id: 'stove', name: 'A stove ring', kelvin: 900 },
  { id: 'filament', name: 'A lamp filament', kelvin: 2700 },
  { id: 'betelgeuse', name: 'Betelgeuse', kelvin: famousStar('betelgeuse').temperature.value },
  { id: 'sun', name: 'The Sun', kelvin: T_SUN },
  { id: 'sirius', name: 'Sirius', kelvin: famousStar('sirius-a').temperature.value },
  { id: 'rigel', name: 'Rigel', kelvin: famousStar('rigel').temperature.value },
  { id: 'white-dwarf', name: 'A young white dwarf', kelvin: 100_000 },
] as const;

/** A black body's spectrum as [wavelength (m), B_λ] points, evenly spaced in log wavelength. */
export function planckCurve(kelvin: number, from: number, to: number, n = 240): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const l = from * (to / from) ** (i / n);
    out.push([l, planck(l, kelvin)]);
  }
  return out;
}

/** The faintest glow the eye notices in the dark: below about 800 K (the Draper point) a hot body looks black. */
export const DRAPER_POINT = 798;

/** What a black body looks like and gives out, in a sentence. */
export function describeGlow(kelvin: number): string {
  const peak = formatWavelength(peakWavelength(kelvin));
  const visible = fractionBetween(VISIBLE.from, VISIBLE.to, kelvin);
  const share = visible < 0.001 ? 'almost none' : visible < 0.01 ? 'under 1%' : `${Math.round(visible * 100)}%`;
  const looks =
    kelvin < DRAPER_POINT
      ? 'it gives out no visible light to speak of, only infrared'
      : kelvin < 1500
        ? 'it glows a dull red'
        : kelvin < 4000
          ? 'it glows orange'
          : kelvin < 7000
            ? 'it looks white, faintly warm'
            : 'it looks bluish white';
  return `At ${formatKelvin(kelvin)} the glow peaks at ${peak} and ${looks}. Each square metre gives out ${formatPower(surfaceFlux(kelvin))}, ${share} of it as visible light.`;
}

/** A power per square metre: "524 W", "63 MW", "5.7 TW". */
export function formatPower(watts: number): string {
  const units: [number, string][] = [
    [1e12, 'TW'],
    [1e9, 'GW'],
    [1e6, 'MW'],
    [1e3, 'kW'],
    [1, 'W'],
  ];
  const [scale, unit] = units.find(([s]) => watts >= s) ?? units[units.length - 1];
  const v = watts / scale;
  return `${v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString('en-GB')} ${unit}`;
}

// ---------- 11.2, two filters ----------

/** Stars on the B − V scale, at their measured colours. */
export const COLOUR_STARS = ['rigel', 'sirius-a', 'sun', 'arcturus', 'betelgeuse'].map((id) => {
  const s = famousStar(id);
  return { id, name: s.id === 'sun' ? 'the Sun' : s.name.replace(' A', ''), BV: s.BV, kelvin: s.temperature.value };
});

export function describeColour(kelvin: number): string {
  const bv = blackBodyBV(kelvin);
  const peak = peakWavelength(kelvin);
  const nearest = COLOUR_STARS.reduce((a, b) => (Math.abs(b.kelvin - kelvin) < Math.abs(a.kelvin - kelvin) ? b : a));
  const peakText = peak > 700e-9 ? 'in the infrared, beyond V' : peak < 400e-9 ? 'in the ultraviolet, beyond B' : `at ${formatWavelength(peak)}`;
  const star = Math.abs(nearest.kelvin - kelvin) / kelvin < 0.05 ? ` ${cap(nearest.name)}, at about this temperature, measures ${signed(nearest.BV)}.` : '';
  return `At ${formatKelvin(kelvin)} the spectrum peaks ${peakText}, and B − V = ${signed(bv)}: ${Math.abs(bv) < 0.03 ? 'the same colour as Vega, which sets the scale’s zero' : bv < 0 ? 'bluer than Vega, which sets the scale’s zero' : 'redder than Vega, which sets the scale’s zero'}.${star}`;
}

export function signed(x: number, digits = 2): string {
  return `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(digits)}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------- 11.3, size, temperature, power ----------

/** Luminosity in Suns from radius in Suns and temperature in kelvin: L = R² (T / T☉)⁴. */
export function solarLuminosity(radius: number, kelvin: number): number {
  return radius * radius * (kelvin / T_SUN) ** 4;
}

/** The radius (Suns) a star of a luminosity (Suns) and temperature (K) must have. */
export function solarRadiusFor(luminosity: number, kelvin: number): number {
  return Math.sqrt(luminosity) / (kelvin / T_SUN) ** 2;
}

export const SIZE_STARS = ['sun', 'proxima', 'sirius-a', 'sirius-b', 'arcturus', 'aldebaran', 'rigel', 'antares', 'betelgeuse'].map((id) => famousStar(id));

/** A luminosity in Suns, for reading: "0.0023", "25", "88,000". */
export function formatSuns(x: number): string {
  if (x >= 100) return Math.round(x).toLocaleString('en-GB', { maximumSignificantDigits: 2 });
  if (x >= 1) return x.toPrecision(2).replace(/\.0$/, '');
  return String(Number(x.toPrecision(2)));
}

// ---------- 11.4, the inverse-square law ----------

/** Sunlight (W/m²) at a distance from the Sun (AU). */
export function sunlightAt(au: number): number {
  return SOLAR_IRRADIANCE / (au * au);
}

/** The Sun's power (W) from sunlight at Earth: irradiance × the area of a sphere 1 AU in radius. */
export function sunPowerFromSunlight(irradiance = SOLAR_IRRADIANCE): number {
  return irradiance * 4 * Math.PI * AU * AU;
}

/** Where sunlight is measured in Figure 11.4: the planets at their mean distances, and Voyager 1 today. */
export function sunlightPlaces(ms: number): { id: string; name: string; au: number; watts: number }[] {
  const planets = ORBITS.filter((o) => o.kind === 'planet').map((o) => ({ id: o.id, name: o.name, au: o.a, watts: sunlightAt(o.a) }));
  const voyager = voyagerSunDistanceAu(jdFromUnixMs(ms));
  return [...planets, { id: 'voyager', name: 'Voyager 1', au: voyager, watts: sunlightAt(voyager) }];
}

/** The Sun's luminosity, as the check on 11.4's sum. */
export const SUN_LUMINOSITY = L_SUN;
