import Intro from '../../content/intro.mdx';
import { CHAPTERS, LABS, PARTS } from '../course';
import { Term } from '../content/Term';
import { mdxComponents } from '../content/mdxComponents';
import { useReadChapters } from '../progress';
import { href } from '../router';
import { LabCard, PartCard } from './CourseCards';
import { SampleCheck } from './SampleCheck';
import contentStyles from '../content/content.module.css';
import styles from './pages.module.css';

export function Landing() {
  const read = useReadChapters();
  const next = CHAPTERS.find((c) => c.load && !read.includes(c.slug));

  return (
    <article className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>An interactive course</p>
        <h1 className={styles.heroTitle}>The Clockwork Sky</h1>
        <p className={styles.lede}>
          Astronomy and astrophysics from the ground up: from the sky you can see with your own eyes to the physics inside the stars.
        </p>
      </header>

      <div className={contentStyles.prose}>
        <Intro components={mdxComponents} />
      </div>

      <p>
        {next ? (
          <a href={href(next.slug)} className={styles.cta}>
            {read.length === 0 ? 'Start reading' : 'Continue'}: Chapter {next.number} →
          </a>
        ) : (
          <a href={href('part-1')} className={styles.cta}>
            See what Part I covers →
          </a>
        )}
      </p>

      <h2 className={styles.sectionTitle}>Three parts, one step at a time</h2>
      <ol className={styles.cards}>
        {PARTS.map((part) => (
          <li key={part.slug}>
            <PartCard part={part} />
          </li>
        ))}
      </ol>

      <h2 className={styles.sectionTitle}>Two labs</h2>
      <ul className={styles.cards}>
        {LABS.map((lab) => (
          <li key={lab.slug}>
            <LabCard lab={lab} />
          </li>
        ))}
      </ul>
      <p className={styles.after}>
        A <a href={href('toolkit')}>Toolkit</a> of short refreshers covers the maths where the chapters need it, and the{' '}
        <a href={href('glossary')}>Glossary</a> explains every term.
      </p>

      <h2 className={styles.sectionTitle}>How the course works</h2>
      <div className={contentStyles.prose}>
        <ul>
          <li>Each chapter says which earlier chapters it builds on. Nothing is locked: you can start anywhere.</li>
          <li>
            The figures run real physics in your browser, not canned animations. Each has a <b>Try this</b> prompt and a <b>Reset</b> button,
            and a <b>Not to scale</b> tag whenever it has to exaggerate sizes or angles to fit the screen.
          </li>
          <li>
            Words with a dotted underline, like <Term id="zenith">zenith</Term>, have a short definition: hover over them or tap them.
          </li>
          <li>
            Every chapter ends with a short <b>Check yourself</b>. The wrong answers are the mistakes people really make, and each one is
            explained. Your answers and your reading progress stay in this browser; nothing is sent anywhere.
          </li>
        </ul>
      </div>
      <SampleCheck />
    </article>
  );
}
