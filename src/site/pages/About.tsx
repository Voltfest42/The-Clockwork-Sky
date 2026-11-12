import contentStyles from '../content/content.module.css';
import { Timeline } from '../content/Timeline';
import { href } from '../router';
import { MOONS_AS_OF } from '../../data/planets';
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
          , after <i>Beyond Dijkstra</i> and <i>From Black Box to Rulebook</i>. It is being built one part at a time: <a href={href('part-1')}>Part I</a>
          and <a href={href('part-2')}>Part II</a> are complete, each with its lab, <a href={href('orrery')}>the Orrery</a> and{' '}
          <a href={href('star-forge')}>the Star Forge</a>, and Part III is on the way.
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
          trips, with the famous stars landing in their known places. Since Chapters 14 and 15, the orbits of pairs of stars are checked
          against Kepler’s third law with both masses (Sirius and α Centauri weigh what their papers say), against a balance point that never
          moves and velocities that are the rate of change of distance; the masses back from the velocities and the mass function; the
          eclipses against the exact overlap of two discs and the tilt at which they must begin; the fit to β Aurigae’s eclipses against
          the radii it was simulated from; the mass–luminosity relation against DEBCat’s measured stars; the solar model against its
          published centre and convection zone; the Sun’s fuels against the research notes; the sunspot record against SILSO’s table of
          cycles; and the search for a hidden signal against one planted in noise. Since Chapter 16, the stellar-evolution engine, a
          TypeScript port of Jarrod Hurley’s SSE, is checked step by step against Hurley’s own Fortran code, compiled and run over 168 stars
          from 0.1 to 150 solar masses at seven metallicities, through every type of star and remnant a single star reaches; it must also keep the Sun within 10%
          of its luminosity and size at 4.57 billion years, never gain mass, and give heavier stars shorter lives. The Jeans mass and
          free-fall time are checked against the research notes, the dust law against its published ratios, the mass function against
          the shares it must give, the brown dwarfs’ cooling law against the models it summarises, and young stars’ arrival on the main
          sequence against the times in the research notes. Since Chapters 17 and 18, the engine’s isochrones must lie on Gaia’s main
          sequences of the Pleiades, the Hyades and M67 to within a few tenths of a magnitude, the Sun must leave the main sequence after about
          11 billion years and end as a white dwarf of about half its mass, white dwarfs must cool exactly as Hurley’s code cools them, the
          fates of stars must change at about 8 and 20 solar masses, Leavitt’s own table must give back her slope, two Cepheids must land
          within 6% of their distances by parallax, and the velocity curves of Gaia BH1 and Cygnus X-1 must swing as much as the measured
          ones. Since Chapter 19, Jupiter must swing the Sun by 12.5 m/s and Earth by 9 cm/s, Jupiter’s and Earth’s transits must dim it by
          1% and 84 parts per million, a limb-darkened transit must match the exact depth at the centre and Mandel and Agol’s small-planet
          formula across the disc, the habitable zone must run from 0.95 to 1.68 AU round the Sun as Kopparapu and colleagues give it, a planted
          wobble or dip must be measured back within its uncertainty, and the census file must hold as many planets as the Archive counted.
          Since Chapter 20, the stepping solver must give Chandrasekhar’s polytrope constants to every figure he quotes and the exact
          solutions for n = 0, 1 and 5; every polytrope must obey the virial theorem; Model S must hold itself up, the weight of the gas above
          each layer equal to the pressure there to 1%; Eddington’s quartic must give radiation 0.04% of the Sun’s pressure; and a contracting
          ball of gas must account for every joule its gravity releases, heat its gas by exactly as much as it radiates while the gas is
          ideal, and ignite hydrogen only above about 0.08 solar masses. Since Chapter 21, the opacity fits must follow Model S’s within 20%
          through the Sun’s radiative zone, the burning rates must match Model S’s within 30%, and Saha’s ionisation must leave the Sun’s
          surface gas neutral; random walks must spread as √N, and light must take 10,000 to 170,000 years to leave the Sun; the star builder
          must conserve its energy and hold each star up, build today’s Sun within 15% of Model S with its convection zone near 0.71 of the
          radius, Sirius A within 10% of its measured luminosity and radius, and from 0.8 to 20 solar masses a main sequence within a factor
          of 1.5 in luminosity of Tout and colleagues’ fits to detailed models; the cannon and the red dwarf must be hit in ten tries or fewer.
          Since Chapter 22, the Gamow peak must give the energies, widths and temperature exponents of the research notes and its numerical
          area must match the textbook approximation; the rates built from measured S-factors must match Caughlan and Fowler’s fits within 15%
          (and ¹⁴N + p half of theirs, as LUNA found); the reaction network must keep every nucleon, settle the CN cycle at ¹²C/¹³C ≈ 3.5, make
          Model S’s burning rate at the Sun’s centre within 5%, and, added up over Model S, give the Sun its luminosity within 10% with 85% of
          its helium from ppI, 15% from ppII and 0.02% from ppIII; the triple-alpha rate must climb as T⁴¹ at 100 million K; and the
          late fuels must light within about 10% of the balanced-power temperatures Woosley, Heger and Weaver give.
          Since Chapter 23, binding energies worked out from the IAEA’s masses must match its own table, with nickel-62 the most tightly bound
          and the brief’s values for helium-4 to uranium-238; the liquid drop must stay within about 1% of the measured binding beyond calcium,
          and its valley must put Z = 82 at A = 208; the course’s mass formula must fit the measured masses to about 2 MeV; the slow process
          must keep every nucleus, pile up first at N = 50, fall in steps at N = 50, 82 and 126, follow the classical formula for a spread of
          exposures, and match all but one of the Sun’s s-only isotopes from mass 96 to 150 within a quarter with τ₀ = 0.3 per millibarn; and the toy rapid
          process, averaged over bursts of every length, must leave its peaks near masses 80, 130 and 195.
          Since Chapters 24 and 25, the Fermi–Dirac integrals must give Chandrasekhar’s cold pressure and an ideal gas’s in their limits, keep the
          net charge with pairs, and never push less than either; Γ₁ must match Chandrasekhar’s formula for gas and light where pairs and packing
          don’t matter; the white-dwarf solver must give the Chandrasekhar mass, 5.83/μₑ² M☉, as its centre is squeezed without end, R ∝ M^−1/3
          for slow electrons, Nauenberg’s fit within 3% below a solar mass, and Sirius B, 40 Eridani B and Procyon B within 2%, 1% and 5%; cooling
          without freezing must be SSE’s Mestel law, and freezing must always slow it; the toy collapse must bounce at nuclear density with an
          inner core of about 0.6 solar masses falling together, keep its energy books to a part in a thousand, stall without heating and explode
          with strong heating; Arnett’s light curves must obey Arnett’s rule and Katz’s integral, fade at cobalt-56’s 0.98 magnitudes per
          100 days while their γ-rays are caught, and fit SN 2011fe’s peak with 0.52 solar masses of nickel; and the pair-instability wedge must
          lie between about 0.4 and 3.5 billion K below about 10⁶ g/cm³, with cores’ gas shares from Eddington’s quartic.
          Since Chapters 26 and 27, the TOV solver must give every one of Read and colleagues’ ten fitted equations of state’s heaviest star to
          0.1% and its 1.4-solar-mass radius to 0.2%, agree with Newton for light stars and have no heaviest star in Newton’s gravity, and keep
          its stable stars outside the causality limit; the spin-down formulas must give the research brief’s fields, ages and powers for the
          Crab, Vela, J0437−4715 and the Hulse–Taylor pulsar, a pulsar must age along its line of constant field, and only the three pulsars
          known to lie past the death line must lie past it; the lighthouse’s pulses must be as wide as spherical geometry says; Schwarzschild
          orbits must put the innermost stable orbit at 6GM/c², precess by the exact elliptic integral when stepped, and give Mercury’s 43″ a
          century and S2’s 12′ an orbit; light must be bent by 4GM/c²b plus the next term far out, 1.75″ at the Sun’s edge, and captured inside
          √27 GM/c², giving shadows of 53 and 40 microarcseconds for Sagittarius A* and M87*; and discs must add up to their luminosity, with
          efficiencies of 5.7%, 32% and 42% and the innermost orbit at 6, 1.237 and 1 GM/c² for spins of 0, 0.998 and 1.
          Since Chapter 28, the binary-star engine, a TypeScript port of Hurley’s BSE, is checked step by step against Hurley’s own Fortran
          over 604 pairs (primaries of 0.6 to 80 solar masses, three mass ratios, periods of 1 to 10,000 days, round and eccentric orbits,
          three metallicities, kicks off and on): every event and step must agree up to the first phase boundary where the two codes’ last
          binary digit sends the step either side of it, the step must realign after it, and every pair must end as the same two kinds of
          star; the Roche lobe integrated from the potential must match Eggleton’s formula to 1%, the stream from L1 must pass within 5% of
          Ulrich and Burger’s fit (0.049 separations for equal masses, as Lubow and Shu found), and conservative transfer must make the orbit
          smallest at equal masses.
          Since Chapter 29, Peters’ equations must give the Hulse–Taylor pulsar’s decay (−2.40 × 10⁻¹² s/s), its periastron’s advance (4.23° a
          year) and its merger in 301 million years, and the double pulsar’s decay and advance as Kramer and colleagues predict them; a circular
          orbit must merge in exactly the analytic time, and an eccentric track must keep Peters’ constant; the chirp must give its chirp mass
          back from its sweep, run on the analytic clock when stepped at leading order, and agree with the leading order far from the merger at
          3.5 post-Newtonian order; GW150914’s model must radiate 3.2 solar masses and leave a black hole of 63 spinning at 0.68, ringing at about
          250 Hz; the Fourier transform must undo itself, whitening must flatten coloured noise, and a hidden template must be found at its true
          shift with an overlap of 1; GWOSC’s strain must show the chirp above unit noise, and the merger list must match the counts quoted.
          Since Chapter 30, the cluster’s Hermite integrator must keep a two-star orbit’s energy and shape and converge at fourth order; a
          Plummer sphere must start in balance (twice its kinetic energy equal to its potential energy, within the noise of its sampling) with
          half its mass inside 1.305 scale radii; Kroupa’s mix must have its exact mean; a star at rest at the Jacobi radius must feel no force,
          and the Jacobi integral must hold to better than 10⁻³ while a cluster loses stars through L1 and L2 into a leading and a trailing tail,
          its heavy stars sinking; the relaxation time must be 15 million years for 1,000 stars of half a Sun within a parsec. The Bessel
          functions must match their series and asymptotic forms, an exponential disc’s speed must peak at 2.2 scale lengths and fall to
          Kepler’s far out, and the Milky Way’s model must turn at 230 km/s at the Sun with a halo fitted to Eilers and colleagues’ and Ou and
          colleagues’ curves. Arms of fixed stars must wind as the formula says; Kalnajs’s pattern must keep its shape. S2’s orbit must weigh
          Sagittarius A* at GRAVITY’s 4.26 million Suns by Kepler’s law, pass 119 AU from it at 7,700 km/s, turn by 12′ a lap and gain about
          200 km/s of redshift at pericentre and 6 at apocentre.
          Since Chapter 31, the colliding galaxies’ leapfrog must keep the pair’s energy and angular momentum with friction off, retrace its
          steps when run backwards, and keep the pair’s momentum with friction on; the Plummer sphere’s force, density and velocity spread must
          agree with each other (Poisson’s and Jeans’s equations); Chandrasekhar’s friction must match its slow and fast limits; a disc of test
          stars on its own must stay circular; a prograde pass must pull out a tail and a bridge and a retrograde one hardly any, as Toomre and
          Toomre found; friction must make a pair that would part sink together and merge; a companion through the middle must make a ring and
          one passing wide must not. The Local Group’s frame must put the Sun and the Galactic Centre where Astropy does, and Andromeda’s
          sampled sideways speed must have Sawala and colleagues’ median, about 75 km/s; their method must give their odds of a merger within a
          few per cent for each set of galaxies (44%, 63%, 37% and 54%), and Wu and colleagues’ measurements theirs (90%); the same futures
          must come from steps of one and two million years, and from the same seed.
          With the Star Forge, its inputs must always land inside their limits; brown dwarfs’ cooling must fade steadily and meet Burrows’s
          fits; the pair-instability range must fall at 140–270 solar masses by Heger and Woosley’s helium cores, out of reach of SSE’s own;
          every life must keep its phases in order and its remnant lighter than the star; a link must open the same stars again; and every
          ready-made star must do what its description says: Betelgeuse a neutron star of 2 solar masses, the 20-solar-mass pair a neutron star
          and a black hole, the star of 100 solar masses stripped to helium.
          End-to-end tests open every page, use it by
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
            giants is at their cloud tops. Moon counts are as of {MOONS_AS_OF}.
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

        <h3>Chapter 14</h3>
        <ul>
          <li>
            <b>Figures 14.1–14.3, the binary workbench.</b> Exact orbits of two point masses; the stars are spheres with the same limb
            darkening, giving light by Planck’s law, with no stretching by each other’s pull, no heating of each other’s facing sides and no
            gas passing between them. In Figure 14.1 the stars are dots, far bigger than they would be, and the tilt runs only from face-on to
            edge-on. β Aurigae’s velocities and light are simulated from its published solution, with noise; the fit’s uncertainties leave
            out errors in the model itself.
          </li>
          <li>
            <b>Figure 14.4, the mass–luminosity relation.</b> Luminosities worked out from measured radii and temperatures; stars sorted by
            their surface gravity; DEBCat’s 2017 version, with few red dwarfs.
          </li>
        </ul>

        <h3>Chapter 15</h3>
        <ul>
          <li>
            <b>Figure 15.1, the Sun cutaway.</b> A standard solar model, Model S; the chromosphere and corona drawn far thicker than they are.
          </li>
          <li>
            <b>Figure 15.2, the sunspot cycle.</b> Real records; the latest months are provisional, and the butterfly diagram’s areas after
            1976 are scaled to match the earlier ones.
          </li>
          <li>
            <b>Figure 15.3, the fuel gauge.</b> Order-of-magnitude sums at today’s luminosity; fusion burns the hydrogen in the core, a tenth
            of the Sun.
          </li>
        </ul>

        <h3>Chapter 16</h3>
        <ul>
          <li>
            <b>Figure 16.1, dust dims and reddens.</b> A black-body star; Cardelli, Clayton and Mathis’s average dust law for the Milky Way,
            carried on beyond 3.3 micrometres; the dust’s own glow left out.
          </li>
          <li>
            <b>Figure 16.2, collapse or not.</b> Jeans’s criterion for a still, even ball of gas, in its energy form; no turbulence,
            magnetic fields or rotation, and no collapse itself.
          </li>
          <li>
            <b>Figure 16.3, arrival on the main sequence.</b> Published models (BHAC15) from half a million years on, for 0.1 to 1.4 solar
            masses at the Sun’s make-up; heavier stars aren’t drawn.
          </li>
          <li>
            <b>Figure 16.4, cooling for ever.</b> The same models, carried on by a power-law fit where they stop; the fit leaves out deuterium
            burning.
          </li>
          <li>
            <b>Figure 16.5, a new cluster’s star masses.</b> Kroupa’s mass function, drawn at random; each star’s light is its light on the
            zero-age main sequence; brown dwarfs’ light left out.
          </li>
        </ul>

        <h3>Chapter 17</h3>
        <ul>
          <li>
            <b>Figure 17.1, lifetimes.</b> SSE’s main-sequence lifetimes at the Sun’s make-up, without rotation; extrapolated below 0.5 and
            above 50 solar masses.
          </li>
          <li>
            <b>Figure 17.2, the Sun’s life.</b> SSE for one solar mass; the step from giant to white dwarf is treated roughly, and the planets’
            orbits widen with the Sun’s mass loss but feel no tides.
          </li>
          <li>
            <b>Figure 17.3, age a cluster.</b> Members chosen by position, motion and distance from Gaia; one distance and reddening per
            cluster; SSE’s isochrones turned into Gaia’s colours with main-sequence corrections, which suit giants and cool dwarfs less well.
          </li>
          <li>
            <b>Figure 17.4, Leavitt’s law.</b> Leavitt’s photographic magnitudes as she gave them; a drawn light curve; one modern
            calibration for Milky Way Cepheids.
          </li>
        </ul>

        <h3>Chapter 18</h3>
        <ul>
          <li>
            <b>Figure 18.1, white dwarfs as clocks.</b> SSE’s modified Mestel cooling law, with no crystallisation; Gaia’s colours turned into
            temperatures with main-sequence corrections.
          </li>
          <li>
            <b>Figure 18.2, dead stars to scale.</b> A typical neutron-star radius of 12 km; a black hole’s horizon drawn as a black disc,
            without the bending of light.
          </li>
          <li>
            <b>Figure 18.3, weigh the invisible companion.</b> Exact Kepler orbits with published values; simulated measurements; the visible
            star’s mass taken as known.
          </li>
          <li>
            <b>Figure 18.4, the fork in the road.</b> SSE for single, non-rotating stars with its own winds and remnant masses; pair
            instability from the final helium core; the band where other models leave nothing is drawn from those models.
          </li>
        </ul>

        <h3>Chapter 19</h3>
        <ul>
          <li>
            <b>Figure 19.1, find the planet.</b> Circular orbits; the simplest noise, with none of the stars’ own jitter; the signals measured at the
            planet’s known period rather than searched for.
          </li>
          <li>
            <b>Figure 19.2, a transit up close.</b> The quadratic limb-darkening law with the Sun’s coefficients; a circular orbit ten stellar radii
            out; the planet a black disc, with no glow or air.
          </li>
          <li>
            <b>Figure 19.3, the exoplanet census.</b> The Archive’s chosen values; masses and sizes worked out from each other left out; selection
            effects shown, not corrected.
          </li>
          <li>
            <b>Figure 19.4, habitable zones.</b> Kopparapu and colleagues’ limits for a planet of Earth’s mass; the Sun’s brightening from SSE.
          </li>
          <li>
            <b>Figure 19.5, starlight through an atmosphere.</b> A toy model: each gas a few bands at their real wavelengths with sketched strengths,
            Rayleigh scattering and a grey cloud deck, the planet one scale height bigger for each factor of e in absorption.
          </li>
        </ul>

        <h3>Chapter 20</h3>
        <ul>
          <li>
            <b>Figure 20.1, how hot must the centre be?</b> The Sun’s shells are Model S’s; the rough sums drop the numbers in front and take
            ionised gas of 0.61 atomic mass units per particle for every star. Jupiter’s centre is from interior models, which disagree on its
            temperature (20,000–35,000 K).
          </li>
          <li>
            <b>Figure 20.2, the star that heats as it cools.</b> A polytrope of index 1.5 shrinking through balanced states, with exact energy
            bookkeeping; electrons partly degenerate by Paczyński’s interpolation; a surface temperature from a fit to Baraffe and colleagues’
            young stars; no real opacity, so its times are Kelvin–Helmholtz estimates; ignition when a simple pp-chain rate could pay for the
            light. Its dividing line falls at 0.084 solar masses, against detailed models’ 0.075.
          </li>
          <li>
            <b>Figure 20.3, fragmentation.</b> A cloud at exactly 10 K that splits in two at every halving of its Jeans mass; the opacity limit is
            a published estimate.
          </li>
          <li>
            <b>Figure 20.4, the Lane–Emden solver.</b> Exact to one part in ten billion; polytropes are idealised stars, with one rule for pressure
            throughout.
          </li>
          <li>
            <b>The core’s map.</b> Its regions show which pressure is largest, from ideal gas, black-body light and electrons at zero temperature;
            the boundaries are where two are equal, and the change from one to the other is gradual.
          </li>
        </ul>

        <h3>Chapter 21</h3>
        <ul>
          <li>
            <b>Figure 21.1, the random walk.</b> Steps of one length in directions picked evenly; it is the energy that random-walks, not one
            photon. The Sun’s mean free path is from Model S’s opacity and density, and its escape time treats the radiative zone as pure
            diffusion.
          </li>
          <li>
            <b>Figure 21.2, what blocks the light.</b> Analytic fits for ionised gas (electron scattering, Kramers’ two laws, H⁻ and a floor for
            molecules), with Kramers’ correction factor refitted to Model S’s opacities; no iron bump, no ionisation peak near the surface, no
            conduction.
          </li>
          <li>
            <b>Figure 21.3, convection or not.</b> A parcel of ideal gas with a little drag, its bobbing slowed down; the Sun’s gradients are
            Model S’s own.
          </li>
          <li>
            <b>Figure 21.4, build a star.</b> The four equations with ideal gas, Saha ionisation for hydrogen and helium, partly degenerate
            electrons and light; the fitted opacities and textbook pp and CNO rates; convection exactly adiabatic; a grey photosphere. Freshly
            mixed stars, except today’s Sun, which takes Model S’s hydrogen. Good to tens of per cent from 0.8 solar masses up; red dwarfs come
            out two to three times too faint.
          </li>
        </ul>

        <h3>Chapter 22</h3>
        <ul>
          <li>
            <b>Figure 22.1, the Gamow peak.</b> Exact for reactions without resonances; the S-factor, which changes slowly with energy, is left out
            of the curves; the barrier’s top is where the nuclei touch; screening by the gas’s electrons is left out.
          </li>
          <li>
            <b>Figure 22.2, the pp chains and the CNO cycle.</b> Steady burning at one temperature and density, every short-lived nucleus in
            balance; rates from measured S-factors through the Gamow peak with weak screening; the CN cycle alone, without oxygen’s branch.
          </li>
          <li>
            <b>Figure 22.3, Hoyle’s resonance.</b> Caughlan and Fowler’s triple-alpha rate, with the Hoyle state moved by its energy alone; a
            one-zone core of pure helium burning at a steady power: a toy.
          </li>
          <li>
            <b>Figure 22.4, the last days of a massive star.</b> Woosley, Heger and Weaver’s models, with the gaps between stages left out of the
            clock; the onion drawn by mass, with some of its edges rough; ignition lines from textbook rates and an approximate law for pair
            neutrinos that leaves out degeneracy.
          </li>
        </ul>

        <h3>Chapter 23</h3>
        <ul>
          <li>
            <b>Figure 23.1, the chart of nuclides.</b> Ground states only, without the long-lived excited states; a quarter of the masses are
            extrapolated from their neighbours’ trends; the drip lines beyond the measured masses come from the course’s own mass formula, the
            liquid drop with a shell correction, good to about 2 MeV.
          </li>
          <li>
            <b>Figure 23.2, neutron captures step by step.</b> The slow process at one neutron density and kT = 30 keV, with laboratory half-lives
            (some change in a star’s heat) and an iron seed alone. The rapid process is a toy: each element’s isotopes in the (n,γ) ⇌ (γ,n)
            balance, masses from the course’s formula, unmeasured half-lives from a rule fitted to measured ones, and no fission, β-delayed
            neutrons or late captures; its pattern is drawn smoothed.
          </li>
          <li>
            <b>Figure 23.3, every element’s birthplace.</b> Jennifer Johnson’s shares, read off her figure: models, good to ten or twenty per
            cent, and argued over where the rapid process is concerned.
          </li>
        </ul>

        <h3>Chapter 24</h3>
        <ul>
          <li>
            <b>Figure 24.1, filling the Fermi sea.</b> The electrons’ pressure is exact (Fermi–Dirac integrals, with relativity), but the ions’
            own pressure, the electric pull between electrons and ions and electron–positron pairs are left out; the slice through momentum space
            is a picture of far more, far closer states.
          </li>
          <li>
            <b>Figure 24.2, build a white dwarf.</b> Cold white dwarfs held up by electrons alone, with Chandrasekhar’s exact pressure, so helium
            and carbon–oxygen ones come out the same. The electric pull between electrons and ions (a few per cent), the white dwarf’s heat and
            hydrogen skin, electron captures at the highest densities and general relativity are left out; together they bring a real
            carbon–oxygen white dwarf’s limit to about 1.38 solar masses and make ZTF J1901+1458 smaller than the model.
          </li>
          <li>
            <b>Figure 24.3, cooling and crystallising.</b> Mestel’s law with SSE’s constant, the latent heat of freezing and a crystal’s larger
            heat capacity; no separation of oxygen from carbon, no neon sinking, no neutrinos, no faster cooling of an old crystal. It cools
            white dwarfs too fast at the faint end, and its freezing line runs hotter than detailed models’ for the heaviest white dwarfs.
          </li>
        </ul>

        <h3>Chapter 25</h3>
        <ul>
          <li>
            <b>Figure 25.1, collapse and bounce.</b> A toy: one-dimensional Newtonian hydrodynamics with artificial viscosity, a made-up
            equation of state softened between 10⁸ g/cm³ and nuclear density, a fixed cost for splitting iron, neutrinos as a “light bulb”
            heating the gas behind the shock, and the settled neutron star held fixed. Its bounce and inner core are like detailed models’; its
            shock stalls further out, and it explodes above about 2 × 10⁵² erg/s.
          </li>
          <li>
            <b>Figure 25.2, supernova spectra, sorted.</b> The spectra are sketches, not observations, and the tree leaves out Type II’s own
            kinds and the in-between Type IIb.
          </li>
          <li>
            <b>Figure 25.3, light from radioactive nickel.</b> Arnett’s one-zone model with one opacity, a fixed γ-ray opacity and Popov’s
            analytic plateau; the supernovae are their published peaks, not whole light curves.
          </li>
          <li>
            <b>Figure 25.4, the pair-instability wedge.</b> The wedge is exact for oxygen, its electrons and pairs, and light; the cores follow
            Eddington’s standard model, without general relativity, so their average Γ₁ first dips below 4/3 for about 27 solar masses, against
            about 35 in detailed models; the outcomes are Heger and Woosley’s and Woosley’s.
          </li>
        </ul>

        <h3>Chapter 26</h3>
        <ul>
          <li>
            <b>Figure 26.1, inside a neutron star.</b> The SLy equation of state’s star, as fitted by Read and colleagues; its layers’ edges are set
            by density, the pasta’s and the inner core’s by round numbers; the atmosphere and ocean are too thin to draw, and what fills the inner
            core isn’t known.
          </li>
          <li>
            <b>Figure 26.2, build a neutron star.</b> The TOV equation is exact for each equation of state, which is Read and colleagues’ fit to a
            published one, good to about 1%; the stars don’t spin. NICER’s and GW170817’s numbers depend on their models; “Newton only” takes
            gravity from the rest mass alone.
          </li>
          <li>
            <b>Figure 26.3, the pulsar lighthouse.</b> Geometric beams with a core and a ring; real beams are patchier, and their widths depend on
            the period. The star turns far more slowly than any real pulsar, and the beams are drawn far longer than it.
          </li>
          <li>
            <b>Figure 26.4, the P–Ṗ diagram.</b> Fields, ages and powers assume a magnetic dipole spinning in empty space, with a moment of inertia
            of 10³⁸ kg m²; recycling is a sketch; the death line is one of several. The pulsars are about sixty famous ones from their papers, not
            the catalogue’s 4,500.
          </li>
        </ul>

        <h3>Chapter 27</h3>
        <ul>
          <li>
            <b>Figures 27.1 and 27.2, orbits and light near a black hole.</b> Exact geodesics round a black hole that doesn’t spin; the body is
            small, feels no drag or tides and gives off no gravitational waves.
          </li>
          <li>
            <b>Figure 27.3, the accretion disc.</b> Shakura and Sunyaev’s thin disc, with each ring a black body and its inner edge at
            relativity’s innermost stable orbit, scaled to the luminosity chosen; no redshift, light bending or Doppler boost, no corona and no
            scattering in the disc’s skin; seen face-on.
          </li>
        </ul>

        <h3>Chapter 28</h3>
        <ul>
          <li>
            <b>Figure 28.1, the Roche potential explorer.</b> Point masses on a circular orbit, each spinning with it; the stream is single
            particles released at L1 with a thousandth of the orbital speed, falling freely; the disc forms where gas with the stream’s angular
            momentum would orbit in a circle; the landscape’s wells are cut off.
          </li>
          <li>
            <b>Figure 28.2, the orbit as mass changes hands.</b> Points on a circular orbit; mass lost from the pair leaves from the companion
            with its orbital speed; Eggleton’s volume-equivalent lobes.
          </li>
          <li>
            <b>Figures 28.3 and 28.4, the Algol paradox and the binary zoo.</b> Hurley, Tout and Pols’s BSE (2002): fitted single-star formulae
            and recipes for winds, tides, magnetic braking, overflow, common envelopes and kicks, not the stars’ structure; binary.in’s switches
            except α = 1; kicks drawn from a Maxwellian of 190 km/s, one seeded draw per pair; circular orbits from the zero-age main sequence;
            the zoo’s classes are this course’s. Algol’s ancestors were picked from a search of BSE runs, and its third star is left out.
          </li>
        </ul>

        <h3>Chapter 29</h3>
        <ul>
          <li>
            <b>Figure 29.1, the shrinking orbit.</b> Peters’ equations: point masses at relativity’s leading order, averaged over each orbit;
            the last orbits by the circular formula; the Galaxy’s pull on the Hulse–Taylor pulsar already taken out of the measured decay.
          </li>
          <li>
            <b>Figure 29.2, stretch and squeeze.</b> The stretch exaggerated about 10²⁰ times and the wave slowed to a cycle every few seconds;
            the detector square to the wave, and its arms as single passes of light.
          </li>
          <li>
            <b>Figure 29.3, make a chirp.</b> The inspiral to 3.5 post-Newtonian order (TaylorT4) for black holes that don’t spin; the merger a
            smooth join to the ringdown of the black hole left (its mass and spin from fits to numerical relativity, its ringing from Berti, Cardoso
            and Will’s fits); the strain for a pair seen face-on from overhead; neutron stars followed until they touch. Because the merger is
            only sketched, the chirp mass that fits GW150914’s data best is about a tenth below LIGO’s.
          </li>
          <li>
            <b>Figure 29.4, the merger census.</b> Medians and 90% intervals as GWOSC lists them; candidates without mass estimates counted but
            not drawn; neutron stars told apart by mass alone; the gaps’ edges approximate.
          </li>
          <li>
            <b>Figure 29.5, the gravitational-wave spectrum.</b> Analytic curves: Advanced LIGO’s design fit, LISA’s planned noise with the
            Galaxy’s white dwarfs, and only the shape of a pulsar timing array’s reach; sources averaged over orientation, the million-Sun pair
            without the stretching of its waves on the way.
          </li>
        </ul>

        <h3>Chapter 30</h3>
        <ul>
          <li>
            <b>Figure 30.1, a cluster evaporates.</b> Direct summation softened over a fiftieth of the half-mass radius (which slows relaxation a
            little); Hill’s tide for a circular orbit in a flat rotation curve of 230 km/s, with the disc’s pull out of the plane; no stellar
            evolution, no pairs of stars at the start, no gas, spiral arms or passing clouds; Kroupa’s mix cut at 3 solar masses.
          </li>
          <li>
            <b>Figure 30.2, the Galaxy from outside.</b> A model from simple formulas with measured sizes, not a map; the number of dots per part
            chosen for the picture, not by mass; the arms as the course’s sketch; the dark halo not drawn.
          </li>
          <li>
            <b>Figure 30.3, the rotation curve.</b> Standard shapes: a Hernquist bulge, thin exponential discs and an NFW halo whose concentration
            follows its mass; SPARC’s own speeds for the stars and gas of its galaxies, with only the mass-to-light ratio and the halo’s mass free;
            the Milky Way’s parts close to McMillan’s (2017) model.
          </li>
          <li>
            <b>Figure 30.4, the winding problem.</b> Kinematic sketches: stars on circles or fixed ovals that don’t pull on each other; the ovals made
            to turn together.
          </li>
          <li>
            <b>Figure 30.5, S2’s orbit.</b> GRAVITY’s Keplerian ellipse with relativity’s precession and redshift added to first order; light’s
            travel time across the orbit, its bending and the Galaxy’s motion left out; the precession drawn 40 times larger.
          </li>
        </ul>

        <h3>Chapter 31</h3>
        <ul>
          <li>
            <b>Figure 31.1, galaxy collision.</b> Toomre’s restricted method: rigid Plummer spheres (softened point masses) whose test stars
            feel both galaxies but pull on nothing, so the discs can’t make arms or bars, and the galaxies keep their shapes; dynamical friction by
            Chandrasekhar’s formula with a Coulomb logarithm of 2, on the lighter galaxy in the heavier one’s sphere, which only sketches a merger’s
            last stages and can’t capture galaxies meeting on open orbits; flat, cold discs; no gas and no
            dark halo beyond each sphere. Toomre and Toomre’s and Lynds and Toomre’s set-ups scaled to discs of 20 kpc in galaxies of 2 × 10¹¹
            suns.
          </li>
          <li>
            <b>Figure 31.2, will we collide?</b> Sawala and colleagues’ method (2025): standard (NFW) dark halos pulling as points softened over
            20 kpc, Chandrasekhar’s friction on the lighter of each pair within the heavier one’s halo (its Coulomb logarithm never allowed below
            zero), mergers within 20 kpc; measured values drawn from bell curves cut at two standard deviations; stars, gas, spin, the Small
            Magellanic Cloud and the smaller galaxies left out; steps of two million years.
          </li>
        </ul>

        <h3>Toolkit: Vectors</h3>
        <ul>
          <li>
            <b>Figure T7.1, dot and cross.</b> The arrows lie in a plane, so their cross product always points straight up or down from it.
          </li>
        </ul>

        <h3>Toolkit: Differential equations</h3>
        <ul>
          <li>
            <b>Figure T10.1, shooting.</b> Figure 7.1’s cannon, without air; the red dwarf is an n = 1.5 polytrope with Proxima’s mass and radius;
            corrections are secant steps.
          </li>
        </ul>

        <h3>Toolkit: Rates of change, Adding up small pieces, and Estimating with orders of magnitude</h3>
        <ul>
          <li>
            <b>Figures T8.1 and T9.1.</b> Model S’s pressure as a smooth curve through its tabulated shells, and its density between them by
            straight lines.
          </li>
          <li>
            <b>Figure T11.1, the estimate machine.</b> Each estimate keeps how the answer scales and drops the numbers in front; the photon’s
            escape takes one step length, 1 cm, throughout.
          </li>
        </ul>

        <h3>Toolkit: Measurements and uncertainty</h3>
        <ul>
          <li>
            <b>Figure T6.1, find the signal.</b> The simplest noise, the same size throughout and independent from one measurement to the next;
            a box-shaped dip of a single length.
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

        <h3>The Star Forge</h3>
        <ul>
          <li>
            SSE’s fitted formulas for single, non-rotating stars without magnetic fields, from the zero-age main sequence, with its own winds
            (scaled by the winds slider) and Belczynski and colleagues’ remnant masses. Fitted to detailed models from 0.5 to 50 solar masses and
            Z = 0.0001–0.03; stretched outside that, as its calibration map shows. With no winds at all, SSE stalls for stars above about 90
            solar masses, and the Forge says so.
          </li>
          <li>
            Brown dwarfs follow BHAC15’s tracks, interpolated in mass, and Burrows and colleagues’ power laws beyond them, to 10 billion years.
            Above 100 solar masses, other models’ outcomes come from Heger and Woosley’s helium cores for metal-free stars that keep their mass.
          </li>
          <li>
            The step from giant to white dwarf is drawn as a dashed jump; the insides show only what SSE gives (the core, and the outer
            convection zone), not the convective cores of heavy main-sequence stars; neutron stars and black holes are off the HR diagram.
          </li>
          <li>Clusters: as Figure 17.3.</li>
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
            J. Southworth (2015), ASP Conference Series 496, 164: DEBCat, the catalogue of detached eclipsing binaries. J. Southworth, H. Bruntt
            and D. L. Buzasi (2007), Astronomy and Astrophysics 467, 1215: β Aurigae; J. C. Morales and colleagues (2009), The Astrophysical
            Journal 691, 1400: CM Draconis. D. Raghavan and colleagues (2010), The Astrophysical Journal Supplement 190, 1: how many Sun-like
            stars have companions. A. S. Eddington (1924), Monthly Notices of the Royal Astronomical Society 84, 308: the mass–luminosity
            relation. J. A. Nelder and R. Mead (1965), The Computer Journal 7, 308: the downhill simplex; G. Kovács, S. Zucker and T. Mazeh
            (2002), Astronomy and Astrophysics 391, 369: the box search.
          </li>
          <li>
            J. Christensen-Dalsgaard and colleagues (1996), Science 272, 1286: Model S, the standard solar model. H. A. Bethe (1939), Physical
            Review 55, 434: how the Sun shines. R. Mitalas and K. R. Sills (1992), The Astrophysical Journal 401, 759: how long the Sun’s energy
            takes to get out. F. Clette and L. Lefèvre (2016), Solar Physics 291, 2629: the recalibrated sunspot number. D. H. Hathaway
            (2015), Living Reviews in Solar Physics 12, 4: the solar cycle.
          </li>
          <li>
            J. R. Hurley, O. R. Pols and C. A. Tout (2000), Monthly Notices of the Royal Astronomical Society 315, 543: SSE, the
            stellar-evolution formulas and code, with C. A. Tout and colleagues (1996), MNRAS 281, 257, for the zero-age main sequence. I.
            Baraffe, D. Homeier, F. Allard and G. Chabrier (2015), Astronomy and Astrophysics 577, A42: young stars’ and brown dwarfs’ tracks.
            A. Burrows and colleagues (2001), Reviews of Modern Physics 73, 719: brown dwarfs’ cooling. G. Chabrier and colleagues (2023),
            Astronomy and Astrophysics 671, A119: the hydrogen-burning limit. J. A. Cardelli, G. C. Clayton and J. S. Mathis (1989), The
            Astrophysical Journal 345, 245: the dust law. J. H. Jeans (1902), Philosophical Transactions of the Royal Society A 199, 1. J. F.
            Alves, C. J. Lada and E. A. Lada (2001), Nature 409, 159: Barnard 68. E. E. Salpeter (1955), The Astrophysical Journal 121, 161,
            and P. Kroupa (2001), MNRAS 322, 231: the initial mass function. A. Heger and S. E. Woosley (2002), The Astrophysical Journal 567,
            532; S. E. Woosley (2017), The Astrophysical Journal 836, 244; K. Belczynski and colleagues (2016), Astronomy and Astrophysics
            594, A97; R. Farmer and colleagues (2019), The Astrophysical Journal 887, 53: pair instability. V. M. Kalari and colleagues
            (2022), The Astrophysical Journal 935, 162: R136a1. K. L. Luhman (2014), The Astrophysical Journal Letters 786, L18: WISE
            0855−0714. The young stars’ temperatures and luminosities: S. M. Andrews and colleagues (2012), TW Hydrae; M. Keppler and
            colleagues (2018), PDS 70; P. Plavchan and colleagues (2020), AU Microscopii; T. J. David and colleagues (2019), V1298 Tauri; K.
            Zwintz and colleagues (2019), β Pictoris.
          </li>
          <li>
            The Star Forge: SSE as above, from Hurley’s code as distributed with AMUSE (src/amuse_sse/src, the SSE distribution unchanged); K.
            Belczynski, V. Kalogera and T. Bulik (2002), The Astrophysical Journal 572, 407: neutron-star and black-hole masses. G. Laughlin, P.
            Bodenheimer and F. C. Adams (1997), The Astrophysical Journal 482, 420: the end of the smallest red dwarfs. J. Liebert and colleagues
            (2005), The Astrophysical Journal 630, L69: the mass Sirius B was born with. M. Asplund, A. M. Amarsi and N. Grevesse (2021),
            Astronomy and Astrophysics 653, A141: the Sun’s metallicity today.
          </li>
          <li>
            H. S. Leavitt and E. C. Pickering (1912), Harvard College Observatory Circular 173: periods of 25 variable stars in the Small
            Magellanic Cloud. G. F. Benedict and colleagues (2002), The Astronomical Journal 124, 1695, and (2007), 133, 1810: Cepheid parallaxes
            and the period–luminosity law. L. Casagrande and D. A. VandenBerg (2018), MNRAS 479, L102: Gaia’s reddening coefficients. T. Cantat-Gaudin
            and colleagues (2018), Astronomy and Astrophysics 618, A93, and E. Vasiliev and H. Baumgardt (2021), MNRAS 505, 5978: clusters’
            motions and parallaxes; H. Baumgardt and E. Vasiliev (2021), MNRAS 505, 5957: 47 Tucanae’s distance. S. E. Dahm (2015), The
            Astrophysical Journal 813, 108: the Pleiades’ age; the other clusters’ ages from the papers named in the figure. K. El-Badry and
            colleagues (2023), MNRAS 518, 1057: Gaia BH1; Gaia Collaboration, P. Panuzzo and colleagues (2024), Astronomy and Astrophysics
            686, L2: Gaia BH3; J. C. A. Miller-Jones and colleagues (2021), Science 371, 1046: Cygnus X-1. M. V. Romani and colleagues (2022),
            The Astrophysical Journal Letters 934, L17: PSR J0952−0607. P.-E. Tremblay and colleagues (2019), Nature 565, 202: white dwarfs
            crystallising. C. Fransson and colleagues (2024), Science 383, 898: SN 1987A’s neutron star. S. J. Smartt (2015), Publications of
            the Astronomical Society of Australia 32, e016: supernova progenitors.
          </li>
          <li>
            M. Mayor and D. Queloz (1995), Nature 378, 355: 51 Pegasi b. A. Wolszczan and D. A. Frail (1992), Nature 355, 145: the pulsar
            planets. D. Charbonneau and colleagues (2000), The Astrophysical Journal 529, L45, and G. W. Henry and colleagues (2000), 529, L41:
            the first transits. R. K. Kopparapu and colleagues (2013), The Astrophysical Journal 765, 131, and (2014), The Astrophysical Journal
            Letters 787, L29: habitable zones. K. Mandel and E. Agol (2002), The Astrophysical Journal 580, L171: transit light curves. S. Seager
            and G. Mallén-Ornelas (2003), The Astrophysical Journal 585, 1038: transit durations. A. Lecavelier des Etangs and colleagues
            (2008), Astronomy and Astrophysics 481, L83: the planet’s size in its air’s bands. B. J. Fulton and colleagues (2017), The
            Astronomical Journal 154, 109: the radius valley. J. T. Wright and colleagues (2012), The Astrophysical Journal 753, 160: how
            common hot Jupiters are. JWST Transiting Exoplanet Community ERS Team (2023), Nature 614, 649: carbon dioxide on WASP-39 b. N.
            Madhusudhan and colleagues (2023), The Astrophysical Journal Letters 956, L13: K2-18 b.
          </li>
          <li>
            J. H. Lane (1870), American Journal of Science 50, 57, and R. Emden (1907), <i>Gaskugeln</i>: polytropes. S. Chandrasekhar (1939),{' '}
            <i>An Introduction to the Study of Stellar Structure</i>, and G. P. Horedt (2004), <i>Polytropes</i>: the Lane–Emden constants. A. S.
            Eddington (1926), <i>The Internal Constitution of the Stars</i>: the standard model. W. Thomson (1862), Macmillan’s Magazine 5, 388: on
            the age of the Sun’s heat. C. C. Patterson (1956), Geochimica et Cosmochimica Acta 10, 230: the age of Earth. F. Hoyle (1953), The
            Astrophysical Journal 118, 513: fragmentation. C. Low and D. Lynden-Bell (1976), Monthly Notices of the Royal Astronomical Society 176,
            367, and M. J. Rees (1976), 176, 483: the opacity limit. B. Paczyński (1983), The Astrophysical Journal 267, 315: partly degenerate
            electrons. R. Kippenhahn, A. Weigert and A. Weiss (2012), <i>Stellar Structure and Evolution</i>: the pp chain’s rate. J. R. Dormand and
            P. J. Prince (1980), Journal of Computational and Applied Mathematics 6, 19: the stepping solver. B. Militzer and colleagues (2016),
            Journal of Geophysical Research: Planets 121, 1552, and F. Debras and G. Chabrier (2019), The Astrophysical Journal 872, 100: Jupiter’s
            interior. R. Mitalas and K. R. Sills (1992), The Astrophysical Journal 401, 759: a photon’s escape from the Sun.
          </li>
          <li>
            K. Schwarzschild (1906), Nachrichten der Königlichen Gesellschaft der Wissenschaften zu Göttingen 1906, 41: radiative equilibrium and
            convection. H. A. Kramers (1923), Philosophical Magazine 46, 836: absorption by ions. R. Wildt (1939), The Astrophysical Journal 89,
            295: the H⁻ ion. B. W. Carroll and D. A. Ostlie (2017), <i>An Introduction to Modern Astrophysics</i>, and C. J. Hansen, S. D.
            Kawaler and V. Trimble (2004), <i>Stellar Interiors</i>: the opacity fits, the fitting method and the textbook star builders. G. M.
            Caughlan and W. A. Fowler (1988), Atomic Data and Nuclear Data Tables 40, 283, by way of Kippenhahn, Weigert and Weiss: the pp and
            CNO rates. E. E. Salpeter (1954), Australian Journal of Physics 7, 373: screening. E. Böhm-Vitense (1958), Zeitschrift für
            Astrophysik 46, 108: mixing-length theory. M. Schwarzschild (1958), <i>Structure and Evolution of the Stars</i>. L. G. Henyey and
            colleagues (1959), The Astrophysical Journal 129, 628: the relaxation method. C. A. Iglesias and F. J. Rogers (1996), The
            Astrophysical Journal 464, 943: the OPAL opacities. B. Paxton and colleagues (2011), The Astrophysical Journal Supplement Series 192,
            3: MESA. S. Basu and H. M. Antia (1997), Monthly Notices of the Royal Astronomical Society 287, 189: the base of the Sun’s convection
            zone. C. A. Tout, O. R. Pols, P. P. Eggleton and Z. Han (1996), Monthly Notices of the Royal Astronomical Society 281, 257: zero-age
            main-sequence luminosities and radii.
          </li>
          <li>
            G. Gamow (1928), Zeitschrift für Physik 51, 204: tunnelling. R. d’E. Atkinson and F. G. Houtermans (1929), Zeitschrift für Physik 54,
            656: fusion in stars. W. A. Fowler, G. R. Caughlan and B. A. Zimmerman (1967), Annual Review of Astronomy and Astrophysics 5, 525:
            non-resonant rates. B. Acharya and colleagues (2025), Reviews of Modern Physics (Solar Fusion III, arXiv:2405.06470), and E. G.
            Adelberger and colleagues (2011), Reviews of Modern Physics 83, 195 (Solar Fusion II): S-factors. C. Angulo and colleagues (1999),
            Nuclear Physics A 656, 3: NACRE. G. R. Caughlan and W. A. Fowler (1988), Atomic Data and Nuclear Data Tables 40, 283, as coded by F.
            X. Timmes in AMReX Microphysics: triple-alpha, carbon, neon, oxygen and silicon burning. R. J. deBoer and colleagues (2017), Reviews
            of Modern Physics 89, 035007: ¹²C(α,γ)¹⁶O. M. Asplund and colleagues (2009), Annual Review of Astronomy and Astrophysics 47, 481: the
            Sun’s carbon, nitrogen and oxygen. F. Hoyle (1954), The Astrophysical Journal Supplement Series 1, 121, and D. N. F. Dunbar and
            colleagues (1953), Physical Review 92, 649: the Hoyle state. C. W. Cook, W. A. Fowler, C. C. Lauritsen and T. Lauritsen (1957),
            Physical Review 107, 508: carbon from beryllium-8. E. E. Salpeter (1952), The Astrophysical Journal 115, 326: helium burning. S. E.
            Woosley, A. Heger and T. A. Weaver (2002), Reviews of Modern Physics 74, 1015, and S. E. Woosley’s lecture notes (UC Santa Cruz,
            2019): the late burning stages. D. D. Clayton (1968), <i>Principles of Stellar Evolution and Nucleosynthesis</i>: pair neutrinos. B.
            Paxton and colleagues (2011), as above: how codes differ. Borexino Collaboration (2014), Nature 512, 383, and (2020), Nature 587, 577:
            the Sun’s pp and CNO neutrinos. A. Formicola and colleagues (2004), Physics Letters B 591, 61: LUNA’s ¹⁴N + p.
          </li>
          <li>
            C. F. von Weizsäcker (1935), Zeitschrift für Physik 96, 431, and H. A. Bethe and R. F. Bacher (1936), Reviews of Modern Physics 8, 82:
            the liquid drop. M. Goeppert Mayer (1949), Physical Review 75, 1969, and O. Haxel, J. H. D. Jensen and H. E. Suess (1949), Physical
            Review 75, 1766: the shell model. W. D. Myers and W. J. Swiatecki (1966), Nuclear Physics 81, 1: the shell correction’s form. F. G.
            Kondev and colleagues (2021), Chinese Physics C 45, 030001 (NUBASE2020), and W. J. Huang, M. Wang and colleagues (2021), Chinese
            Physics C 45, 030002–3 (AME2020): masses and half-lives. P. W. Merrill (1952), The Astrophysical Journal 116, 21: technetium in
            stars. E. M. Burbidge, G. R. Burbidge, W. A. Fowler and F. Hoyle (1957), Reviews of Modern Physics 29, 547, and A. G. W. Cameron
            (1957), Chalk River report CRL-41: the making of the elements. D. D. Clayton, W. A. Fowler, T. E. Hull and B. A. Zimmerman (1961),
            Annals of Physics 12, 331, and P. A. Seeger, W. A. Fowler and D. D. Clayton (1965), The Astrophysical Journal Supplement Series 11,
            121: σN and the spread of exposures. F. Käppeler, R. Gallino, S. Bisterzo and W. Aoki (2011), Reviews of Modern Physics 83, 157: the
            s-process. K.-L. Kratz and colleagues (1993), The Astrophysical Journal 403, 216: the waiting-point approximation. N. Prantzos, C.
            Abia, S. Cristallo, M. Limongi and A. Chieffi (2020), Monthly Notices of the Royal Astronomical Society 491, 1832: the s- and r-shares
            of the Sun’s isotopes, with K. Lodders, H. Palme and H.-P. Gail’s (2009) abundances. M. Asplund, A. M. Amarsi and N. Grevesse (2021),
            Astronomy and Astrophysics 653, A141: the Sun’s abundances. J. A. Johnson (2019), Science 363, 474: the elements’ origins. H.
            Reeves, W. A. Fowler and F. Hoyle (1970), Nature 226, 727: cosmic rays. D. Kasen, N. R. Badnell and J. Barnes (2013), The
            Astrophysical Journal 774, 25: the kilonova’s colour. D. Watson and colleagues (2019), Nature 574, 497: strontium. A. J. Levan and
            colleagues (2024), Nature 626, 737: tellurium. D. M. Siegel, J. Barnes and B. D. Metzger (2019), Nature 569, 241: collapsars. A.
            Patel, B. D. Metzger and colleagues (2025), The Astrophysical Journal Letters (arXiv:2501.09181): a magnetar’s flare. A. P. Ji, A. Frebel, A.
            Chiti and J. D. Simon (2016), Nature 531, 610: Reticulum II.
          </li>
          <li>
            R. H. Fowler (1926), Monthly Notices of the Royal Astronomical Society 87, 114: dense matter. S. Chandrasekhar (1931), The
            Astrophysical Journal 74, 81, and (1939), An Introduction to the Study of Stellar Structure: the limit. M. Nauenberg (1972), The
            Astrophysical Journal 175, 417: the mass–radius fit. L. Mestel (1952), Monthly Notices of the Royal Astronomical Society 112, 583:
            cooling. H. M. Van Horn (1968), The Astrophysical Journal 151, 227: crystallisation’s heat. H. E. Bond and colleagues (2015, 2017),
            The Astrophysical Journal 813, 106, 840, 70 and 848, 16, B. D. Mason and colleagues (2017), and A. D. Romero and colleagues (2019),
            Monthly Notices of the Royal Astronomical Society 484, 2711: Procyon B, Sirius B and 40 Eridani B. I. Caiazzo and colleagues (2021),
            Nature 595, 39: ZTF J1901+1458. P.-E. Tremblay and colleagues (2019), Nature 565, 202: Gaia’s pile-up. S. Cheng, J. D. Cummings and
            B. Ménard (2019), The Astrophysical Journal 886, 100, and A. Bédard and colleagues (2024), Nature 627, 286: the Q branch.
          </li>
          <li>
            H.-T. Janka, T. Zwerger and R. Mönchmeyer (1993), Astronomy and Astrophysics 268, 360, and H. Dimmelmeier, J. A. Font and E. Müller
            (2002), Astronomy and Astrophysics 388, 917: the hybrid equation of state. H.-T. Janka (2001), Astronomy and Astrophysics 368, 527:
            neutrino heating and cooling. S. A. Colgate and R. H. White (1966), The Astrophysical Journal 143, 626, and H. A. Bethe and J. R.
            Wilson (1985), The Astrophysical Journal 295, 14: neutrino-driven explosions. A. Burrows and D. Vartanyan (2021), Nature 589, 29:
            explosions in three dimensions. R. Minkowski (1941), Publications of the Astronomical Society of the Pacific 53, 224: the types. W. D.
            Arnett (1982), The Astrophysical Journal 253, 785: radioactive light curves. A. Clocchiatti and J. C. Wheeler (1997), The
            Astrophysical Journal 491, 375: γ-ray escape. B. Katz, D. Kushnir and S. Dong (2013), arXiv:1301.6766: the integral. D. V. Popov
            (1993), The Astrophysical Journal 414, 712, and D. Kasen and S. E. Woosley (2009), The Astrophysical Journal 703, 2205: plateaus. R.
            Pereira and colleagues (2013), Astronomy and Astrophysics 554, A27: SN 2011fe. F. Taddia and colleagues (2012), Astronomy and
            Astrophysics 537, A140, and P. Bouchet and colleagues (1991), Astronomy and Astrophysics 245, 490: SN 1987A’s light. M. M. Phillips
            (1993), The Astrophysical Journal Letters 413, L105: the width–luminosity relation. J. Whelan and I. Iben (1973), I. Iben and A. V.
            Tutukov (1984) and R. F. Webbink (1984): Type Ia progenitors. P. Das and colleagues (2025), Nature Astronomy 9, 1356: SNR 0509−67.5.
            C. Fransson and colleagues (2024), Science 383, 898: SN 1987A’s neutron star. W. A. Fowler and F. Hoyle (1964), The Astrophysical
            Journal Supplement Series 9, 201, and Z. Barkat, G. Rakavy and N. Sack (1967), Physical Review Letters 18, 379: pair instability.
            A. Heger and S. E. Woosley (2002), The Astrophysical Journal 567, 532, and S. E. Woosley (2017), The Astrophysical Journal 836, 244:
            its outcomes. S. Schulze and colleagues (2024), Astronomy and Astrophysics 683, A223: SN 2018ibb.
          </li>
          <li>
            W. Baade and F. Zwicky (1934), Proceedings of the National Academy of Sciences 20, 254: neutron stars. R. C. Tolman (1939), Physical
            Review 55, 364, and J. R. Oppenheimer and G. M. Volkoff (1939), Physical Review 55, 374: the TOV equation. J. S. Read, B. D. Lackey,
            B. J. Owen and J. L. Friedman (2009), Physical Review D 79, 124032: piecewise-polytrope equations of state. F. Douchin and P. Haensel
            (2001), Astronomy and Astrophysics 380, 151: SLy. P. B. Demorest and colleagues (2010), Nature 467, 1081; J. Antoniadis and colleagues
            (2013), Science 340, 1233232; E. Fonseca and colleagues (2021), The Astrophysical Journal Letters 915, L12; R. W. Romani and
            colleagues (2022), The Astrophysical Journal Letters 934, L17: heavy neutron stars. T. E. Riley and colleagues (2019, 2021) and M. C.
            Miller and colleagues (2019, 2021), The Astrophysical Journal Letters 887, L21 and L24, and 918, L27 and L28; D. Choudhury and
            colleagues (2024), The Astrophysical Journal Letters 971, L20: NICER’s radii. LIGO Scientific and Virgo Collaborations (2018),
            Physical Review Letters 121, 161101: GW170817’s radius. J. M. Lattimer and M. Prakash (2007), Physics Reports 442, 109: the causality
            limit.
          </li>
          <li>
            A. Hewish, S. J. Bell and colleagues (1968), Nature 217, 709: the first pulsar. F. Pacini (1967), Nature 216, 567, and T. Gold
            (1968), Nature 218, 731: spinning neutron stars. A. G. Lyne and colleagues (2015), Monthly Notices of the Royal Astronomical Society
            446, 857: the Crab’s braking index. J. M. Rankin (1983, 1993), The Astrophysical Journal 274, 333 and 405, 285: cores and cones. D. C.
            Backer and colleagues (1982), Nature 300, 615: the first millisecond pulsar. M. A. Alpar and colleagues (1982), Nature 300, 728, and
            V. Radhakrishnan and G. Srinivasan (1982), Current Science 51, 1096: recycling. D. Bhattacharya and colleagues (1992), Astronomy and
            Astrophysics 254, 198: the death line. A. M. Archibald and colleagues (2009), Science 324, 1411: PSR J1023+0038. J. W. T. Hessels and
            colleagues (2006), Science 311, 1901: the fastest pulsar. R. C. Duncan and C. Thompson (1992), The Astrophysical Journal Letters 392,
            L9, and C. Kouveliotou and colleagues (1998), Nature 393, 235: magnetars. CHIME/FRB Collaboration (2020) and C. D. Bochenek and
            colleagues (2020), Nature 587, 54 and 59: a fast radio burst from a magnetar. G. Agazie and colleagues (2023), The Astrophysical
            Journal Letters 951, L8: the nanohertz background. R. N. Manchester, G. B. Hobbs, A. Teoh and M. Hobbs (2005), The Astronomical
            Journal 129, 1993: the ATNF Pulsar Catalogue (its count of pulsars only). Each famous pulsar’s period and slowing come from the
            paper named on its card in Figure 26.4.
          </li>
          <li>
            J. Michell (1784), Philosophical Transactions of the Royal Society 74, 35: dark stars. K. Schwarzschild (1916), Sitzungsberichte der
            Königlich Preussischen Akademie der Wissenschaften, 189: the solution. F. W. Dyson, A. S. Eddington and C. Davidson (1920),
            Philosophical Transactions of the Royal Society A 220, 291: light bending. J. M. Bardeen, W. H. Press and S. A. Teukolsky (1972), The
            Astrophysical Journal 178, 347: orbits round a spinning black hole. N. I. Shakura and R. A. Sunyaev (1973), Astronomy and Astrophysics
            24, 337: thin discs. K. S. Thorne (1974), The Astrophysical Journal 191, 507: the spin limit. S. A. Balbus and J. F. Hawley (1991), The
            Astrophysical Journal 376, 214: the disc’s friction. R. D. Blandford and R. L. Znajek (1977), Monthly Notices of the Royal
            Astronomical Society 179, 433: jets. J. C. A. Miller-Jones and colleagues (2021), Science 371, 1046: Cygnus X-1. M. Schmidt (1963),
            Nature 197, 1040: 3C 273. Event Horizon Telescope Collaboration (2019, 2022), The Astrophysical Journal Letters 875, L1 and 930, L12:
            M87* and Sagittarius A*. GRAVITY Collaboration (2020), Astronomy and Astrophysics 636, L5: S2’s precession. B. C. Carlson (1995),
            Numerical Algorithms 10, 13: elliptic integrals.
          </li>
          <li>
            É. Roche (1849), Mémoires de l’Académie des sciences et lettres de Montpellier: the shapes of bodies held by two masses. Z. Kopal
            (1959), Close Binary Systems (Chapman &amp; Hall). P. P. Eggleton (1983), The Astrophysical Journal 268, 368: the Roche lobe’s
            radius. S. H. Lubow and F. H. Shu (1975), The Astrophysical Journal 198, 383, and R. K. Ulrich and H. L. Burger (1976), The
            Astrophysical Journal 206, 509: the stream and its closest approach. J. R. Hurley, C. A. Tout and O. R. Pols (2002), Monthly Notices
            of the Royal Astronomical Society 329, 897: BSE. R. F. Webbink (1984), The Astrophysical Journal 277, 355: the common envelope’s
            energy. B. Paczyński (1976), in Structure and Evolution of Close Binary Systems, IAU Symposium 73, 75: the common envelope. M. S.
            Hjellming and R. F. Webbink (1987), The Astrophysical Journal 318, 794: giants’ stability. J. A. Crawford (1955), The Astrophysical
            Journal 121, 71, and R. Kippenhahn and A. Weigert (1967), Zeitschrift für Astrophysik 65, 251: the Algol paradox. F. Baron and
            colleagues (2012), The Astrophysical Journal 752, 20: Algol’s stars. H. Sana and colleagues (2012), Science 337, 444: O stars’
            companions. P. Hut (1981), Astronomy and Astrophysics 99, 126, and J.-P. Zahn (1977), Astronomy and Astrophysics 57, 383: tides.
            S. Rappaport, F. Verbunt and P. C. Joss (1983), The Astrophysical Journal 275, 713: magnetic braking. P. C. Peters (1964), Physical
            Review 136, B1224: merging by gravitational waves. A. Sandage (1953), The Astronomical Journal 58, 61, W. H. McCrea (1964), Monthly
            Notices of the Royal Astronomical Society 128, 147, and R. D. Mathieu and A. M. Geller (2009), Nature 462, 1032: blue stragglers. R.
            Tylenda and colleagues (2011), Astronomy and Astrophysics 528, A114: V1309 Scorpii. L. A. Molnar and colleagues (2017), The
            Astrophysical Journal 840, 1, and Q. J. Socia and colleagues (2018), The Astrophysical Journal Letters 864, L32: KIC 9832227. M. R.
            Drout and colleagues (2023), Science 382, 1287: stripped stars. K. B. Burdge and colleagues (2019), Nature 571, 528: ZTF J1539+5027.
          </li>
          <li>
            A. Einstein (1916, 1918), Sitzungsberichte der Preußischen Akademie der Wissenschaften: gravitational waves and the quadrupole
            formula. P. C. Peters and J. Mathews (1963), Physical Review 131, 435, and P. C. Peters (1964), Physical Review 136, B1224: the orbit’s
            decay. R. A. Hulse and J. H. Taylor (1975), The Astrophysical Journal Letters 195, L51: the binary pulsar. J. H. Taylor, L. A. Fowler
            and P. M. McCulloch (1979), Nature 277, 437, and J. M. Weisberg and Y. Huang (2016), The Astrophysical Journal 829, 55: its decay
            measured. M. Burgay and colleagues (2003), Nature 426, 531, A. G. Lyne and colleagues (2004), Science 303, 1153, and M. Kramer and
            colleagues (2021), Physical Review X 11, 041050: the double pulsar. B. P. Abbott and colleagues (2016), Physical Review Letters 116,
            061102: GW150914; (2017), Physical Review Letters 119, 161101: GW170817; (2019), Physical Review X 9, 031040: GWTC-1. The LIGO,
            Virgo and KAGRA Collaborations (2025), Physical Review Letters 135: GW250114; (2025), arXiv:2507.08219: GW231123; (2026),
            arXiv:2605.27225: GWTC-5.0. M. Boyle and colleagues (2007), Physical Review D 76, 124038, and A. Buonanno, B. R. Iyer, E. Ochsner,
            Y. Pan and B. S. Sathyaprakash (2009), Physical Review D 80, 084043: the inspiral to 3.5 post-Newtonian order. E. Berti, V. Cardoso
            and C. M. Will (2006), Physical Review D 73, 064030: black holes’ ringing. E. Barausse, V. Morozova and L. Rezzolla (2012), The
            Astrophysical Journal 758, 63, and L. Rezzolla and colleagues (2008), The Astrophysical Journal Letters 674, L29: the black hole left.
            F. Pretorius (2005), Physical Review Letters 95, 121101: numerical relativity’s first merger. B. S. Sathyaprakash and B. F. Schutz
            (2009), Living Reviews in Relativity 12, 2: Advanced LIGO’s noise. T. Robson, N. J. Cornish and C. Liu (2019), Classical and Quantum
            Gravity 36, 105011: LISA’s noise. C. J. Moore, R. H. Cole and C. P. L. Berry (2015), Classical and Quantum Gravity 32, 015014: the
            sensitivity picture. G. Agazie and colleagues (2023), The Astrophysical Journal Letters 951, L8: the nanohertz background. S. W.
            Hawking (1971), Physical Review Letters 26, 1344: the area theorem.
          </li>
          <li>
            H. C. Plummer (1911), Monthly Notices of the Royal Astronomical Society 71, 460: the Plummer sphere. S. J. Aarseth, M. Hénon and R.
            Wielen (1974), Astronomy and Astrophysics 37, 183: sampling it. J. Makino and S. J. Aarseth (1992), Publications of the Astronomical
            Society of Japan 44, 141: the Hermite scheme with block steps. S. J. Aarseth (2003), Gravitational N-Body Simulations (Cambridge
            University Press). L. Spitzer (1987), Dynamical Evolution of Globular Clusters (Princeton University Press): relaxation. J.
            Binney and S. Tremaine (2008), Galactic Dynamics (Princeton University Press): Hill’s tide and the winding problem. D.
            Lynden-Bell and R. Wood (1968), Monthly Notices of the Royal Astronomical Society 138, 495: the gravothermal catastrophe. P. Kroupa
            (2001), Monthly Notices of the Royal Astronomical Society 322, 231: the mass function. E. Holmberg (1941), The Astrophysical Journal
            94, 385: galaxies of light bulbs. M. Odenkirchen and colleagues (2001), The Astrophysical Journal Letters 548, L165: Palomar 5’s tails.
            S. Röser and colleagues (2019), Astronomy and Astrophysics 621, L2, and S. Meingast and J. Alves (2019), Astronomy and Astrophysics
            621, L3: the Hyades’ tails. H. J. G. L. M. Lamers and colleagues (2005), Astronomy and Astrophysics 441, 117: clusters’ dissolution.
            J. Bland-Hawthorn and O. Gerhard (2016), Annual Review of Astronomy and Astrophysics 54, 529: the Galaxy’s structure. P. J. McMillan
            (2017), Monthly Notices of the Royal Astronomical Society 465, 76: its mass model. A. Helmi and colleagues (2018), Nature 563, 85,
            and V. Belokurov and colleagues (2018), Monthly Notices of the Royal Astronomical Society 478, 611: Gaia–Enceladus. R. A. Ibata, G.
            Gilmore and M. J. Irwin (1994), Nature 370, 194: the Sagittarius dwarf. V. C. Rubin and W. K. Ford (1970), The Astrophysical Journal
            159, 379, A. Bosma (1978, thesis), and T. S. van Albada and colleagues (1985), The Astrophysical Journal 295, 305: rotation curves.
            F. Zwicky (1933), Helvetica Physica Acta 6, 110. J. P. Ostriker and P. J. E. Peebles (1973), The Astrophysical Journal 186, 467. M.
            Milgrom (1983), The Astrophysical Journal 270, 365: MOND. K. C. Freeman (1970), The Astrophysical Journal 160, 811: exponential discs.
            L. Hernquist (1990), The Astrophysical Journal 356, 359. J. F. Navarro, C. S. Frenk and S. D. M. White (1996), The Astrophysical
            Journal 462, 563, and A. A. Dutton and A. V. Macciò (2014), Monthly Notices of the Royal Astronomical Society 441, 3359: dark halos.
            F. Lelli, S. S. McGaugh and J. M. Schombert (2016), The Astronomical Journal 152, 157: SPARC. A.-C. Eilers, D. W. Hogg, H.-W. Rix and
            M. K. Ness (2019), The Astrophysical Journal 871, 120, X. Ou, A.-C. Eilers, L. Necib and A. Frebel (2024), Monthly Notices of the
            Royal Astronomical Society 528, 693, and Y. Jiao and colleagues (2023), Astronomy and Astrophysics 678, A208: the Milky Way’s curve.
            C. C. Lin and F. H. Shu (1964), The Astrophysical Journal 140, 646: density waves. A. J. Kalnajs (1973), Proceedings of the
            Astronomical Society of Australia 2, 174: kinematic spirals. J. A. Sellwood and R. G. Carlberg (1984), The Astrophysical Journal 282,
            61: transient arms. B. Balick and R. L. Brown (1974), The Astrophysical Journal 194, 265: Sagittarius A*. GRAVITY Collaboration
            (2018), Astronomy and Astrophysics 615, L15: S2’s redshift; (2020), Astronomy and Astrophysics 636, L5: its precession and orbit.
          </li>
          <li>
            A. Toomre and J. Toomre (1972), The Astrophysical Journal 178, 623: galactic bridges and tails. R. Lynds and A. Toomre (1976), The
            Astrophysical Journal 209, 382: ring galaxies. A. Toomre (1977), in The Evolution of Galaxies and Stellar Populations (Yale University
            Observatory), 401: mergers and ellipticals. H. Arp (1966), Atlas of Peculiar Galaxies, The Astrophysical Journal Supplement 14, 1. S.
            Chandrasekhar (1943), The Astrophysical Journal 97, 255: dynamical friction. B. C. Whitmore and F. Schweizer (1995), The Astronomical
            Journal 109, 960: the Antennae’s young clusters. V. M. Slipher (1913), Lowell Observatory Bulletin 1, 56: Andromeda’s approach. R. P.
            van der Marel and colleagues (2012), The Astrophysical Journal 753, 8 and 9: Andromeda’s velocity and the collision foretold. T. Salomon
            and colleagues (2021), Monthly Notices of the Royal Astronomical Society 507, 2592: its motion from Gaia. T. Sawala and colleagues
            (2025), Nature Astronomy 9, 1206: the Local Group’s futures, and their code (github.com/TillSawala/MW-M31). H. Wu, Y. Huang, H. Zhang,
            G. Sun and S. Shao (2026), The Astrophysical Journal Letters (arXiv:2603.22863), and H. Wu and colleagues (2025), Astronomy and
            Astrophysics 701, A265: Andromeda’s and M33’s motions corrected. A. R. Zentner and J. S. Bullock (2003), The Astrophysical Journal
            598, 49: a halo’s velocity spread. P. Jethwa, D. Erkal and V. Belokurov (2016), Monthly Notices of the Royal Astronomical Society 461,
            2212: the Coulomb logarithm. Planck Collaboration (2020), Astronomy and Astrophysics 641, A6: the critical density. Astropy
            Collaboration (2022), The Astrophysical Journal 935, 167: the Galactocentric frame. C. K. Seyfert (1943), The Astrophysical Journal
            97, 28. M. Schmidt (1963), Nature 197, 1040: 3C 273. E. E. Salpeter (1964), The Astrophysical Journal 140, 796, and Ya. B. Zel’dovich
            (1964), Soviet Physics Doklady 9, 195: accretion. D. Lynden-Bell (1969), Nature 223, 690: dead quasars. L. Ferrarese and D. Merritt
            (2000), The Astrophysical Journal Letters 539, L9, and K. Gebhardt and colleagues (2000), The Astrophysical Journal Letters 539, L13.
            GRAVITY Collaboration (2018), Nature 563, 657: 3C 273’s black hole. G. Lemaître (1927), Annales de la Société Scientifique de
            Bruxelles A47, 49, and E. Hubble (1929), Proceedings of the National Academy of Sciences 15, 168: redshift and distance.
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
            <b>Stars weighed in pairs:</b> DEBCat, by John Southworth (Keele University), in the copy kept by VizieR (CDS, Strasbourg, catalogue
            V/152, version of 2017), used with the citation it asks for. <b>The Sun’s insides:</b> Model S, published by Jørgen
            Christensen-Dalsgaard (Aarhus University).
          </li>
          <li>
            <b>Sunspot numbers:</b> Source: WDC-SILSO, Royal Observatory of Belgium, Brussels. SILSO’s data are shared under the{' '}
            <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noreferrer">
              Creative Commons Attribution-NonCommercial 4.0
            </a>{' '}
            licence, and so is this course’s file made from them, kept in a folder of its own. <b>The butterfly diagram:</b> the Royal Greenwich
            Observatory’s and USAF/NOAA’s sunspot records, compiled by David Hathaway.
          </li>
          <li>
            <b>Stellar evolution:</b> SSE by Jarrod Hurley, Onno Pols and Christopher Tout, and BSE by Jarrod Hurley, Christopher Tout and Onno
            Pols, ported to TypeScript from the distributions AMUSE keeps (src/amuse_sse/src and src/amuse_bse/src), and tested against the
            original code; the Fortran itself isn’t part of the site. <b>Young stars and brown
            dwarfs:</b> BHAC15, from Isabelle Baraffe’s page, used with the citation it asks for.
          </li>
          <li>
            <b>Star clusters:</b> the members of six clusters, chosen from Gaia Data Release 3 (ESA/Gaia/DPAC) by this course, shared under the
            same Creative Commons Attribution-NonCommercial 3.0 IGO licence in the same folder as the HR diagram’s file. <b>Leavitt’s
            Cepheids:</b> her 1912 table, in the public domain, read from the scan in NASA’s Astrophysics Data System.
          </li>
          <li>
            <b>Exoplanets:</b> the census of confirmed planets from the NASA Exoplanet Archive’s composite table. This research has made use of
            the NASA Exoplanet Archive, which is operated by the California Institute of Technology, under contract with the National
            Aeronautics and Space Administration under the Exoplanet Exploration Program (Christiansen and colleagues 2025, The Planetary
            Science Journal).
          </li>
          <li>
            <b>The nearest stars:</b> the stars within 10 parsecs, cut from the same HYG database and shared under the same Creative Commons
            Attribution-ShareAlike 4.0 licence, in a file of their own.
          </li>
          <li>
            <b>Rotation curves:</b> five galaxies’ curves and mass models from SPARC (F. Lelli, S. S. McGaugh and J. M. Schombert 2016, The
            Astronomical Journal 152, 157), used with that citation as SPARC asks, in a folder of their own; the Milky Way’s from the tables of
            Eilers and colleagues (2019) and Ou and colleagues (2024).
          </li>
          <li>
            <b>Gravitational waves:</b> the merger catalogue and GW150914’s strain from the Gravitational Wave Open Science Center (GWOSC), shared
            under the{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
              Creative Commons Attribution 4.0
            </a>{' '}
            licence, as are this course’s files made from them, kept in a folder of their own (the strain whitened and band-passed; see its
            README). The LIGO, Virgo and KAGRA Collaborations, “Open Data from LIGO, Virgo, and KAGRA through the Second Part of the Fourth
            Observing Run”, arXiv:2605.27090, and R. Abbott and colleagues (2021), “Open data from the first and second observing runs of
            Advanced LIGO and Advanced Virgo”, SoftwareX 13, 100658. This research has made use of data or software obtained from the
            Gravitational Wave Open Science Center (gwosc.org), a service of the LIGO Scientific Collaboration, the Virgo Collaboration, and
            KAGRA. This material is based upon work supported by NSF’s LIGO Laboratory which is a major facility fully funded by the National
            Science Foundation, as well as the Science and Technology Facilities Council (STFC) of the United Kingdom, the Max-Planck-Society
            (MPS), and the State of Niedersachsen/Germany for support of the construction of Advanced LIGO and construction and operation of the
            GEO600 detector. Additional support for Advanced LIGO was provided by the Australian Research Council. Virgo is funded, through the
            European Gravitational Observatory (EGO), by the French Centre National de Recherche Scientifique (CNRS), the Italian Istituto
            Nazionale di Fisica Nucleare (INFN) and the Dutch Nikhef, with contributions by institutions from Belgium, Germany, Greece, Hungary,
            Ireland, Japan, Monaco, Poland, Portugal, Spain. KAGRA is supported by Ministry of Education, Culture, Sports, Science and Technology
            (MEXT), Japan Society for the Promotion of Science (JSPS) in Japan; National Research Foundation (NRF) and Ministry of Science and
            ICT (MSIT) in Korea; Academia Sinica (AS) and National Science and Technology Council (NSTC) in Taiwan.
          </li>
          <li>
            <b>Nuclides:</b> the ground states of every known nucleus from the IAEA’s LiveChart of Nuclides (IAEA Nuclear Data Section), with
            ENSDF’s half-lives and decays and NUBASE2020’s and AME2020’s masses, adapted for teaching as the IAEA allows, with this
            acknowledgement. <b>Neutron-capture cross sections:</b> KADoNiS v0.3, the Karlsruhe Astrophysical Database of Nucleosynthesis in
            Stars (I. Dillmann and colleagues), used with the citation it asks for.
          </li>
          <li>
            <b>The elements’ origins:</b> Jennifer Johnson’s periodic table of the origins of the elements (Ohio State University), as read off
            her figure by C. M. G. Lee (Wikimedia Commons), both shared under the{' '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
              Creative Commons Attribution-ShareAlike 4.0
            </a>{' '}
            licence, and so is this course’s file made from them, kept in a folder of its own.
          </li>
          <li>
            <b>Pulsars:</b> the periods and spin-down rates of about sixty famous pulsars, each from the paper that found or timed it. The ATNF
            Pulsar Catalogue (Manchester and colleagues 2005;{' '}
            <a href="https://www.atnf.csiro.au/research/pulsar/psrcat/" target="_blank" rel="noreferrer">
              atnf.csiro.au
            </a>
            ) is the source for how many pulsars are known; its data aren’t shipped with this course. <b>Neutron-star equations of state:</b>{' '}
            Read and colleagues’ (2009) published fits.
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
