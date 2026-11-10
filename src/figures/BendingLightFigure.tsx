import { useMemo, useState, type ReactNode } from 'react';
import { closestApproach, deflection, PHOTON_SPHERE, traceRay, weakFieldDeflection } from '../core/gr/schwarzschild';
import { Caption, Figure } from '../viz/Figure';
import { ScatterChart } from '../viz/ScatterChart';
import { B_RANGE, B_START, CAPTURE_IMPACT, formatDegrees, rayFan, SUN_IMPACT } from './blackHoles';
import { Slider } from './Slider';
import styles from './sky/sky.module.css';

/**
 * Bending light (Figure 27.2): rays of light passing a black hole at
 * different aims (impact parameters), by exact null geodesics: bent a little,
 * bent hard, looped round the photon sphere, or captured. Every ray aimed
 * within √27 GM/c² of the centre falls in, which makes the shadow. Below, the
 * deflection against the aim beside the weak-field rule 4GM/c²b, out to the
 * Sun's edge.
 */

const VIEW = 22;

export function BendingLightFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [b, setB] = useState<number>(B_START);
  const reset = () => setB(B_START);
  const fan = useMemo(() => rayFan(), []);
  const ray = useMemo(() => traceRay(b, { from: 40, to: 45, dpsi: 0.002 }), [b]);
  const rmin = closestApproach(b);
  const exact = deflection(b);
  const weak = weakFieldDeflection(b);
  const sv = (v: number) => (v / VIEW) * 200;
  const path = (pts: readonly { x: number; y: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'} ${sv(p.x).toFixed(1)} ${(-sv(p.y)).toFixed(1)}`).join(' ');
  const curve = useMemo(() => {
    const out: { b: number; d: number }[] = [];
    for (let i = 0; i <= 160; i++) {
      const bb = CAPTURE_IMPACT * 1.0001 * (1e6 / CAPTURE_IMPACT) ** ((i / 160) ** 1.4);
      out.push({ b: bb, d: deflection(bb) });
    }
    return out;
  }, []);

  const caption = ray.captured
    ? `Aimed ${b.toFixed(2)} GM/c² from the centre, inside √27 = ${CAPTURE_IMPACT.toFixed(2)}, the light is captured: it spirals in and crosses the horizon. Every ray aimed this close is lost, so the hole casts a shadow ${(2 * CAPTURE_IMPACT).toFixed(1)} GM/c² across, two and a half times the horizon’s width.`
    : `Aimed ${b.toFixed(2)} GM/c² from the centre, the light comes within ${rmin!.toFixed(2)} GM/c² and is turned by ${formatDegrees(exact)}${ray.loops > 0 ? `, circling the hole ${ray.loops === 1 ? 'once' : `${ray.loops} times`} on the way` : ''}. The weak-field rule 4GM/c²b says ${formatDegrees(weak)}${
        exact / weak > 1.1 ? `: close in, the true bending is ${(exact / weak).toFixed(1)} times as much` : ', close to the truth this far out'
      }.`;

  return (
    <Figure
      number={number}
      title="Bending light"
      description="Rays of light from the left passing a black hole at different aims. Far out they are bent slightly, by 4GM/c²b, as starlight passing the Sun is; closer in they are bent hard, can loop round the hole at 1.5 times its horizon’s radius, and every ray aimed within 2.6 horizon radii of the centre falls in. That capture zone is the black hole’s shadow."
      height={900}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the ray you aim', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="#ffd166" strokeWidth="3" /> },
        { label: 'other rays: bent, or captured (red)', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="#9aa8c4" strokeWidth="1.5" /> },
        { label: 'the shadow’s edge, aimed √27 GM/c² from the centre', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="#f87171" strokeWidth="1.5" strokeDasharray="4 3" /> },
        { label: 'the horizon and light’s circle, 3GM/c²', symbol: <circle r="6" fill="#000" stroke="#9aa8c4" strokeDasharray="2 2" /> },
        { label: 'deflection: exact (relativity) and the weak-field rule', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--accent)" strokeWidth="2.5" /> },
      ]}
      simplified={
        <p>
          The rays are exact null geodesics round a black hole that doesn’t spin, drawn in the plane they travel in; the deflections come from an
          elliptic integral. A spinning hole’s shadow is a little flattened on one side. The picture uses distances in GM/c²: 15 km for a black hole
          of 10 Suns, 6.3 million km for Sagittarius A*.
        </p>
      }
    >
      <div className={styles.controls}>
        <Slider label="Aim, from the centre" value={b} min={B_RANGE[0]} max={B_RANGE[1]} log step={0.002} format={(v) => `${v.toFixed(2)} GM/c²`} onChange={(v) => setB(Math.round(v * 1000) / 1000)} />
      </div>
      <div className={styles.split}>
        <div>
          <p className={styles.panelTitle}>Rays from the left</p>
          <svg viewBox="-210 -210 420 420" width="100%" style={{ maxWidth: 440, display: 'block' }} role="img" aria-label={`Rays of light passing a black hole. ${caption}`}>
            <rect x="-210" y="-210" width="420" height="420" rx="8" fill="var(--sky-bg)" />
            {[1, -1].map((s) => (
              <line key={s} x1={-210} x2={210} y1={-sv(s * CAPTURE_IMPACT)} y2={-sv(s * CAPTURE_IMPACT)} stroke="#f87171" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
            ))}
            {fan.map(({ b: bb, ray: rr }) => (
              <g key={bb}>
                <path d={path(rr.points)} fill="none" stroke={rr.captured ? '#f87171' : '#9aa8c4'} strokeWidth="1.2" opacity="0.8" />
                <path d={path(rr.points.map((p) => ({ x: p.x, y: -p.y })))} fill="none" stroke={rr.captured ? '#f87171' : '#9aa8c4'} strokeWidth="1.2" opacity="0.8" />
              </g>
            ))}
            <circle r={sv(PHOTON_SPHERE)} fill="none" stroke="#9aa8c4" strokeDasharray="3 3" />
            <circle r={sv(2)} fill="#000" stroke="#9aa8c4" />
            <path d={path(ray.points)} fill="none" stroke="#ffd166" strokeWidth="2.6" />
            <text x={-200} y={-196} fontSize="11" fill="#9aa8c4">
              {VIEW} GM/c² to the edge
            </text>
          </svg>
        </div>
        <div>
          <p className={styles.panelTitle}>How far light is turned, against its aim</p>
          <ScatterChart
            groups={[]}
            lines={[{ name: 'weak-field rule 4GM/c²b', color: 'var(--series-2)', dashed: true, f: (x) => weakFieldDeflection(x) }]}
            xScale="log"
            yScale="log"
            xMin={5}
            xMax={1e6}
            yMin={1e-6}
            yMax={30}
            xLabel="Aim (GM/c²)"
            yLabel="Turned by (radians)"
            formatX={(x) => (x >= 1e3 ? `10${['', '', '', '³', '⁴', '⁵', '⁶'][Math.round(Math.log10(x))]}` : String(Math.round(x)))}
            formatY={(y) => (y >= 1 ? String(Math.round(y)) : y >= 0.01 ? String(y) : `10${['⁻¹', '⁻²', '⁻³', '⁻⁴', '⁻⁵', '⁻⁶'][-Math.round(Math.log10(y)) - 1]}`)}
            height={360}
            ariaLabel={`Deflection against aim on log scales: exact, rising without limit as the aim nears ${CAPTURE_IMPACT.toFixed(2)} GM/c², and the weak-field rule 4GM/c²b, a straight line it joins far out. The Sun’s edge, at ${Math.round(SUN_IMPACT).toLocaleString('en-GB')} GM/c², turns light by 1.75 seconds of arc.`}
          >
            {(sx, sy) => (
              <g>
                <path d={curve.map((p, i) => `${i ? 'L' : 'M'} ${sx(p.b).toFixed(1)} ${sy(Math.min(30, p.d)).toFixed(1)}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
                <line x1={sx(CAPTURE_IMPACT)} x2={sx(CAPTURE_IMPACT)} y1={sy(1e-6)} y2={sy(30)} stroke="var(--wrong)" strokeDasharray="4 3" />
                <circle cx={sx(SUN_IMPACT)} cy={sy(deflection(SUN_IMPACT))} r={5} fill="var(--sun)" stroke="var(--sun-edge)" strokeWidth="1.5" />
                <text x={sx(SUN_IMPACT) - 8} y={sy(deflection(SUN_IMPACT)) - 8} fontSize="11" fill="var(--text)" textAnchor="end">
                  the Sun’s edge: 1.75″
                </text>
                {!ray.captured && b >= 5 && <circle cx={sx(b)} cy={sy(Math.min(30, exact))} r={6} fill="var(--accent)" stroke="var(--bg)" strokeWidth="2" />}
              </g>
            )}
          </ScatterChart>
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
