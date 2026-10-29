import { frequencyOf, photonEnergyEv, temperatureForPeak } from '../core/light/planck';
import { bandOf, SAME_SIZE } from '../data/spectrum';
import { formatEnergy, formatFrequency, formatKelvin, formatWavelength } from '../viz/spectrum/format';

/**
 * The spectrum ruler (Figure 10.1): for any wavelength, its band, frequency,
 * photon energy, the temperature that glows brightest there, and something
 * of about the same size.
 */

/** The colour name of visible light of a wavelength (m), or null outside 400–700 nm. */
export function colourName(wavelength: number): string | null {
  const nm = wavelength * 1e9;
  if (nm < 400 || nm >= 700) return null;
  if (nm < 450) return 'violet';
  if (nm < 495) return 'blue';
  if (nm < 570) return 'green';
  if (nm < 590) return 'yellow';
  if (nm < 620) return 'orange';
  return 'red';
}

/** The thing in SAME_SIZE nearest in size to a wavelength (m), on a log scale. */
export function sameSizeAs(wavelength: number): (typeof SAME_SIZE)[number] {
  return SAME_SIZE.reduce((best, s) => (Math.abs(Math.log10(s.size / wavelength)) < Math.abs(Math.log10(best.size / wavelength)) ? s : best));
}

export function describeWavelength(wavelength: number) {
  const band = bandOf(wavelength);
  const colour = colourName(wavelength);
  const like = sameSizeAs(wavelength);
  return {
    band,
    colour,
    wavelength: formatWavelength(wavelength),
    frequency: formatFrequency(frequencyOf(wavelength)),
    energy: formatEnergy(photonEnergyEv(wavelength)),
    glow: formatKelvin(temperatureForPeak(wavelength)),
    like: Math.abs(Math.log10(like.size / wavelength)) < 1 ? like.name : null,
  };
}

/** The figure's narration. */
export function rulerCaption(wavelength: number): string {
  const d = describeWavelength(wavelength);
  const what = d.colour ? `${d.band.name.toLowerCase()} (${d.colour})` : d.band.name.toLowerCase();
  return `${d.wavelength}: ${what}, at ${d.frequency}. Each photon carries ${d.energy}, and a body at ${d.glow} glows brightest here.`;
}
