import { chapterNumbered } from '../../site/course';
import { Term } from '../../site/content/Term';
import { useHydrated } from '../../site/hydration';
import { href } from '../../site/router';
import contentStyles from '../../site/content/content.module.css';
import pageStyles from '../../site/pages/pages.module.css';
import { PRESETS } from './presets';
import { StarForgeLab } from './StarForgeLab';
import styles from './StarForge.module.css';

/**
 * The Star Forge's page: what it is, the lab itself (live once the page has
 * hydrated; the prerendered page describes it), and how the engine works and
 * where it stops.
 */

const chapter = (n: number) => {
  const c = chapterNumbered(n);
  return c ? <a href={href(c.slug)}>Chapter {n}</a> : <>Chapter {n}</>;
};

export default function StarForgePage() {
  const hydrated = useHydrated();
  return (
    <article className={pageStyles.page}>
      <header className={pageStyles.chapterHeader}>
        <p className={pageStyles.kicker}>Lab · Stellar evolution</p>
        <h1>The Star Forge</h1>
        <p className={pageStyles.lede}>Set a star’s mass and make-up, and follow its whole life, from the main sequence to what it leaves behind.</p>
      </header>
      <div className={contentStyles.prose}>
        <p>
          A character creator for stars. Choose how much mass a star is born with, how much of it is metals (anything heavier than helium), and how
          strong its winds are, and the Forge works out its whole life at once: how long it stays on the main sequence, how large and bright it
          swells, how much of itself it blows away, and whether it ends as a white dwarf, a neutron star, a black hole, or nothing at all. Then
          slide through time and watch. It puts {chapter(16)}, {chapter(17)} and {chapter(18)} in your hands.
        </p>
      </div>

      {hydrated ? (
        <StarForgeLab />
      ) : (
        <div className={`${styles.lab} ${styles.placeholder}`}>
          <p>
            The Star Forge runs in your browser once the page has loaded. It starts with the Sun, and has {PRESETS.length} ready-made stars and
            clusters: {PRESETS.map((p) => p.name).join(', ')}. You can forge any star from 0.01 to 300 Suns, with metallicities from almost none to
            more than the Sun’s and winds from none to three times their usual strength; compare up to four stars; and lay a line of stars of one
            age over six real clusters measured by Gaia. Each star is shown on the HR diagram, drawn to scale beside the Sun, cut open, charted
            through its life and placed on a map of where the engine can be trusted.
          </p>
          <noscript>
            <p>The Star Forge is interactive and needs JavaScript.</p>
          </noscript>
        </div>
      )}

      <div className={contentStyles.prose}>
        <h2 id="how-it-works">How it works</h2>
        <p>
          A research code such as MESA builds a star from thousands of layers and solves the equations of its structure, layer by layer, step by
          step, with large tables of how gas behaves. One star’s life takes minutes to hours, and the extreme stars this lab makes easy need an
          expert’s hand. That can’t run in a browser.
        </p>
        <p>
          So the Forge does what astronomers do when they need millions of stars. Its engine is <strong>SSE</strong>, the Single Star Evolution
          formulas of Jarrod Hurley, Onno Pols and Christopher Tout (2000): curves fitted to a grid of detailed models, giving a star’s luminosity,
          radius and core mass at every stage as a function of its mass, age and metallicity. It is the stellar version of baked lighting in a
          game: the expensive calculation was done once, in advance, and stored as curves that are quick to read. A whole life takes a few
          thousandths of a second. SSE, and its partner for pairs of stars, still sit at the heart of the codes that predict which stars become
          the black holes that gravitational-wave detectors hear merging.
        </p>
        <p>
          The Forge runs a line-by-line translation of Hurley’s own code into the language of this site, with its standard settings. Tests run 168
          stars, from 0.1 to 150 Suns at seven metallicities, through both and check that every step agrees: the same stages at the same times,
          with masses, luminosities and radii equal to a hundred-thousandth.
        </p>
        <h3>Metals</h3>
        <p>
          A star’s <Term id="metallicity">metallicity</Term>, Z, is the share of its mass that isn’t hydrogen or helium. SSE calls the Sun’s
          Z = 0.02, the value of the 1990s, when its models were made; measurements today give 0.014 (Asplund and others, 2021). The formulas were
          fitted on SSE’s scale, so the Forge keeps it: Z = 0.02 means “like the Sun”. Metals make a star’s gas more opaque and its winds
          stronger, so a metal-poor star is smaller, hotter and keeps more of its mass.
        </p>
        <h3>Winds</h3>
        <p>
          Stars lose mass in <Term id="stellar-wind">winds</Term> all their lives, and heavy stars lose most of it. SSE combines several recipes: gentle winds for red giants,
          stronger ones on the asymptotic giant branch, winds driven by the light of luminous stars, a fierce wind for stars stripped down to
          helium (<Term id="wolf-rayet-star">Wolf–Rayet stars</Term>), and outbursts for stars brighter than any stable star can be. The winds slider multiplies all of them, from none to three times.
          Measured winds of hot stars are now thought to be weaker than SSE’s, so turning them down is a fair test of what is uncertain. With no
          wind at all, SSE’s formulas for stars heavier than about 90 Suns stall while the star burns helium, and the Forge says so.
        </p>
        <h3>Beyond SSE</h3>
        <ul>
          <li>
            <strong>Brown dwarfs</strong>, below 0.075 Suns, never settle into fusing hydrogen. They follow the published cooling tracks of
            Baraffe and others (2015), as in {chapter(16)}, carried on to ten billion years by Burrows and others’ (2001) power laws.
          </li>
          <li>
            <strong>
              <Term id="pair-instability">Pair instability</Term>.
            </strong>{' '}
            In a helium core heavier than about 35 Suns, light turns into pairs of electrons and positrons, the
            core loses pressure and shrinks, and its oxygen may burn all at once. Cores of 35–65 Suns pulse and throw off mass; 65–135 Suns, the
            whole star is blown apart; heavier still, it collapses whole. The Forge applies these ranges (Heger and Woosley, 2002; Woosley, 2017)
            to the helium core SSE gives at the end.
          </li>
          <li>
            <strong>Above 100 Suns</strong>, SSE’s formulas are held at their edge, and its winds strip even metal-poor stars, so its helium cores
            never pass about 45 Suns. For metal-poor stars there, the Forge also says what models of stars that keep their mass predict, from
            Heger and Woosley’s rule that the helium core is about 13/24 of the mass above 20 Suns.
          </li>
        </ul>
        <h3>Clusters</h3>
        <p>
          In <em>A cluster</em>, the engine runs about 130 stars of different masses to the same age and lays them on the HR diagram as one line,
          an <Term id="isochrone">isochrone</Term>, over the stars of a real cluster measured by Gaia, as in {chapter(17)}. Slide the age until the
          line turns off the main sequence where the cluster’s stars do, and you have aged the cluster.
        </p>
        <h3>The calibration map</h3>
        <p>
          Every answer the Forge gives comes from a model, and models are only as good as what they were tested on. The map under the lab shows
          where SSE’s formulas were fitted to detailed models (0.5–50 Suns, Z from 0.0001 to 0.03), where they are stretched beyond them (down to
          0.075 Suns, and up to 100), where other models take over (brown dwarfs; pair instability), and where nothing here is reliable (above 150
          Suns, or with fewer metals than any model in the grid). The edges of that map are where the research is.
        </p>
        <h3>What’s simplified</h3>
        <ul>
          <li>Stars are single, don’t spin, and have no magnetic fields. Most heavy stars have a companion close enough to strip or merge with them.</li>
          <li>
            A star’s life starts on the zero-age main sequence, when it first burns hydrogen steadily; its birth is in {chapter(16)}. SSE’s
            quick crossing from giant to white dwarf, when the shed layers glow as a planetary nebula, is drawn as a dashed jump.
          </li>
          <li>Colours and temperatures are for the star’s surface as SSE gives it; a star wrapped in its own dust looks redder and dimmer.</li>
          <li>Neutron stars’ and black holes’ masses follow Belczynski and others’ (2002) recipe, as SSE’s code does; they are uncertain by tens of per cent.</li>
          <li>
            The <Term id="convection">convective</Term> cores of heavy main-sequence stars, and anything the star does on a timescale shorter than
            SSE’s steps, aren’t shown.
          </li>
        </ul>
        <h3>Where the numbers come from</h3>
        <p>
          The engine: Hurley, Pols and Tout (2000), from Hurley’s code as distributed with AMUSE. Brown dwarfs: Baraffe, Homeier, Allard and
          Chabrier (2015) and Burrows, Hubbard, Lunine and Liebert (2001). Pair instability: Heger and Woosley (2002), Woosley (2017), Belczynski and
          others (2016), Farmer and others (2019). The background stars and the clusters: ESA’s Gaia mission, third data release. The tests that
          check the engine are listed on the <a href={href('about')}>About page</a>.
        </p>
        <p>
          It has a sequel: Part III’s version adds a companion star, with mass flowing between the two, shared envelopes, mergers and supernova
          kicks. Its sibling lab, <a href={href('orrery')}>the Orrery</a>, runs the planets.
        </p>
      </div>
    </article>
  );
}
