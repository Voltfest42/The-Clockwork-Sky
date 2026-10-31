import { chapterNumbered } from '../../site/course';
import { Term } from '../../site/content/Term';
import { useHydrated } from '../../site/hydration';
import { href } from '../../site/router';
import contentStyles from '../../site/content/content.module.css';
import pageStyles from '../../site/pages/pages.module.css';
import { OrreryLab } from './OrreryLab';
import { PRESETS } from './presets';
import styles from './Orrery.module.css';

/**
 * The Orrery's page: what it is, the lab itself (live once the page has
 * hydrated; the prerendered page describes it), and how it works.
 */

const chapter = (n: number) => {
  const c = chapterNumbered(n);
  return c ? <a href={href(c.slug)}>Chapter {n}</a> : <>Chapter {n}</>;
};

export default function OrreryPage() {
  const hydrated = useHydrated();
  return (
    <article className={pageStyles.page}>
      <header className={pageStyles.chapterHeader}>
        <p className={pageStyles.kicker}>Lab · Orbital mechanics</p>
        <h1>The Orrery</h1>
        <p className={pageStyles.lede}>Build any planetary system, from the Solar System to three-body chaos, and watch gravity run it.</p>
      </header>
      <div className={contentStyles.prose}>
        <p>
          An orrery is a clockwork model of the Solar System, with the planets on arms turned by gears. This one has no gears: every body pulls on
          every other by Newton’s law of gravity, and the computer works out where they all go next, step by step, as in {chapter(7)}. Even three
          bodies have no formula for their motion (the <Term id="three-body-problem">three-body problem</Term>), so stepping is the only way.
          Start from a ready-made system, or change one: add a planet, make Jupiter heavier, nudge a star. Then run it and see what gravity does.
        </p>
      </div>

      {hydrated ? (
        <OrreryLab />
      ) : (
        <div className={`${styles.lab} ${styles.placeholder}`}>
          <p>
            The Orrery runs in your browser once the page has loaded. It starts with the Sun, the planets and Pluto where JPL puts them on 1 January
            2026, and has {PRESETS.length} systems to choose from: {PRESETS.map((p) => p.name).join(', ')}. You can add bodies on any orbit, change
            masses and velocities, follow any body, turn with a pair of bodies to see their Lagrange points, and speed time up to thousands of years a
            second.
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
          On <em>Automatic</em>, the Orrery starts with Wisdom–Holman for a planetary system and IAS15 otherwise, and switches to IAS15 for good the
          first time two bodies come within three <Term id="hill-sphere">Hill radii</Term> of each other: the distance inside which the smaller
          body’s pull rivals the star’s.
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
        <h3>What’s simplified</h3>
        <ul>
          <li>Bodies are points: no tides, no flattened planets, no spin.</li>
          <li>
            Newton’s gravity, without Einstein’s correction. Over a century this puts Mercury about 20″ (a two-hundredth of a degree) off JPL’s
            position; everything else is closer than 10″.
          </li>
          <li>Collisions merge bodies completely; real ones can shatter them or splash off a moon.</li>
          <li>Planets with moons are single bodies in the Solar System preset, carrying their moons’ mass.</li>
          <li>Bodies are drawn far bigger than they are, so you can see them.</li>
        </ul>
        <h3>Where the numbers come from</h3>
        <p>
          The Solar System, Earth and the Moon: JPL Horizons (DE441), 1 January 2026, with DE440’s masses. Jupiter’s moons: JPL Horizons (JUP365).
          Kepler-16: Doyle and others (2011). TRAPPIST-1: Agol and others (2021). The figure-eight: Chenciner and Montgomery (2000), with Simó’s
          numbers. The Pythagorean problem: Burrau (1913), solved by Szebehely and Peters (1967). Tests check the engine against Kepler’s exact
          orbits, against JPL’s positions a century on, and against the figure-eight’s return; see the <a href={href('about')}>About page</a>.
        </p>
        <p>
          It has a sequel: Part III’s version adds star clusters, colliding galaxies, the correction for relativity, and the Sun’s old age. For now,{' '}
          {chapter(8)} has the tour of the real thing, and its sibling lab, <a href={href('star-forge')}>the Star Forge</a>, makes stars.
        </p>
      </div>
    </article>
  );
}
