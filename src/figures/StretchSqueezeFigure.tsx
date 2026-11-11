import { useRef, useState, type ReactNode } from 'react';
import { formatScientific } from '../core/math/scientific';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { armResponse, ARM_LENGTH, PROTON_WIDTH, REAL_STRAIN, ringPositions, type Polarisation } from './stretch';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Stretch and squeeze (Figure 29.2): a gravitational wave coming straight
 * towards the reader passes a ring of floating masses and an interferometer.
 * In the plus polarisation the ring stretches one way and squeezes the other;
 * in the cross polarisation the same, turned by 45°; the arms answer by how
 * the wave lines up with them. The stretching is exaggerated by about 10²⁰.
 */

const PERIOD = 2.5;

export function StretchSqueezeFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [pol, setPol] = useState<Polarisation>('plus');
  const [strength, setStrength] = useState(0.25);
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reducedMotion = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reset = () => {
    setPol('plus');
    setStrength(0.25);
    setTurn(0);
    setPhase(0);
    setPlaying(false);
  };
  useAnimationFrame(playing && onScreen && !reducedMotion, (dt) => setPhase((p) => (p + dt / PERIOD) % 1));

  const ring = ringPositions(pol, strength, phase * 2 * Math.PI);
  const response = armResponse(pol, strength, phase * 2 * Math.PI, (turn * Math.PI) / 180);
  const peakResponse = Math.max(...Array.from({ length: 64 }, (_, i) => Math.abs(armResponse(pol, strength, (i / 64) * 2 * Math.PI, (turn * Math.PI) / 180))));
  // The light at the output: dark when the arms are equal, brighter as they differ
  const light = strength > 0 ? Math.min(1, (response / strength) ** 2) : 0;

  const POL_NAMES: Record<Polarisation, string> = { plus: 'Plus (+)', cross: 'Cross (×)', circular: 'Both, a quarter-cycle apart' };
  const realChange = (REAL_STRAIN * ARM_LENGTH) / 2;
  const caption = `${pol === 'plus' ? 'The plus polarisation stretches the ring along one axis while it squeezes it along the other, then the reverse, every cycle.' : pol === 'cross' ? 'The cross polarisation does the same along the diagonals: it is the plus polarisation turned by 45°.' : 'With both polarisations a quarter-cycle apart, the stretch turns round the ring: circular polarisation, as from a pair seen face-on.'} The detector is turned ${turn}° from the wave’s axes: its arms ${peakResponse < 0.02 * strength ? 'don’t change at all, as the stretch runs along neither arm' : `differ by up to ${Math.round((peakResponse / strength) * 100)}% of the most a wave this strong could make them`}. At this moment the light at the output is ${light < 0.02 ? 'dark' : `${Math.round(light * 100)}% of its brightest`}.`;

  // Drawing: the ring in the left half, the interferometer in the right
  const W = 600;
  const H = 300;
  const R = 95;
  const rc = { x: 150, y: 150 };
  const L = 110;
  const ifo = { x: 360, y: 230 };
  const t = (turn * Math.PI) / 180;
  const n1 = { x: Math.cos(t), y: -Math.sin(t) };
  const n2 = { x: -Math.sin(t), y: -Math.cos(t) };
  const L1 = L * (1 + response / 2);
  const L2 = L * (1 - response / 2);

  return (
    <Figure
      number={number}
      title="Stretch and squeeze"
      description="A gravitational wave travelling straight towards you passes a ring of floating masses and a laser interferometer. In one polarisation (plus) the ring stretches up and down while it squeezes side to side, then the reverse; in the other (cross) the same along the diagonals. The interferometer’s two arms change length in opposite senses, and light leaks out where it was dark. The stretching is exaggerated about 10²⁰ times: a real wave changes LIGO’s 4-km arms by about a thousandth of a proton’s width."
      height={720}
      notToScale
      tryThis={tryThis}
      onReset={reset}
      onKeyDown={(e) => {
        if (e.target instanceof HTMLInputElement) return;
        if (e.key === ' ' && !reducedMotion) {
          e.preventDefault();
          setPlaying((p) => !p);
        }
      }}
      legend={[
        { label: 'the floating masses, and where they rest', symbol: <circle r="5" fill="#7dd3fc" /> },
        { label: 'the arms: the light runs out and back', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="#f97316" strokeWidth="3" /> },
      ]}
      simplified={
        <p>
          The stretch is exaggerated about 10²⁰ times, and the wave slowed to a cycle every few seconds (LIGO’s are tens to hundreds a second). The
          ring is drawn as the wave sees it, in the plane square to its travel; the interferometer lies in the same plane, with the wave coming
          straight down on it, where it answers best. A real interferometer keeps its arms’ light resonating hundreds of times (Fabry–Pérot
          cavities), which multiplies the change it sees, and has a laser of hundreds of kilowatts circulating in the arms.
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <span className={styles.toggles} role="group" aria-label="Polarisation">
          {(['plus', 'cross', 'circular'] as const).map((p) => (
            <button key={p} type="button" className={styles.toggle} aria-pressed={pol === p} onClick={() => setPol(p)}>
              {POL_NAMES[p]}
            </button>
          ))}
        </span>
        <button type="button" className={figureStyles.toolButton} onClick={() => setPlaying((p) => !p)} disabled={reducedMotion} aria-pressed={playing && !reducedMotion}>
          {playing && !reducedMotion ? 'Pause' : 'Let the wave pass'}
        </button>
      </div>
      <div ref={box}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', background: 'var(--sky-bg)', borderRadius: 6 }} role="img" aria-label={`A ring of masses and an interferometer as the wave passes. ${caption}`}>
          <text x={rc.x} y={20} textAnchor="middle" fontSize="12" fill="#cbd5e1">
            A ring of floating masses
          </text>
          <text x={rc.x} y={H - 10} textAnchor="middle" fontSize="11" fill="#9aa8c4">
            the wave comes straight out of the screen
          </text>
          <circle cx={rc.x} cy={rc.y} r={R} fill="none" stroke="#475569" strokeDasharray="3 4" />
          <circle cx={rc.x} cy={rc.y} r={3} fill="#9aa8c4" />
          {ring.map((p, i) => (
            <g key={i}>
              <circle cx={rc.x + p.rest.x * R} cy={rc.y - p.rest.y * R} r={2} fill="#475569" />
              <circle cx={rc.x + p.now.x * R} cy={rc.y - p.now.y * R} r={6} fill="#7dd3fc" />
            </g>
          ))}
          <text x={ifo.x + 70} y={20} textAnchor="middle" fontSize="12" fill="#cbd5e1">
            An interferometer
          </text>
          {/* the arms */}
          <line x1={ifo.x} y1={ifo.y} x2={ifo.x + n1.x * L1} y2={ifo.y + n1.y * L1} stroke="#f97316" strokeWidth="3" />
          <line x1={ifo.x} y1={ifo.y} x2={ifo.x + n2.x * L2} y2={ifo.y + n2.y * L2} stroke="#f97316" strokeWidth="3" />
          <line x1={ifo.x} y1={ifo.y} x2={ifo.x + n1.x * L} y2={ifo.y + n1.y * L} stroke="#fde68a" strokeWidth="1" strokeDasharray="2 3" />
          <line x1={ifo.x} y1={ifo.y} x2={ifo.x + n2.x * L} y2={ifo.y + n2.y * L} stroke="#fde68a" strokeWidth="1" strokeDasharray="2 3" />
          {/* mirrors */}
          {[
            { n: n1, len: L1 },
            { n: n2, len: L2 },
          ].map(({ n, len }, i) => (
            <line key={i} x1={ifo.x + n.x * len - n.y * 9} y1={ifo.y + n.y * len + n.x * 9} x2={ifo.x + n.x * len + n.y * 9} y2={ifo.y + n.y * len - n.x * 9} stroke="#e2e8f5" strokeWidth="4" />
          ))}
          <rect x={ifo.x - 6} y={ifo.y - 6} width={12} height={12} fill="#93c5fd" transform={`rotate(${45 - turn} ${ifo.x} ${ifo.y})`} />
          {/* the output */}
          <circle cx={ifo.x - 50} cy={ifo.y + 6} r={16} fill={`rgba(253, 230, 138, ${0.08 + 0.92 * light})`} stroke="#fde68a" />
          <text x={ifo.x - 50} y={ifo.y + 40} textAnchor="middle" fontSize="11" fill="#cbd5e1">
            light out: {light < 0.02 ? 'dark' : `${Math.round(light * 100)}%`}
          </text>
          <text x={ifo.x + 130} y={ifo.y + 34} fontSize="11" fill="#cbd5e1">
            arm 1 {signedPercent(response / 2)}
          </text>
          <text x={ifo.x + 130} y={ifo.y + 50} fontSize="11" fill="#cbd5e1">
            arm 2 {signedPercent(-response / 2)}
          </text>
        </svg>
      </div>
      <div className={styles.controls}>
        <Slider label="Strain shown (exaggerated)" value={strength} min={0} max={0.4} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setStrength(Math.round(v * 100) / 100)} />
        <Slider label="Detector turned by" value={turn} min={0} max={90} step={1} format={(v) => `${Math.round(v)}°`} onChange={(v) => setTurn(Math.round(v))} />
        <Slider label="Moment in the cycle" value={phase} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 360)}°`} onChange={(v) => setPhase(Math.round(v * 100) / 100)} />
      </div>
      <p className={styles.hint}>
        A real wave: GW150914’s strain at its peak was about {formatScientific(REAL_STRAIN, 2)}. It changed each of LIGO’s 4-km arms by about hL/2 ={' '}
        {formatScientific(realChange, 2)} m, about 1/{Math.round(PROTON_WIDTH / realChange / 10) * 10} of a proton’s width.
      </p>
      <Caption>{caption}</Caption>
    </Figure>
  );
}

/** "+12%", "−3%", "0%": a change in length. */
function signedPercent(x: number): string {
  const p = Math.round(Math.abs(x) * 100);
  return p === 0 ? '0%' : `${x > 0 ? '+' : '−'}${p}%`;
}
