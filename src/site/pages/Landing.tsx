import type { ReactNode } from 'react';
import Intro from '../../content/intro.mdx';
import { CHAPTERS, LABS, PARTS, chaptersOf } from '../course';
import { Term } from '../content/Term';
import { mdxComponents } from '../content/mdxComponents';
import { useReadChapters } from '../progress';
import { href } from '../router';
import { LabCard, PartCard } from './CourseCards';
import { ZoomLevels } from './ZoomLevels';
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
            {read.length === 0 ? 'Start reading' : 'Continue'}: Chapter {next.number}, {next.title} →
          </a>
        ) : (
          <a href={href('part-1')} className={styles.cta}>
            See what Part I covers →
          </a>
        )}
      </p>

      <h2 className={styles.sectionTitle}>Three parts, three zoom levels</h2>
      <div className={contentStyles.prose}>
        <p>
          The course climbs in scope and depth together. Each part looks at the universe at a different scale, and asks for a little more maths than
          the one before.
        </p>
      </div>
      <ZoomLevels list={false} />
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

      <h2 className={styles.sectionTitle}>How to use the figures</h2>
      <div className={contentStyles.prose}>
        <p>
          Every chapter is built around live figures. They run real physics in your browser, not canned animations, so you can poke them. Thirty
          seconds of instructions:
        </p>
      </div>
      <ul className={styles.howTo}>
        <HowTo icon={<DragIcon />} title="Drag and zoom">
          Drag a 3D view to turn it; pinch, or click it and scroll, to zoom. Every control also works from the keyboard.
        </HowTo>
        <HowTo icon={<ScrubIcon />} title="Scrub time">
          Sliders move a figure through time, or through a zoom. Drag them, or use the arrow keys.
        </HowTo>
        <HowTo icon={<StepIcon />} title="Play and step">
          Press play to run a figure, or step it one move at a time. Nothing plays by itself.
        </HowTo>
        <HowTo icon={<ResetIcon />} title="Reset">
          Lost? The <b>Reset</b> button in a figure’s corner puts it back as it started.
        </HowTo>
        <HowTo icon={<TryIcon />} title="Try this">
          Under each figure, a short <b>Try this</b> suggests something to find. It’s the quickest way in.
        </HowTo>
        <HowTo icon={<ScaleIcon />} title="Not to scale">
          Space is too big for screens. When a figure has to exaggerate sizes or angles, a <b>Not to scale</b> tag says so, and a{' '}
          <i>What’s simplified here?</i> note says how.
        </HowTo>
      </ul>
      <div className={contentStyles.prose}>
        <p>
          Words with a dotted underline, like <Term id="zenith">zenith</Term>, have a short definition: hover over them or tap them. Every chapter
          says which earlier chapters it builds on, and ends with a short <b>Check yourself</b>, where the wrong answers are the mistakes people
          really make. Your answers and reading progress stay in this browser; nothing is sent anywhere.
        </p>
      </div>

      <h2 className={styles.sectionTitle}>Where to start</h2>
      <ul className={styles.startList}>
        {PARTS.map((part) => {
          const first = chaptersOf(part.number)[0];
          return (
            <li key={part.slug}>
              <span className={styles.startWho}>{part.startHere.replace(/^Start here /, '').replace(/^if/, 'If')}</span>
              {first.load ? (
                <a href={href(first.slug)}>
                  Start with Chapter {first.number}, {first.title} →
                </a>
              ) : (
                <a href={href(part.slug)}>
                  Start with Part {part.numeral}, {part.title} →
                </a>
              )}
            </li>
          );
        })}
      </ul>
      <p className={styles.after}>Nothing is locked: you can jump in anywhere, and each chapter links back to what it needs.</p>
    </article>
  );
}

function HowTo({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className={styles.howToItem}>
      <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" className={styles.howToIcon}>
        {icon}
      </svg>
      <span>
        <b className={styles.howToTitle}>{title}</b>
        <span className={styles.howToText}>{children}</span>
      </span>
    </li>
  );
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function DragIcon() {
  return (
    <>
      <circle cx="16" cy="16" r="9" {...stroke} />
      <path d="M5 16 h-2 M29 16 h-2 M16 5 v-2 M16 29 v-2" {...stroke} />
      <path d="M8 13 A 9 4 0 0 0 24 13" {...stroke} />
    </>
  );
}

function ScrubIcon() {
  return (
    <>
      <path d="M4 16 H28" {...stroke} />
      <circle cx="19" cy="16" r="4" fill="currentColor" />
    </>
  );
}

function StepIcon() {
  return (
    <>
      <path d="M7 8 L17 16 L7 24 Z" fill="currentColor" />
      <path d="M22 8 V24 M26 8 V24" {...stroke} />
    </>
  );
}

function ResetIcon() {
  return <path d="M7 16a9 9 0 1 0 2.7-6.4M7 7v5.5h5.5" {...stroke} />;
}

function TryIcon() {
  return (
    <>
      <path d="M16 4 a8 8 0 0 1 5 14 v3 h-10 v-3 a8 8 0 0 1 5 -14 Z" {...stroke} />
      <path d="M12 26 h8" {...stroke} />
    </>
  );
}

function ScaleIcon() {
  return (
    <>
      <rect x="3" y="11" width="26" height="10" rx="5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 2.5" />
      <circle cx="10" cy="16" r="2" fill="currentColor" />
      <circle cx="22" cy="16" r="1" fill="currentColor" />
    </>
  );
}
