import { formatScientific } from '../../core/math/scientific';
import type { ClusterConfig, ClusterInfo, ClusterSample } from '../../core/nbody/clusterHost';
import { formatMyr, formatPc } from '../../figures/crowds';

/** Words for the Orrery's cluster mode (ClusterMode.tsx). */

/** The cluster's state in words, for the caption and the 3D view's description. */
export function clusterModeCaption(config: ClusterConfig, info: ClusterInfo, sample: ClusterSample, ended: 'dissolved' | 'limit' | null): string {
  const masses = config.masses === 'kroupa' ? 'with Kroupa’s mix of masses from 0.08 to 3 M☉' : 'all of 0.5 M☉';
  const shape = config.model === 'king' ? `a King model of depth W₀ = ${config.w0 ?? 6}` : 'a Plummer sphere';
  const place = info.tide ? `${config.orbit} kpc from the Galaxy’s centre` : 'alone in space, with no tide';
  const start = `${config.n.toLocaleString('en-GB')} stars ${masses} (${Math.round(info.totalMass)} M☉ in all) in ${shape}, ${place}, with half their mass within ${formatPc(info.halfMass)} at the start: a relaxation time of ${formatMyr(info.relaxation)}.`;
  const trh = sample.t / info.relaxation;
  if (sample.t === 0) return info.tide ? `${start} The Galaxy’s tide sets a Jacobi radius of ${formatPc(info.jacobi)}.` : start;
  const when = `After ${formatMyr(sample.t)} (${trh.toFixed(1)} relaxation times)`;
  if (ended === 'dissolved') return `${start} ${when}, the cluster has dissolved: almost every star is in the tails.`;
  const core = ` The innermost 2% of the mass is within ${formatPc(sample.core[0])} of the dense core, 90% within ${formatPc(sample.core[3])}.`;
  const kept = info.tide ? ` ${Math.round(sample.bound * 100)}% of the mass is within the Jacobi radius of ${formatPc(sample.jacobi)}.` : ` the virial ratio is ${sample.virial.toFixed(2)} (½ in balance).`;
  const heavy = config.masses === 'kroupa' && sample.boundCount >= 50 ? ` The heaviest tenth hold half their mass within ${formatPc(sample.heavy)}, the cluster within ${formatPc(sample.lagrangian[1])}.` : '';
  const stop = ended === 'limit' ? ' The run stops here.' : '';
  return `${start} ${when}:${kept}${core}${heavy} Energy error: ${formatScientific(Math.abs(sample.energyError), 1)}.${stop}`;
}

