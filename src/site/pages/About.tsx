import contentStyles from '../content/content.module.css';
import { Timeline } from '../content/Timeline';
import { href } from '../router';
import styles from './pages.module.css';

export function About() {
  return (
    <article className={styles.page}>
      <header className={styles.chapterHeader}>
        <p className={styles.kicker}>About</p>
        <h1>About this course</h1>
        <p className={styles.lede}>What it is, how the figures work, and how far to trust them.</p>
      </header>
      <div className={contentStyles.prose}>
        <p>
          <b>The Clockwork Sky</b> is a self-guided course in astronomy and astrophysics, in three parts that rise from the sky you can see
          with your own eyes to the physics inside the stars. It is the third explainer on{' '}
          <a href="https://moving-parts.dev" target="_blank" rel="noreferrer">
            Moving Parts
          </a>
          , after <i>Beyond Dijkstra</i> and <i>From Black Box to Rulebook</i>. It is being built one part at a time, starting with{' '}
          <a href={href('part-1')}>Part I</a>.
        </p>

        <h2>The physics runs in your browser</h2>
        <p>
          The figures compute from real models and real data: the positions of the Sun, Moon and planets, star catalogues, orbits integrated
          step by step, models of stars. Nothing is a pre-recorded animation, and nothing is sent to a server. Where a figure has to simplify
          or exaggerate, it says so, in a <i>What’s simplified here?</i> note or a <i>Not to scale</i> tag.
        </p>

        <h2>How it is tested</h2>
        <p>
          The physics is checked automatically against independent references. So far that covers the foundations: calendar dates and Julian
          Dates against the worked examples in Jean Meeus’s <i>Astronomical Algorithms</i>; sidereal time and conversions between coordinate
          systems against the same book, and against round trips that must come back to where they started; and ΔT against the historical
          values it was fitted to. Chapter 1’s numbers are checked too: the planets’ periods against NASA’s fact sheets, light travel times
          against the research notes, galactic coordinates against the defining poles, and the scale models and the zoom against values worked
          out by hand. Since Chapter 2, the positions of the Sun, the Moon and the planets are checked against NASA JPL’s Horizons system
          (DE441) at dates from 3000 BC to AD 3000, each within its published accuracy; the precession of Earth’s axis against the reference
          values of ERFA, the open-source version of the IAU’s SOFA library, and Meeus’s worked example; and the pole stars of the past and
          future against the literature. Since Chapters 3 and 4, the equinoxes, solstices, perihelion and aphelion are checked against published
          times; sunrise and sunset against published tables; the Moon’s phases against Meeus’s worked examples and the lunar theory; and the
          eclipse finder against NASA’s catalogue of every solar and lunar eclipse from 1900 to 2100, about 900 of them, including their Saros
          numbers. Since Chapters 5 and 6, the planets’ oppositions, conjunctions, stations and greatest elongations are checked against
          published dates, their synodic periods and the lengths of their backward loops against the research notes, Kepler’s laws against
          independent calculations (areas added up slice by slice, distances to both foci), the third law against the orbits of the planets,
          dwarf planets, comets and Jupiter’s moons, and the fitted Ptolemaic model against Ptolemy’s own proportions. End-to-end tests open every page, use it by
          keyboard, and run accessibility checks (WCAG 2.1 AA) in light and dark mode and on a phone-sized screen.
        </p>

        <h2>What is simplified</h2>
        <p>
          Each figure’s <i>What’s simplified here?</i> note will be collected here as the figures arrive. Underneath them all, the course
          keeps time like this:
        </p>
        <ul>
          <li>
            Time runs on Julian Dates in Terrestrial Time, the smooth time scale of the planets’ motions. Historical dates use astronomical
            year numbering, in which 1 BC is year 0, and the Julian calendar before 15 October 1582, the Gregorian after.
          </li>
          <li>
            The turning Earth runs a little behind that smooth time, by an amount called ΔT: about 69 seconds in 2026. Before 2005, ΔT comes
            from Espenak and Meeus’s fits to the historical record; from 2005 to 2026, from measurements. After 2026 it is a prediction that
            may be tens of seconds out by 2050. In antiquity it is uncertain by minutes, more the further back you go.
          </li>
          <li>Two small effects on star positions, nutation and aberration, are left out. Neither is more than 20 arcseconds.</li>
          <li>
            Positions in the sky come from published formulas: the Sun from Meeus’s low-accuracy theory (within 0.01° from 1800 to 2050), the
            Moon from Meeus’s 120 largest terms of the ELP-2000/82 theory (within 30″, and seen from where you stand, not from Earth’s centre),
            and the planets from E. M. Standish’s orbital elements and Kepler’s equation (from 10″ for Neptune to 10′ for Saturn). Planets are
            shown only from 3000 BC to AD 3000, where those elements hold. Stars move in straight lines through space from their measured
            motions.
          </li>
        </ul>
        <h3>Chapter 1</h3>
        <ul>
          <li>
            <b>Figure 1.1, the zoom.</b> Sizes and distances are true. Directions are flattened: Earth is seen from straight above you, the
            planets from above their orbits, the stars from above the Milky Way, and anything above or below those planes is swung into them at
            its true distance. The planets sit at their average distances, at their average positions for today; the Oort cloud’s size is an
            estimate, and the Milky Way is a sketch. Anything smaller than a pixel is drawn as a dot.
          </li>
          <li>
            <b>Figure 1.2, the scale model.</b> The planets are at their average distances, in a line. The everyday objects are typical sizes,
            and distances between cities are straight lines across the globe.
          </li>
          <li>
            <b>Figure 1.3, light’s race.</b> Distances are true; orbits are circles at the average distance. Planets and spacecraft are drawn at
            least a few pixels wide. Voyager 1’s distance comes from its speed, about 3.6 AU a year, measured from where it is on 18 November 2026.
          </li>
          <li>
            <b>Toolkit figure T2.1.</b> The drawing squeezes the distance to fit, so small angles are drawn wider than they are. Arm’s length is
            taken as 57 cm.
          </li>
        </ul>
        <h3>Chapter 2</h3>
        <ul>
          <li>
            <b>Figure 2.1, the sky tonight.</b> The stars are the 8,900 brighter than magnitude 6.5, as seen under a perfectly dark sky. Dot
            sizes grow with brightness but are squeezed, so the brightest don’t swamp the screen. Refraction lifts things near the horizon. The
            daylight and twilight colours are a sketch, not a model of the atmosphere, with no haze, light pollution or weather.
          </li>
          <li>
            <b>Figure 2.2, star trails.</b> Daylight is switched off so the trails can run for twelve hours, even where the night is short. Only
            stars brighter than magnitude 3.6 leave trails; the Moon and planets are left out.
          </li>
          <li>
            <b>Figure 2.3, inside and outside.</b> In the view from outside, Earth is drawn huge and the sky tiny; really, the stars are so far
            away that your horizon and Earth’s centre see the same sky. Refraction is left out of the split into stars that never set, rise and
            set, or never rise.
          </li>
          <li>
            <b>Figure 2.4, one spin, two days.</b> Earth and its orbit are drawn far too big, the short years exaggerate how far Earth moves in a
            day, the orbit is a circle and the axis’s tilt is left out. None of that changes the count of turns.
          </li>
          <li>
            <b>Figure 2.5, the wandering pole.</b> The pole follows the long-term precession model of Vondrák, Capitaine and Wallace (2011). The
            stars move in straight lines at their measured speeds; their real paths curve round the Galaxy. The chart is fixed to the ecliptic of
            the year 2000.
          </li>
        </ul>
        <h3>Chapter 3</h3>
        <ul>
          <li>
            <b>Figure 3.1, the Sun’s year.</b> The stars behind the Sun are shown as if the sky were black. Dates are in Universal Time; the Sun
            crosses each boundary at a different hour each year, so tables of entry dates differ by a day or so.
          </li>
          <li>
            <b>Figure 3.2, the seasons machine.</b> Earth and the Sun are drawn far too big for their distance. Sunlight is counted at the top of
            the atmosphere: no clouds, no air, and no lag while oceans and land warm up and cool down. Changing the tilt changes only the Sun’s
            path in the sky; the orbit stays the real one.
          </li>
          <li>
            <b>Figure 3.3, the Sun’s daily path.</b> The sky is drawn dark and empty so the paths stand out, and the ground is flat to the
            horizon. Refraction is included.
          </li>
          <li>
            <b>Figure 3.4, calendar drift.</b> The no-leap calendar is lined up with the Julian one in 45 BC, and the Gregorian rules are used all
            the way back. The lines show every fourth year.
          </li>
          <li>
            <b>Figure 3.5, the analemma.</b> Earth’s orbit is a simple ellipse with today’s shape and timing, and the sideways scale is stretched
            to make the eight readable.
          </li>
          <li>
            <b>Figure 3.6, Earth’s changing tilt.</b> The tilt comes from the long-term precession model of Vondrák, Capitaine and Wallace. The
            other two Milanković cycles aren’t shown.
          </li>
        </ul>
        <h3>Chapter 4</h3>
        <ul>
          <li>
            <b>Figure 4.1, the phase machine.</b> The orbit is far too small and the bodies far too big. The sky and the times are for an
            idealised place on the equator at an equinox, with the Moon’s orbit in the plane of the equator.
          </li>
          <li>
            <b>Figures 4.2 and 4.3, two months and the Moon’s spin.</b> The orbits are circles in one plane, drawn out of scale; the 120-day year
            exaggerates Earth’s motion. Libration is left out of Figure 4.3.
          </li>
          <li>
            <b>Figure 4.4, eclipse seasons.</b> The Sun is drawn three Moon-orbits away instead of 390, and the Moon’s tilt three times too steep
            unless that is switched off. The eclipse seasons use the Moon’s average node. The eclipses come from the eclipse finder.
          </li>
          <li>
            <b>Figure 4.5, shadows.</b> Nothing is to scale, but the sizes are chosen so the Moon’s umbra just reaches Earth when the Moon is
            closer than about 380,000 km, as it really does. The bending of sunlight in Earth’s air is much exaggerated.
          </li>
          <li>
            <b>Figure 4.6, a Saros series.</b> Every member comes from the eclipse finder; far from the present its times are less certain, and a
            grazing first or last member may come or go by one.
          </li>
        </ul>

        <h3>Chapter 5</h3>
        <ul>
          <li>
            <b>Figures 5.1 and 5.2, the planets’ paths and loops.</b> Real positions from the planetary model. The sky is drawn as if it were dark
            at every hour, so planets in the Sun’s glare still show. The view from above flattens the orbits into one plane, and its ring of
            distant stars shows only directions.
          </li>
          <li>
            <b>Figure 5.3, Ptolemy’s model.</b> Longitudes only, in the plane of the ecliptic: Ptolemy’s separate theory of the planets’ latitudes is
            left out. “Ptolemy’s proportions” uses his sizes with today’s apogee and the true speeds, since his own numbers were for his time and
            his frame of reference.
          </li>
          <li>
            <b>Figures 5.4 and 5.5, Venus.</b> Circular orbits in one plane. Ptolemy’s Venus is drawn the same size as the real one, since his model
            fixed only directions. Galileo’s views of 1610–11 come from the planetary model.
          </li>
        </ul>
        <h3>Chapter 6</h3>
        <ul>
          <li>
            <b>Figures 6.1 and 6.2, ellipses and areas.</b> Exact two-body orbits. Speeds assume the Sun’s mass and an orbit of the size shown (1 AU
            for a shape picked with the slider).
          </li>
          <li>
            <b>Figure 6.3, the harmonic law.</b> Comets’ and dwarf planets’ orbits are osculating elements at one date: a comet’s period changes a
            little from one return to the next.
          </li>
        </ul>

        <h2>The people behind Part I</h2>
        <Timeline title="Timeline" />

        <h2>Sources</h2>
        <ul>
          <li>
            Jean Meeus, Astronomical Algorithms, 2nd edition (Willmann-Bell, 1998): calendars, Julian Dates, sidereal time, coordinate
            conversions, the positions of the Sun (ch. 25) and the Moon (ch. 47), refraction, the planets’ brightness, rising and setting
            (ch. 15), equinoxes and solstices (ch. 27), the Moon’s phases (ch. 49) and eclipses (ch. 54).
          </li>
          <li>
            J. Vondrák, N. Capitaine and P. Wallace (2011), Astronomy and Astrophysics 534, A22: precession over 200,000 years, as coded in ERFA
            (BSD licence), whose test values the course is checked against.
          </li>
          <li>NASA JPL Horizons (DE441): reference positions of the Sun, the Moon and the planets for the tests.</li>
          <li>
            F. J. Ballesteros (2012), EPL 97, 34008: a star’s temperature from its colour; C. Wyman, P.-P. Sloan and P. Shirley (2013), Journal of
            Computer Graphics Techniques 2(2): the colour-matching functions behind the star colours.
          </li>
          <li>G. G. Bennett (1982), Journal of Navigation 35, 255, and T. Sæmundsson (1986): atmospheric refraction.</li>
          <li>
            Fred Espenak and Jean Meeus, Five Millennium Canon of Solar Eclipses: −1999 to +3000 (NASA/TP-2006-214141, 2006), and the values of
            ΔT behind it from L. V. Morrison and F. R. Stephenson (2004).
          </li>
          <li>The International Earth Rotation and Reference Systems Service (IERS) and the US Naval Observatory: measured values of ΔT.</li>
          <li>S. Aoki and colleagues (1982), Astronomy and Astrophysics 105, 359: the IAU 1982 expression for sidereal time.</li>
          <li>J. Laskar (1986), Astronomy and Astrophysics 157, 59: the long-term formula for the tilt of Earth’s axis.</li>
          <li>
            NASA’s Five Millennium Catalogs of Solar and Lunar Eclipses (Fred Espenak, NASA Goddard): every eclipse from 1900 to 2100, against
            which the eclipse finder is tested.
          </li>
          <li>
            G. Kopp and J. L. Lean (2011), Geophysical Research Letters 38, L01706, with the IAU’s nominal solar luminosity: sunlight at Earth,
            about 1,361 W/m².
          </li>
          <li>J. D. Hays, J. Imbrie and N. J. Shackleton (1976), Science 194, 1121: the ice ages and the cycles of Earth’s orbit.</li>
          <li>T. Freeth and colleagues (2006), Nature 444, 587: the Antikythera mechanism and its Saros dial.</li>
          <li>
            Ptolemy, Almagest, book X: the proportions of his model of Mars (an epicycle of 39½ and an eccentricity of 6, on a deferent of 60).
          </li>
          <li>J. M. A. Danby, Fundamentals of Celestial Mechanics, 2nd edition (Willmann-Bell, 1988): the starting guess for Kepler’s equation.</li>
          <li>
            NASA JPL Small-Body Database: the orbits of Ceres, Pluto, Haumea, Makemake, Eris and the comets Encke, Halley and Swift–Tuttle
            (fetched October 2026). JPL’s planetary satellite mean elements and NASA’s Jovian satellite fact sheet: the orbits of Jupiter’s four
            large moons.
          </li>
          <li>NASA Planetary Fact Sheets (D. R. Williams, NASA Goddard): the sizes of the planets and the Moon.</li>
          <li>
            E. M. Standish, Keplerian Elements for Approximate Positions of the Major Planets (JPL Solar System Dynamics, after Standish and
            Williams 1992): the planets’ orbits, from 3000 BC to AD 3000.
          </li>
          <li>
            NASA, 17 June 2026: Voyager 1 reaches one light-day from Earth on 18 November 2026. Its distance from the Sun is worked out from
            that and Earth’s position; its direction (in Ophiuchus) and speed (about 17 km/s) are rounded values.
          </li>
          <li>
            ESA, The Hipparcos and Tycho Catalogues (1997), vol. 1, §1.5.3: the definition of galactic coordinates. Gaia Data Release 3 (2022):
            the distance to Proxima Centauri. SIMBAD (CDS, Strasbourg): star positions.
          </li>
          <li>
            GRAVITY Collaboration (2019, 2021), Astronomy and Astrophysics 625, L10 and 647, A59: the distance to the centre of the Milky Way and
            the mass of its black hole.
          </li>
          <li>T. S. Boyajian and colleagues (2012), The Astrophysical Journal 757, 112: the sizes of nearby red dwarfs.</li>
          <li>
            International Astronomical Union, Resolutions B2 of 2012 (the astronomical unit) and B2 and B3 of 2015 (the parsec and the nominal
            values for the Sun and Earth).
          </li>
        </ul>
        <p>
          The research notes behind the course, with a source for every number, are in the project’s <code>docs/</code> folder.
        </p>

        <h2>Data and credits</h2>
        <ul>
          <li>
            <b>Stars:</b> the HYG database, version 4.4, by David Nash (
            <a href="https://astronexus.com/hyg" target="_blank" rel="noreferrer">
              astronexus.com
            </a>
            ), which combines the Hipparcos, Yale Bright Star and Gliese catalogues. It is shared under the{' '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
              Creative Commons Attribution-ShareAlike 4.0
            </a>{' '}
            licence, and so is this course’s cut-down copy of it (the stars to magnitude 6.5), which is kept in a file of its own.
          </li>
          <li>
            <b>Constellation figures, boundaries and the Milky Way:</b> from{' '}
            <a href="https://github.com/ofrohn/d3-celestial" target="_blank" rel="noreferrer">
              d3-celestial
            </a>
            , copyright © 2015 Olaf Frohn, under the BSD 3-Clause licence. The figures follow the IAU’s constellation charts with Frohn’s edits;
            the boundaries are Davenhall and Leggett’s (1989); the Milky Way’s outline is after J. R. Vieira. The course matches the figures to
            its own stars and turns the outline into a smoothed map.
          </li>
          <li>
            <b>Planet positions:</b> NASA JPL’s published orbital elements (see Sources). <b>Places:</b> rounded city coordinates; clock times
            use your browser’s copy of the IANA time-zone database.
          </li>
          <li>
            <b>Eclipses:</b> the course finds eclipses with its own code, and tests it against NASA’s catalogues. Eclipse Predictions by Fred
            Espenak (NASA’s GSFC), reproduced in the tests with that acknowledgment, as NASA asks.
          </li>
        </ul>
        <p>Chapter 1’s sizes and distances are published values, typed into the code with their sources (see above).</p>

        <h2>Built with</h2>
        <p>
          TypeScript, React and Vite, with the chapter text in MDX. The physics is written from scratch for this course. It is hosted as a
          static site on Amazon S3 and CloudFront. There’s no server, no tracking and no cookies. The only things stored are your reading
          progress, your Check yourself answers and the place you chose for the sky figures, in your own browser. If you use “Use my
          location”, your browser asks first, and the location stays in your browser.
        </p>
      </div>
    </article>
  );
}
