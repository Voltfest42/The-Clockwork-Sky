import { chapterNumbered } from '../../site/course';
import { Term } from '../../site/content/Term';
import { useHydrated } from '../../site/hydration';
import { href } from '../../site/router';
import contentStyles from '../../site/content/content.module.css';
import pageStyles from '../../site/pages/pages.module.css';
import { CLUSTER_PRESETS, GALAXY_PRESETS } from './manyPresets';
import { OrreryModes } from './OrreryModes';
import { PRESETS } from './presets';
import { PRESET_INFO } from '../../figures/collisions';
import styles from './Orrery.module.css';

/**
 * The Orrery's page: what it is, the lab itself (live once the page has
 * hydrated; the prerendered page describes it), and how it works.
 */

const chapter = (n: number) => {
  const c = chapterNumbered(n);
  return c ? <a href={href(c.slug)}>Chapter {n}</a> : <>Chapter {n}</>;
};

const list = (names: readonly string[]) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]);

export default function OrreryPage() {
  const hydrated = useHydrated();
  return (
    <article className={pageStyles.page}>
      <header className={pageStyles.chapterHeader}>
        <p className={pageStyles.kicker}>Lab · Orbital mechanics</p>
        <h1>The Orrery</h1>
        <p className={pageStyles.lede}>
          Build any planetary system, from the Solar System to three-body chaos, run a star cluster or a collision of galaxies, and watch gravity
          work. Switch on relativity, or let the Sun grow old.
        </p>
      </header>
      <div className={contentStyles.prose}>
        <p>
          An orrery is a clockwork model of the Solar System, with the planets on arms turned by gears. This one has no gears: every body pulls on
          every other by Newton’s law of gravity, and the computer works out where they all go next, step by step, as in {chapter(7)}. Even three
          bodies have no formula for their motion (the <Term id="three-body-problem">three-body problem</Term>), so stepping is the only way.
          Start from a ready-made system, or change one: add a planet, make Jupiter heavier, nudge a star. Then run it and see what gravity does.
          It has three modes: planets and stars; a star cluster of up to 2,000 stars, each pulling every other; and two galaxies of up to 100,000
          stars meeting.
        </p>
      </div>

      {hydrated ? (
        <OrreryModes />
      ) : (
        <div className={`${styles.lab} ${styles.placeholder}`}>
          <p>
            The Orrery runs in your browser once the page has loaded. It starts with the Sun, the planets and Pluto where JPL puts them on 1 January
            2026, and has {PRESETS.length} systems to choose from: {list(PRESETS.map((p) => p.name))}. You can add bodies on any orbit, change
            masses and velocities, follow any body, turn with a pair of bodies to see their Lagrange points, switch relativity on, and speed time up
            to thousands of years a second. Its cluster mode has {list(CLUSTER_PRESETS.map((p) => p.name.toLowerCase()))}; its galaxy mode has{' '}
            {list(GALAXY_PRESETS.map((p) => PRESET_INFO[p].label))}.
          </p>
          <noscript>
            <p>The Orrery is interactive and needs JavaScript.</p>
          </noscript>
        </div>
      )}

      <div className={contentStyles.prose}>
        <h2 id="how-it-works">How it works</h2>
        <p>
          Every body is a point with a mass, a position and a velocity. Each step, the engine adds up every pull on every body, nudges the
          velocities, and moves the bodies along. That is all gravity needs. The art is in how the steps are taken, and the Orrery has three ways:
        </p>
        <ul>
          <li>
            <strong>Wisdom–Holman</strong> (1991), for planetary systems with one heavy star. Leapfrog moves each planet in a straight line between
            kicks; Wisdom–Holman moves it along the exact ellipse it would follow if the star were alone, as in {chapter(6)}, and kicks it only with
            the small pulls of the other planets. Those pulls are a thousand times weaker than the star’s, so the error is far smaller, and the
            Solar System can run for millions of years in big steps. The Orrery’s version follows Rein and Tamayo’s WHFast (2015).
          </li>
          <li>
            <strong>IAS15</strong> (Rein and Spiegel, 2015), for everything else: two stars, three-body chaos, moons, and any close pass. It fits a
            smooth curve through the pulls at eight moments inside each step, then sizes the next step so the error stays below what the computer
            can even represent. Near a close pass its steps shrink to seconds; far apart, they grow to days or months.
          </li>
          <li>
            <strong>Leapfrog</strong>, the method of {chapter(7)}, for comparison.
          </li>
        </ul>
        <p>
          On <em>Automatic</em>, the Orrery starts with Wisdom–Holman for a planetary system and IAS15 otherwise, and switches to IAS15 the first
          time two bodies come within three <Term id="hill-sphere">Hill radii</Term> of each other: the distance inside which the smaller body’s
          pull rivals the star’s. Once the pass is over and every pair is well clear again, it switches back to Wisdom–Holman, as the hybrid
          integrators astronomers use (MERCURIUS, for one) do.
        </p>
        <h3>The energy error</h3>
        <p>
          Real gravity never changes a system’s total energy or its total spin (its angular momentum). A computed orbit does, a little, because
          each step is an approximation. So the drift in those two totals since the start is the simulation’s own error, and the Orrery shows it
          as it runs. Below 10⁻⁸ means the picture is as good as exact; Wisdom–Holman on the Solar System stays near 10⁻¹⁰ for a century. Switch
          the same system to leapfrog and the error grows a few hundred times, even with steps twelve times shorter.
        </p>
        <h3>Events</h3>
        <p>
          The log records close encounters, collisions and escapes. Bodies that touch merge into one, keeping their total mass and momentum. A body
          is called escaped once it is moving away faster than all the others’ pull can ever bring back. A body that starts going round something
          other than the heaviest body has been caught; when it stops, it has broken free.
        </p>

        <h3 id="relativity">Relativity</h3>
        <p>
          Newton’s orbits close on themselves; in Einstein’s gravity each orbit turns a little every lap (the{' '}
          <Term id="orbital-precession">precession of an orbit</Term>), by 6πGM / (c²a(1 − e²)) ({chapter(27)}).
          With <em>Relativity</em> on, the Orrery adds that turning about the heaviest body, as an extra pull that grows as the cube of the
          closeness (Nobili and Roxburgh’s form of the first correction to Newton, 1986, which turns every orbit by just relativity’s amount and
          keeps the energy). Pick a body to watch its periapsis, the point of closest approach, turn as the run goes. In the Solar System,
          Mercury’s turns about 532″ a century under Newton, pulled round by the other planets, and about 575″ with relativity: the extra 43″ that
          puzzled astronomers from Le Verrier in 1859 until Einstein explained it in 1915. Round Sagittarius A*, the Milky Way’s black hole, the
          star S2’s orbit turns 12′ a lap ({chapter(30)}); set relativity to ×100 to see the turning grow into a rosette.
        </p>

        <h3 id="the-suns-death">The Sun’s death</h3>
        <p>
          In this system the Sun follows its own future, as the <a href={href('star-forge')}>Star Forge</a> works it out with SSE (Hurley, Pols and
          Tout 2000; {chapter(17)}): in about 7.7 billion years it swells into a red giant nearly 0.9 AU across in radius, loses a quarter of its
          mass in its wind, swells again on the asymptotic giant branch, and shrinks to a white dwarf of about half its mass. Two things happen to
          the planets. As the Sun loses mass slowly its pull weakens and every orbit widens, keeping the orbit’s size times the Sun’s mass the same.
          And each planet raises a bulge on the giant’s turbulent envelope, which lags behind it and pulls it back: Zahn’s tide, here as Mustill and
          Villaver (2012) wrote it, which grows as the eighth power of the Sun’s size over the orbit’s. With SSE’s winds and their tide, Mercury and
          Venus are swallowed at the red giant’s tip and Earth escapes, but not by much: weaken the winds or strengthen the tide and it doesn’t.
          Detailed models disagree for just this reason, which is why the question is still open.
        </p>
        <p>
          The real Sun changes over millions of years, far too slowly to watch with the planets going round at their own pace, so in the run the
          Sun’s clock goes faster than the planets’. That is safe as long as each change is still slow beside the orbits it affects: the Orrery
          paces it so that the Sun’s mass changes by under a five-hundredth of itself in one of the outermost planet’s laps, and the tide moves an
          orbit by as little in one of its laps. The orbits then respond just as they would to the real, slower change. (While the Sun swells
          towards the planets its size is paced the same way, only so that the swelling gets its share of the run.) The charts beside the run
          follow the same model by the averaged equations, and the two agree to a few parts in a thousand.
        </p>

        <h3 id="star-clusters">Star clusters</h3>
        <p>
          The cluster mode runs {chapter(30)}’s engine: 100 to 2,000 stars, each pulling every other, stepped by Aarseth’s fourth-order Hermite
          scheme, with each star on its own step (block steps). A cluster can start as Plummer’s sphere (1911) or a{' '}
          <Term id="king-model">King model</Term> (1966), whose stars
          move as in a gas with the fastest left out, so it has an edge; with equal masses or Kroupa’s mix; in the Galaxy’s tide at 4, 8.2 or 16
          kpc from its centre, or alone. The charts follow the radii holding 2%, 10%, 50% and 90% of the mass, measured from the dense core, as the
          core shrinks and the outskirts swell (<Term id="core-collapse-cluster">core collapse</Term>); the heaviest stars’ radius, as they
          sink; the mass still bound, or the virial ratio, which is ½ for a cluster in balance; and the energy error.
        </p>

        <h3 id="colliding-galaxies">Colliding galaxies</h3>
        <p>
          The galaxy mode runs {chapter(31)}’s engine: Toomre’s method, in which each galaxy is a ball of mass and its stars are test particles
          that feel both galaxies but pull on nothing, with Chandrasekhar’s dynamical friction to let bound galaxies sink together. It has Figure
          31.1’s encounters and a sketch of the Milky Way meeting Andromeda, at their measured masses; whether and when they really meet is the
          question of Figure 31.2.
        </p>

        <h3>What’s simplified</h3>
        <ul>
          <li>Bodies are points: no tides (except the Sun’s, in its death), no flattened planets, no spin.</li>
          <li>
            Newton’s gravity unless relativity is switched on, and then only its turning of orbits about the heaviest body. With it off, a century
            puts Mercury about 20″ (a two-hundredth of a degree) off JPL’s position; everything else is closer than 10″.
          </li>
          <li>Collisions merge bodies completely; real ones can shatter them or splash off a moon.</li>
          <li>Planets with moons are single bodies in the Solar System preset, carrying their moons’ mass.</li>
          <li>Bodies are drawn far bigger than they are, so you can see them; the dying Sun is drawn at its true size.</li>
          <li>Clusters are softened, have no pairs of stars at the start, and their stars don’t age; galaxies are rigid and have no gas.</li>
        </ul>
        <h3>Where the numbers come from</h3>
        <p>
          The Solar System, Earth and the Moon: JPL Horizons (DE441), 1 January 2026, with DE440’s masses. Jupiter’s moons: JPL Horizons (JUP365).
          Kepler-16: Doyle and others (2011). TRAPPIST-1: Agol and others (2021). The figure-eight: Chenciner and Montgomery (2000), with Simó’s
          numbers. The Pythagorean problem: Burrau (1913), solved by Szebehely and Peters (1967). S2 and Sagittarius A*: the GRAVITY collaboration
          (2020). The Sun’s future: SSE (Hurley, Pols and Tout 2000) and the tide of Mustill and Villaver (2012). Clusters: Plummer (1911), King
          (1966), Kroupa (2001), Makino and Aarseth (1992). Galaxies: Toomre and Toomre (1972), Lynds and Toomre (1976), Sawala and others (2025).
          Tests check the engine against Kepler’s exact orbits, JPL’s positions a century on, the figure-eight’s return, Einstein’s formula for
          Mercury and S2, King’s concentrations, and the averaged equations for the Sun’s death; see the <a href={href('about')}>About page</a>.
        </p>
        <p>
          Its sibling lab, <a href={href('star-forge')}>the Star Forge</a>, makes stars and pairs of stars; {chapter(8)} has the tour of the real Solar
          System.
        </p>
      </div>
    </article>
  );
}
