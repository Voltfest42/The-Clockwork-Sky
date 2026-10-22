import contentStyles from '../content/content.module.css';
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
          values it was fitted to. As the chapters arrive, the positions of the Sun, Moon and planets will be checked against NASA JPL’s
          Horizons system, and eclipses against NASA’s eclipse lists. End-to-end tests open every page, use it by keyboard, and run
          accessibility checks (WCAG 2.1 AA) in light and dark mode and on a phone-sized screen.
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
        </ul>

        <h2>Sources</h2>
        <ul>
          <li>Jean Meeus, Astronomical Algorithms, 2nd edition (Willmann-Bell, 1998): calendars, Julian Dates, sidereal time, coordinate conversions.</li>
          <li>
            Fred Espenak and Jean Meeus, Five Millennium Canon of Solar Eclipses: −1999 to +3000 (NASA/TP-2006-214141, 2006), and the values of
            ΔT behind it from L. V. Morrison and F. R. Stephenson (2004).
          </li>
          <li>The International Earth Rotation and Reference Systems Service (IERS) and the US Naval Observatory: measured values of ΔT.</li>
          <li>S. Aoki and colleagues (1982), Astronomy and Astrophysics 105, 359: the IAU 1982 expression for sidereal time.</li>
          <li>J. Laskar (1986), Astronomy and Astrophysics 157, 59: the long-term formula for the tilt of Earth’s axis.</li>
          <li>
            International Astronomical Union, Resolutions B2 of 2012 (the astronomical unit) and B2 and B3 of 2015 (the parsec and the nominal
            values for the Sun and Earth).
          </li>
        </ul>
        <p>
          The research notes behind the course, with a source for every number, are in the project’s <code>docs/</code> folder.
        </p>

        <h2>Data and credits</h2>
        <p>
          No outside data files are used yet. Star catalogues, constellation figures, planetary elements and eclipse lists arrive with Part I’s
          chapters, and each will be credited here with its licence.
        </p>

        <h2>Built with</h2>
        <p>
          TypeScript, React and Vite, with the chapter text in MDX. The physics is written from scratch for this course. It is hosted as a
          static site on Amazon S3 and CloudFront. There’s no server, no tracking and no cookies. The only things stored are your reading
          progress and your Check yourself answers, in your own browser.
        </p>
      </div>
    </article>
  );
}
