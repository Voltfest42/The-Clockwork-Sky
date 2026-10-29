import { useId } from 'react';
import { limbBrightness, starCss } from './colour';

/**
 * A star drawn true: a disc in the colour its temperature gives (the sky
 * view's colour code, from Planck's law and the eye's colour-matching
 * functions), darker towards its edge as real stars are (limb darkening), at
 * whatever size the caller has worked out. An SVG group, centred on (cx, cy).
 */

const STOPS = [0, 0.3, 0.5, 0.65, 0.78, 0.88, 0.94, 0.98, 1];

export function StarDisc({ cx, cy, r, kelvin, title }: { cx: number; cy: number; r: number; kelvin: number; title?: string }) {
  const id = `limb${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (r < 1.5) {
    return (
      <circle cx={cx} cy={cy} r={Math.max(r, 0.8)} fill={starCss(kelvin)}>
        {title && <title>{title}</title>}
      </circle>
    );
  }
  return (
    <g>
      <defs>
        <radialGradient id={id}>
          {STOPS.map((rho) => (
            <stop key={rho} offset={rho} stopColor={starCss(kelvin, limbBrightness(Math.min(rho, 0.995)))} />
          ))}
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id})`}>
        {title && <title>{title}</title>}
      </circle>
    </g>
  );
}
