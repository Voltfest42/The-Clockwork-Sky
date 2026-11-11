import { useMemo, useState, type ReactNode } from 'react';
import { M_SUN } from '../core/constants';
import { octaveUp, spectrogram } from '../core/signal/strain';
import { Caption, Figure } from '../viz/Figure';
import { SpectrogramView } from '../viz/audio/SpectrogramView';
import { useSound } from '../viz/audio/useSound';
import { WaveformPlot } from '../viz/audio/WaveformPlot';
import { fitToData, GW150914, modelChirp } from './gw150914';
import { CHIRP_PRESETS, chirpView, leadingOrderTrack, NEUTRON_STAR_MAX, type ChirpPreset } from './ripples';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Make a chirp, and hear it (Figure 29.3): two masses in, a waveform out.
 * The inspiral to 3.5 post-Newtonian order, joined to a black hole's ringing;
 * its strain against time, its spectrogram with the frequency track (and the
 * leading-order sweep for the same chirp mass), and its sound, only on a
 * click, an octave up if asked. Beside it, GW150914 as LIGO's two detectors
 * recorded it, whitened, with the model fitted to it as a matched filter
 * would, to see and to hear.
 */

const START = CHIRP_PRESETS[0];

export function ChirpFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [preset, setPreset] = useState<ChirpPreset>(START);
  const [m1, setM1] = useState<number>(START.m1);
  const [m2, setM2] = useState<number>(START.m2);
  const [octave, setOctave] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [show, setShow] = useState<'model' | 'data'>('model');
  const [audioT0, setAudioT0] = useState(0);
  const sound = useSound();
  const reset = () => {
    sound.stop();
    setPreset(START);
    setM1(START.m1);
    setM2(START.m2);
    setOctave(false);
    setVolume(0.5);
    setShow('model');
  };
  const choose = (p: ChirpPreset) => {
    sound.stop();
    setPreset(p);
    setM1(p.m1);
    setM2(p.m2);
  };

  const view = useMemo(() => chirpView(m1, m2, preset.mpc, preset.z), [m1, m2, preset]);
  const model = view.model;
  const fs = model.sampleRate;
  const tStart = model.t0;
  const tEnd = model.t0 + model.h.length / fs;
  const tMin = Math.max(tStart, -2);
  const tMax = Math.min(tEnd, view.neutronStars ? 0.01 : Math.max(0.03, 8 * model.tau));
  const fMax = Math.min(fs / 2, view.neutronStars ? (view.contact ?? 2000) * 1.25 : model.fRing * 1.35);
  const spec = useMemo(() => {
    const window = Math.max(128, Math.round(fs / 16 / 64) * 64);
    const from = Math.max(0, Math.floor((tMin - tStart) * fs) - window);
    return { s: spectrogram(model.h.subarray(from), fs, window, window / 8, fMax), offset: tStart + from / fs };
  }, [model, fs, tMin, tStart, fMax]);
  const dataSpec = useMemo(() => spectrogram(GW150914.H1, GW150914.sampleRate, 128, 8, 400), []);
  const track = useMemo(() => {
    const out: { t: number; f: number }[] = [];
    const step = Math.max(1, Math.floor(model.f.length / 600));
    for (let i = 0; i < model.f.length; i += step) out.push({ t: model.t0 + i / fs, f: model.f[i] });
    return out;
  }, [model, fs]);
  const lo = useMemo(() => leadingOrderTrack(model), [model]);

  // GW150914's data, with the model (at GW150914's distance) fitted to each detector
  const fits = useMemo(() => {
    if (Math.max(m1, m2) <= NEUTRON_STAR_MAX) return null;
    const c = modelChirp(m1, m2);
    return { H1: fitToData(c, 'H1'), L1: fitToData(c, 'L1') };
  }, [m1, m2]);
  const livingston = useMemo(() => GW150914.L1.map((v) => -v), []);

  const mcSrc = model.mcSeen / (1 + preset.z) / M_SUN;
  const mcSeen = model.mcSeen / M_SUN;
  const inBand = -tStart;
  let cycles = 0;
  for (let i = 1; i < model.h.length && model.t0 + i / fs < 0; i++) if (model.h[i - 1] < 0 && model.h[i] >= 0) cycles++;

  const playModel = () => {
    const audio = chirpView(m1, m2, preset.mpc, preset.z, 8, Math.max(8192, fs));
    const samples = octave ? octaveUp(audio.model.h) : audio.model.h;
    setAudioT0(audio.model.t0);
    sound.play('model', samples, audio.model.sampleRate, volume);
  };
  const playData = () => {
    const samples = octave ? octaveUp(GW150914.H1) : GW150914.H1;
    sound.play('data', samples, GW150914.sampleRate, volume);
  };
  // The playhead, on the model's time axis or the data's
  const modelHead = sound.playing === 'model' ? audioT0 + sound.elapsed : null;
  const dataHead = sound.playing === 'data' ? GW150914.start + sound.elapsed : null;

  const massText = `${fmt(m1)} and ${fmt(m2)} M☉`;
  const mcText = (m: number) => (m < 10 ? m.toFixed(2) : m.toFixed(1));
  const caption = `${massText} at the source, ${preset.mpc.toLocaleString('en-GB')} Mpc away. The chirp mass is ${mcText(mcSrc)} M☉ (${mcText(mcSeen)} M☉ as the waves reach us, stretched ${Math.round(preset.z * 100)}% on the way). ${
    view.neutronStars
      ? `They are light enough to be neutron stars: the chirp ${inBand >= 15.9 ? 'shown is its last 16 s' : `lasts ${inBand.toFixed(1)} s from ${Math.round(model.fLow)} Hz`}, ${cycles.toLocaleString('en-GB')} cycles, and the stars touch at about ${Math.round(view.contact ?? 0).toLocaleString('en-GB')} Hz; what happens then depends on what they are made of.`
      : `From ${Math.round(model.fLow)} Hz the chirp lasts ${inBand.toFixed(2)} s and ${cycles} cycles, peaks near ${Math.round(model.fJoin)} Hz and rings at ${Math.round(model.fRing)} Hz, fading in ${(model.tau * 1000).toFixed(1)} ms. The black hole left has ${(model.finalMass / M_SUN).toFixed(1)} M☉, spinning at ${model.finalSpin.toFixed(2)} of the most it could; ${view.radiated.toFixed(1)} M☉ went into waves.`
  }${fits ? ` Fitted to GW150914’s data, its overlap with them is ${fits.H1.match.overlap.toFixed(2)} at Hanford and ${fits.L1.match.overlap.toFixed(2)} at Livingston.` : ''}`;

  return (
    <Figure
      number={number}
      title="Make a chirp, and hear it"
      description="Pick two masses and see the gravitational waves they make as they spiral together: the strain rising in pitch and loudness, the merger, and the ringing of the black hole left, with a spectrogram and the frequency’s sweep. Play it through your speakers, an octave up if you like. Beside it, GW150914 as LIGO’s two detectors recorded it in 2015, with the model fitted to the data."
      height={1500}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the model’s frequency, over the spectrogram', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="5 3" /> },
        { label: 'the playhead, while sound plays', symbol: <line x1="0" y1="-9" x2="0" y2="9" stroke="var(--text)" strokeWidth="2" /> },
      ]}
      simplified={
        <p>
          The inspiral is relativity’s to 3.5 post-Newtonian order (TaylorT4), for black holes that don’t spin. The merger is a sketch: the
          frequency is joined smoothly to the ringing of the black hole left (its mass and spin from fits to numerical relativity, its ringing from
          Berti, Cardoso and Will’s fits), and the amplitude carried over into the ringing’s decay. Real templates are calibrated to supercomputer
          simulations through the merger, and include spins. Because the merger here is only sketched, the chirp mass that fits GW150914 best is
          about a tenth lower than LIGO’s. The strain is for a pair seen face-on from straight overhead; GW150914 was seen at an angle, so LIGO
          recorded about 40% of that. Two neutron stars are followed until they touch. The sound is the strain itself, played as it would sound;
          “an octave up” doubles every frequency without changing the timing. GW150914’s data are whitened (each frequency divided by the
          detector’s noise there) and kept between 35 and 350 Hz, in units of the noise’s spread.
        </p>
      }
    >
      <div className={styles.presets} role="group" aria-label="Start from">
        {CHIRP_PRESETS.map((p) => (
          <button key={p.id} type="button" className={styles.toggle} aria-pressed={preset.id === p.id && m1 === p.m1 && m2 === p.m2} onClick={() => choose(p)}>
            {p.name}
          </button>
        ))}
      </div>
      <div className={styles.controls}>
        <Slider label="First mass" value={m1} min={1} max={150} log step={0.005} format={(v) => `${fmt(v)} M☉`} onChange={(v) => setM1(Number(v.toPrecision(3)))} />
        <Slider label="Second mass" value={m2} min={1} max={150} log step={0.005} format={(v) => `${fmt(v)} M☉`} onChange={(v) => setM2(Number(v.toPrecision(3)))} />
      </div>
      <div className={figureStyles.toolbar}>
        <button type="button" className={figureStyles.toolButton} onClick={sound.playing === 'model' ? sound.stop : playModel} disabled={!sound.supported} aria-pressed={sound.playing === 'model'}>
          {sound.playing === 'model' ? 'Stop' : 'Play the chirp'}
        </button>
        <button type="button" className={figureStyles.toolButton} onClick={sound.playing === 'data' ? sound.stop : playData} disabled={!sound.supported} aria-pressed={sound.playing === 'data'}>
          {sound.playing === 'data' ? 'Stop' : 'Play GW150914 (Hanford)'}
        </button>
        <label className={figureStyles.checkbox}>
          <input type="checkbox" checked={octave} onChange={(e) => setOctave(e.target.checked)} />
          An octave up, for small speakers
        </label>
      </div>
      <div className={styles.controls}>
        <Slider label="Volume" value={volume} min={0.05} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setVolume(Math.round(v * 20) / 20)} />
      </div>
      {!sound.supported && <p className={styles.hint}>This browser can’t play sound here; the playhead and the pictures tell the same story.</p>}

      <p className={styles.panelTitle}>The strain, {view.neutronStars ? 'until the stars touch' : 'through the merger'}</p>
      <WaveformPlot
        series={[{ name: 'strain', color: 'var(--series-1)', values: model.h, t0: model.t0, sampleRate: fs, scale: 1e21 }]}
        tMin={tMin}
        tMax={tMax}
        yMax={model.peak * 1e21 * 1.1}
        xLabel="Time from the peak (s)"
        yLabel="Strain (× 10⁻²¹)"
        markers={[...(modelHead !== null ? [{ t: modelHead, color: 'var(--text)' }] : []), { t: 0, label: view.neutronStars ? 'they touch' : 'peak', color: 'var(--text-muted)', dashed: true }]}
        height={220}
        ariaLabel={`The model’s strain against time, rising in frequency and amplitude to ${view.neutronStars ? 'the moment the stars touch' : 'the peak, then ringing down'}. ${caption}`}
      />

      <div className={figureStyles.toolbar} style={{ marginTop: 10 }}>
        <span className={figureStyles.segmented} role="group" aria-label="Spectrogram of">
          <button type="button" aria-pressed={show === 'model'} onClick={() => setShow('model')}>
            The model
          </button>
          <button type="button" aria-pressed={show === 'data'} onClick={() => setShow('data')}>
            GW150914 at Hanford
          </button>
        </span>
      </div>
      {show === 'model' ? (
        <SpectrogramView
          spec={spec.s}
          timeOffset={spec.offset}
          tMin={tMin}
          tMax={tMax}
          fMax={fMax}
          tracks={[
            { points: lo.filter((p) => p.t >= tMin), color: '#f8fafc', dash: '2 3' },
            { points: track.filter((p) => p.t >= tMin), color: '#7dd3fc', dash: '6 3' },
          ]}
          playhead={modelHead}
          height={230}
          ariaLabel={`Spectrogram of the model: the frequency sweeps up from ${Math.round(model.fLow)} Hz to ${view.neutronStars ? `about ${Math.round(view.contact ?? 0)} Hz` : `${Math.round(model.fRing)} Hz`}.`}
        />
      ) : (
        <SpectrogramView
          spec={dataSpec}
          timeOffset={GW150914.start}
          tMin={-0.5}
          tMax={0.15}
          fMax={400}
          range={14}
          tracks={fits ? [{ points: track.filter((p) => p.t >= -0.5).map((p) => ({ t: p.t + fits.H1.peakAt, f: p.f })), color: '#7dd3fc', dash: '6 3' }] : []}
          playhead={dataHead}
          height={230}
          ariaLabel="Spectrogram of Hanford’s whitened data round GW150914: a faint arc sweeping up from about 35 Hz to 250 Hz in the last fifth of a second, above the noise."
        />
      )}
      <p className={styles.hint}>
        {show === 'model'
          ? 'Dashed blue: the model’s frequency. Dotted white: the leading-order sweep for the same chirp mass, started together; relativity’s corrections slow the early cycles a little and quicken the last ones.'
          : 'Dashed blue: the model’s frequency, lined up with the data as the fit below lines it up.'}
      </p>

      <p className={styles.panelTitle}>GW150914 as LIGO recorded it, whitened, with the model fitted</p>
      <WaveformPlot
        series={[
          { name: 'Hanford', color: 'var(--text-muted)', values: GW150914.H1, t0: GW150914.start, sampleRate: GW150914.sampleRate, width: 1.1 },
          { name: 'Livingston, shifted 6.9 ms and flipped', color: 'var(--series-3)', values: livingston, t0: GW150914.start + GW150914.livingstonLead, sampleRate: GW150914.sampleRate, width: 1.1, opacity: 0.8 },
          ...(fits ? [{ name: 'the model, fitted to Hanford', color: 'var(--series-2)', values: fits.H1.fitted, t0: GW150914.start, sampleRate: GW150914.sampleRate, width: 1.8 }] : []),
        ]}
        tMin={-0.3}
        tMax={0.08}
        yMax={8}
        xLabel="Time from 09:50:45.4 UTC, 14 September 2015 (s)"
        yLabel="Whitened strain (noise spreads)"
        formatY={(y) => String(y).replace('-', '−')}
        markers={dataHead !== null ? [{ t: dataHead, color: 'var(--text)' }] : []}
        height={240}
        ariaLabel={`GW150914’s whitened strain at Hanford and Livingston: noise, then a chirp rising out of it in the last fifth of a second.${fits ? ` The model, fitted, has an overlap of ${fits.H1.match.overlap.toFixed(2)} with Hanford’s data.` : ''}`}
      />
      <p className={styles.hint}>
        {fits
          ? `How well the model fits (its overlap with the data from 0.35 s before to 0.08 s after, 1 for a perfect match): Hanford ${fits.H1.match.overlap.toFixed(2)}, Livingston ${fits.L1.match.overlap.toFixed(2)}. Noise keeps any model well below 1.`
          : 'Two neutron stars are far too light to fit GW150914: choose black holes to compare.'}
      </p>
      <Caption>{caption}</Caption>
    </Figure>
  );
}

function fmt(m: number): string {
  return m < 10 ? m.toFixed(2) : m.toFixed(1);
}
