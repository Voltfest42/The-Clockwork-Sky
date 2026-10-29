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
          , after <i>Beyond Dijkstra</i> and <i>From Black Box to Rulebook</i>. It is being built one part at a time: <a href={href('part-1')}>Part I</a>,
          with its lab, <a href={href('orrery')}>the Orrery</a>, is complete, and Parts II and III are on the way.
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
          dwarf planets, comets and Jupiter’s moons, and the fitted Ptolemaic model against Ptolemy’s own proportions. Since Chapter 7, the
          n-body engine is checked against Kepler’s exact orbits; each stepping method against the rate at which its error should shrink as the
          step does; the energy, momentum and angular momentum that an exact solution keeps; and the figure-eight orbit of three equal stars
          (Chenciner and Montgomery), which must come back to its start after one period. The masses weighed with orbits, the balance points,
          the strength of the Sun’s tides and the trip to Mars are checked against the research notes. Since Chapters 8 and 9, Jupiter’s four large
          moons, computed from JPL’s positions, are checked against JPL’s positions 60 days later (drifting only as much as leaving out Jupiter’s
          bulge explains), and must keep their 1 : 2 : 4 rhythm; the Kirkwood gaps against Kepler’s third law and the real asteroid counts; the
          snow line against Hayashi’s disc model; parallaxes and the distance modulus against round trips and the research notes; and the stars
          within 10 parsecs against their catalogue positions. With the Orrery, its two integrators are checked too: Wisdom–Holman must follow
          a lone planet’s exact orbit whatever the step, and keep a planetary system’s energy for a thousand years; IAS15 must follow an orbit as
          stretched as e = 0.99 to round-off, run backwards to where it started, and keep the energy of the Pythagorean three-body problem
          through its closest passes; and the two must agree. The Solar System, started from JPL’s positions on 1 January 2026, must land within
          20″ of JPL’s positions a century later (Mercury is furthest off, as leaving out relativity predicts), and every ready-made system must
          do what it is there to show: the figure-eight returns, the Trojans swing in tadpoles and horseshoes, the comet is caught and let go, and
          TRAPPIST-1’s and Kepler-16’s planets keep their measured periods. Since Part II’s Chapters 10 and 11, Planck’s law is checked against
          Wien’s law (where it peaks) and the Stefan–Boltzmann law (what it adds up to), and the share of light between two wavelengths
          against a direct sum; the Sun’s luminosity against its size and temperature, and every famous star’s measured luminosity against
          its measured size and temperature; photon energies, photon rates from a star of known magnitude, and the Bessel functions behind
          the diffraction pattern against tables; telescopes’ resolving power against the research notes; the blurred star images against
          the light they must contain; and the double stars’ orbits against the Sixth Catalog of Orbits’ own predictions for 2025–2029, to
          0.002″. Since Chapters 12 and 13, hydrogen’s wavelengths from Bohr’s ladder are checked against NIST’s, and Balmer’s lines to 0.01
          nm; Saha’s equation against the textbook temperature at which hydrogen is half ionised; the model atmosphere’s lines against
          where each element’s lines peak along the spectral classes, and the Sun’s strongest lines against their real strengths; the Sun’s
          make-up against its published mass fractions; and the HR diagram’s conversions between colour and temperature against round
          trips, with the famous stars landing in their known places. End-to-end tests open every page, use it by
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

        <h3>Chapter 7</h3>
        <ul>
          <li>
            <b>Figure 7.1, Newton’s cannon.</b> Earth is a perfect sphere that doesn’t spin, with no air. The ball is drawn far too big. Each path
            is computed in steps with the leapfrog method.
          </li>
          <li>
            <b>Figure 7.2, step by step.</b> An Earth-mass planet on an orbit the size of Earth’s, computed with exactly the method named and a
            fixed step.
          </li>
          <li>
            <b>Figure 7.3, the cosmic scale.</b> Orbits are drawn as circles at their average distance and sped up; small bodies are drawn bigger.
            The space station’s orbit is as of October 2026.
          </li>
          <li>
            <b>Figure 7.4, the barycentre.</b> Circular orbits; the pair on the left is drawn far too big for the distance between them (the
            close-up is to scale).
          </li>
          <li>
            <b>Figure 7.5, the tide maker.</b> The Moon is drawn far too close and the bulges hugely exaggerated. Heights are the equilibrium tide
            at the equator, with the Moon and the Sun over the equator; real oceans respond far more slowly and unevenly, and the solid Earth’s own
            tide is left out.
          </li>
          <li>
            <b>Figure 7.6, getting to Mars.</b> Circular orbits in one plane, with the planets at their average positions, so the launch windows
            can be a few weeks from the real ones. The craft feels only the Sun.
          </li>
          <li>
            <b>Toolkit figure T4.1.</b> A perfect spring with no friction, stepped with exactly the method named.
          </li>
        </ul>

        <h3>Chapter 8</h3>
        <ul>
          <li>
            <b>Figure 8.1, the Solar System today.</b> Real positions from JPL’s planetary model, flattened into the plane of Earth’s orbit. In the
            distances view the Sun and planets are dots far bigger than they are; in the sizes view the distances are left out. The belts are
            plain bands.
          </li>
          <li>
            <b>Figure 8.2, planet cards.</b> Real maps on smooth spheres: no mountains, no flattening of the giants, no glowing atmospheres. Gravity for the
            giants is at their cloud tops. Moon counts are as of March 2026.
          </li>
          <li>
            <b>Figure 8.3, Jupiter’s moons.</b> Jupiter and its four large moons pull on each other as points; the Sun and Jupiter’s bulge are left
            out, so the moons slowly fall behind the real ones. The moons are drawn far too big.
          </li>
          <li>
            <b>Figure 8.4, gaps in the belt.</b> Only the numbered asteroids, as of October 2026; many more are known less well or not yet found.
          </li>
          <li>
            <b>Figure 8.5, the snow line.</b> Hayashi’s textbook disc (1981), warmed only by sunlight; real discs were hotter inside early on and
            changed over time. Freezing temperatures are rounded.
          </li>
        </ul>

        <h3>Chapter 9</h3>
        <ul>
          <li>
            <b>Figure 9.1, parallax.</b> The star is drawn hundreds of thousands of times too close, and the view through the telescope is
            magnified until the shift shows. The stars’ own motions are left out.
          </li>
          <li>
            <b>Figure 9.2, the neighbourhood.</b> The stars within 10 parsecs in the HYG catalogue, which misses some faint red dwarfs and all brown
            dwarfs; a few faint stars’ types are estimated from their colour. Dots are far bigger than stars.
          </li>
          <li>
            <b>Figure 9.3, the Sun from far away.</b> Visible light only, with no dust in the way.
          </li>
          <li>
            <b>Figure 9.4, the Milky Way.</b> A smoothed outline from star maps, with the stars drawn as if the sky were dark at any time.
          </li>
        </ul>

        <h3>Chapter 10</h3>
        <ul>
          <li>
            <b>Figure 10.1, the spectrum ruler.</b> The boundaries between the bands are conventions.
          </li>
          <li>
            <b>Figure 10.2, counting photons.</b> A perfect detector: every photon counted, no noise of its own, no sky glow. Visible (V-band)
            light only.
          </li>
          <li>
            <b>Figure 10.3, how far down light gets.</b> A sketch from typical values, band by band; real absorption changes line by line and
            with the weather.
          </li>
          <li>
            <b>Figure 10.4, split the stars.</b> Exact diffraction for a clear circular opening, with no secondary mirror in the way. The air’s
            blur is the long-exposure average for standard (Kolmogorov) turbulence; adaptive optics is a simple mix of a sharp core and the
            blurred halo. The orbits of ε Lyrae’s pairs are preliminary.
          </li>
        </ul>

        <h3>Chapter 11</h3>
        <ul>
          <li>
            <b>Figures 11.1 and 11.2, black bodies and filters.</b> Perfect black bodies; real stars’ dark lines and atmospheres change their
            spectra, and their colours, a little. The colour shown is the light’s colour with its brightness evened out.
          </li>
          <li>
            <b>Figure 11.3, size, temperature, power.</b> Stars as smooth, limb-darkened discs, with luminosities from their sizes and
            temperatures alone; supergiants’ sizes are uncertain by a fifth or more.
          </li>
          <li>
            <b>Figure 11.4, the inverse-square law.</b> A point source with nothing in the way; the planets at their average distances.
          </li>
        </ul>

        <h3>Chapter 12</h3>
        <ul>
          <li>
            <b>Figure 12.1, Kirchhoff’s three spectra.</b> Real wavelengths; the lines’ brightnesses are only a rough guide, and a cool gas is
            drawn absorbing every line it gives out when hot.
          </li>
          <li>
            <b>Figure 12.3, make a spectrum.</b> A toy atmosphere: one layer at one temperature and a main-sequence star’s pressure, fifty of the
            strongest lines and a sketch of titanium oxide’s bands. It gets where lines come and go right, not their exact depths. The real
            spectra beside it are not corrected for dust.
          </li>
          <li>
            <b>Figure 12.4, the Sun’s make-up.</b> Surface abundances today; helium’s comes from helioseismology.
          </li>
          <li>
            <b>Figure 12.5, the Doppler shifter.</b> v = c Δλ/λ, exact for stars’ speeds; every star is drawn with the Sun’s spectrum.
          </li>
        </ul>

        <h3>Chapter 13</h3>
        <ul>
          <li>
            <b>Figures 13.1 and 13.2, the HR diagram.</b> Temperatures and bolometric corrections from a table of main-sequence stars, so
            approximate for giants and white dwarfs; Gaia misses the brightest stars and pairs too close to measure cleanly; dust is ignored.
          </li>
          <li>
            <b>Figure 13.3, stars to scale.</b> Red supergiants’ sizes are uncertain by a fifth to a half; the dashed circles show the range.
          </li>
        </ul>

        <h3>The Orrery</h3>
        <ul>
          <li>
            Every body is a point mass pulling by Newton’s law: no relativity (Mercury ends a century about 20″ from JPL’s position), no tides, no
            flattened planets. Bodies that touch merge completely, keeping their mass and momentum.
          </li>
          <li>
            In the Solar System preset each planet with moons is one body at its system’s centre of mass, carrying the moons’ mass; asteroids are
            left out. Jupiter’s moons leave out the Sun and Jupiter’s bulge.
          </li>
          <li>
            Kepler-16 and TRAPPIST-1 have their measured masses and periods, but where each body starts along its orbit is made up, and their
            orbits are flat. The Trojans and the comets go with a Jupiter on a circular orbit, without Saturn.
          </li>
          <li>Bodies are drawn at least a few pixels across, far bigger than they are.</li>
        </ul>

        <h2>The people behind the course</h2>
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
            which the eclipse finder is tested; and NASA’s decade tables of eclipses, 2021–2050, for where each coming eclipse can be seen.
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
          <li>NASA Planetary Fact Sheets (D. R. Williams, NASA Goddard): the sizes and masses of the planets, the Moon and their moons.</li>
          <li>
            Isaac Newton, Philosophiæ Naturalis Principia Mathematica (1687), book III, and A Treatise of the System of the World (1728): the law of
            gravity, the Moon test and the cannon on the mountain.
          </li>
          <li>H. Cavendish (1798), Philosophical Transactions of the Royal Society 88, 469: the experiment that first measured gravity between lab masses.</li>
          <li>
            A. Chenciner and R. Montgomery (2000), Annals of Mathematics 152, 881, with C. Simó’s initial values: the figure-eight orbit of three
            equal masses, used to test the n-body engine.
          </li>
          <li>
            F. R. Stephenson, L. V. Morrison and C. Y. Hohenkerk (2016), Proceedings of the Royal Society A 472, 20160404: the lengthening of the
            day. J. O. Dickey and colleagues (1994), Science 265, 482: the Moon’s recession, from lunar laser ranging.
          </li>
          <li>W. Hohmann, Die Erreichbarkeit der Himmelskörper (1925): the transfer orbit between two planets.</li>
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
            NASA JPL Small-Body Database query API: the orbits of every numbered asteroid (895,910, fetched October 2026), from the Minor Planet
            Center’s observations. JPL Horizons (JUP365): the positions of Jupiter’s four large moons on 1 January 2026, and 60 days later for the
            tests.
          </li>
          <li>
            C. Hayashi (1981), Progress of Theoretical Physics Supplement 70, 35: the minimum-mass solar nebula and its snow line. K. Lodders
            (2003), The Astrophysical Journal 591, 1220: the temperatures at which materials freeze out of the Sun’s gas.
          </li>
          <li>
            J. A. Connelly and colleagues (2012), Science 338, 651: the age of the Solar System from the oldest grains in meteorites. J. Laskar
            (1989), Nature 338, 237, and J. Laskar and M. Gastineau (2009), Nature 459, 817: the chaos and long-term stability of the planets.
          </li>
          <li>
            C. Reylé and colleagues (2021), Astronomy and Astrophysics 650, A201: the census of stars, brown dwarfs and planets within 10 parsecs.
            F. van Leeuwen (2007), Astronomy and Astrophysics 474, 653: the new reduction of Hipparcos (the parallaxes of Sirius and Vega). Gaia
            Data Release 3 (2022): the parallaxes of Proxima Centauri and 61 Cygni. M. Joyce and colleagues (2020), The Astrophysical Journal
            902, 63: the distance to Betelgeuse.
          </li>
          <li>
            The Orrery’s integrators: J. Wisdom and M. Holman (1991), The Astronomical Journal 102, 1528; H. Rein and D. Tamayo (2015), Monthly
            Notices of the Royal Astronomical Society 452, 376 (WHFast); H. Rein and D. S. Spiegel (2015), MNRAS 446, 1424 (IAS15), after E.
            Everhart (1985); J. M. A. Danby, Fundamentals of Celestial Mechanics, 2nd edition (Willmann-Bell, 1988), for Kepler’s problem in
            universal variables.
          </li>
          <li>
            The Orrery’s systems: NASA JPL Horizons (DE441) for the Solar System, Earth and the Moon on 1 January 2026 and a century later for the
            tests, with the masses of R. S. Park and colleagues (2021), The Astronomical Journal 161, 105 (DE440). A. Chenciner and R. Montgomery
            (2000), Annals of Mathematics 152, 881, with C. Simó’s initial conditions: the figure-eight. C. Burrau (1913) and V. Szebehely and C.
            F. Peters (1967), The Astronomical Journal 72, 876: the Pythagorean problem. L. R. Doyle and colleagues (2011), Science 333, 1602:
            Kepler-16. E. Agol and colleagues (2021), The Planetary Science Journal 2, 1: TRAPPIST-1, via the NASA Exoplanet Archive.
          </li>
          <li>
            M. Planck (1901), Annalen der Physik 4, 553: the law of black-body radiation. The SI’s exact values of the speed of light,
            Planck’s constant and Boltzmann’s constant (2019), and CODATA’s Wien constant.
          </li>
          <li>
            M. S. Bessell (1990), Publications of the Astronomical Society of the Pacific 102, 1181: the B and V filters, as served by the SVO
            Filter Profile Service (Spanish Virtual Observatory); M. S. Bessell, F. Castelli and B. Plez (1998), Astronomy and Astrophysics
            333, 231: the filters’ zero points.
          </li>
          <li>
            The Sixth Catalog of Orbits of Visual Binary Stars (W. I. Hartkopf, B. D. Mason and colleagues, US Naval Observatory and Georgia
            State University; fetched October 2026): the orbits of Sirius (H. E. Bond and colleagues 2017), α Centauri (R. Akeson and
            colleagues 2021), Castor and ε Lyrae (J. A. Docobo and colleagues 2020).
          </li>
          <li>
            D. L. Fried (1966) and F. Roddier (1981), on how turbulence blurs a telescope’s image; Lord Rayleigh (1879, 1881) on resolving power
            and how much light lies inside a ring of the Airy pattern.
          </li>
          <li>
            The famous stars’ sizes, temperatures, luminosities and masses: the sources listed in the course’s data file, among them
            Boyajian and colleagues (2012), Kervella and colleagues (2017), Bond and colleagues (2015, 2017), Yoon and colleagues (2010), Joyce
            and colleagues (2020), Levesque and Massey (2020), Ohnaka and colleagues (2013), Przybilla and colleagues (2006), Schiller and
            Przybilla (2008) and Tkachenko and colleagues (2016).
          </li>
          <li>
            A. A. Michelson and F. G. Pease (1921), The Astrophysical Journal 53, 249: the width of Betelgeuse. R. Giacconi and colleagues
            (1962), Physical Review Letters 9, 439: the first X-ray source beyond the Sun.
          </li>
          <li>
            The NIST Atomic Spectra Database (A. Kramida, Yu. Ralchenko, J. Reader and the NIST ASD Team): the wavelengths, energy levels and
            transition probabilities of the lines in Chapter 12. N. Bohr (1913), Philosophical Magazine 26, 1; M. N. Saha (1920),
            Philosophical Magazine 40, 472; C. H. Payne (1925), Stellar Atmospheres (Harvard Observatory Monographs 1); B. W. Carroll and D. A.
            Ostlie, An Introduction to Modern Astrophysics, 2nd edition (2007), and D. F. Gray, The Observation and Analysis of Stellar
            Photospheres, 3rd edition (2005), for the Saha–Boltzmann model; M. Asplund, A. M. Amarsi and N. Grevesse (2021), Astronomy and
            Astrophysics 653, A141: the Sun’s make-up.
          </li>
          <li>
            M. J. Pecaut and E. E. Mamajek (2013), The Astrophysical Journal Supplement 208, 9, and E. Mamajek’s “A Modern Mean Dwarf Stellar
            Color and Effective Temperature Sequence”, version 2022.04.16: colours, temperatures and bolometric corrections. Gaia
            Collaboration, C. Babusiaux and colleagues (2018), Astronomy and Astrophysics 616, A10: Gaia’s HR diagrams. E. Hertzsprung (1911)
            and H. N. Russell (1914), Popular Astronomy 22, 275: the first diagrams.
          </li>
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
            <b>Eclipses:</b> the course finds eclipses with its own code, and tests it against NASA’s catalogues. Where the coming eclipses can be
            seen comes from NASA’s tables. Eclipse Predictions by Fred Espenak (NASA’s GSFC), reproduced with that acknowledgment, as NASA asks.
          </li>
          <li>
            <b>Planet maps:</b> the globes use the planet textures of{' '}
            <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noreferrer">
              Solar System Scope
            </a>
            , under the{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
              Creative Commons Attribution 4.0
            </a>{' '}
            licence, made smaller for the web.
          </li>
          <li>
            <b>Asteroids:</b> counts made from the orbits of the numbered asteroids in NASA JPL’s Small-Body Database, which come from the
            Minor Planet Center. Only the counts are kept, not the orbits.
          </li>
          <li>
            <b>The HR diagram of the stars within 100 parsecs:</b> made from Gaia Data Release 3 (ESA/Gaia/DPAC). Gaia’s data are shared under
            the{' '}
            <a href="https://creativecommons.org/licenses/by-nc/3.0/igo/" target="_blank" rel="noreferrer">
              Creative Commons Attribution-NonCommercial 3.0 IGO
            </a>{' '}
            licence, and so is this course’s file made from them (a map of where the stars lie on the diagram, every star within 20 parsecs and
            a sample of the rest), which is kept in a folder of its own. This work has made use of data from the European Space Agency mission
            Gaia, processed by the Gaia Data Processing and Analysis Consortium (DPAC).
          </li>
          <li>
            <b>Real stellar spectra:</b> ten spectra from the X-shooter Spectral Library (A. Gonneau and colleagues 2020, Astronomy and
            Astrophysics 634, A133), based on observations collected at the European Southern Observatory and served by the ESO Science
            Archive under the{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
              Creative Commons Attribution 4.0
            </a>{' '}
            licence. The course averages them into 0.4 nm steps and joins each star’s two arms. Spectral types from SIMBAD (CDS, Strasbourg).
          </li>
          <li>
            <b>Spectral lines:</b> the NIST Atomic Spectra Database. <b>Main-sequence colours and temperatures:</b> Mamajek’s table (see
            Sources), used with the citation it asks for.
          </li>
          <li>
            <b>The nearest stars:</b> the stars within 10 parsecs, cut from the same HYG database and shared under the same Creative Commons
            Attribution-ShareAlike 4.0 licence, in a file of their own.
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
