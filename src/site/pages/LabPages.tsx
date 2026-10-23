import { Suspense } from 'react';
import { LABS, partNumbered, type LabInfo } from '../course';
import { labContent } from '../pageContent';
import { href } from '../router';
import { LabCard, SoonTag } from './CourseCards';
import contentStyles from '../content/content.module.css';
import styles from './pages.module.css';

export function LabsIndex() {
  return (
    <article className={styles.page}>
      <header className={styles.chapterHeader}>
        <p className={styles.kicker}>Labs</p>
        <h1>The labs</h1>
        <p className={styles.lede}>Two workshops where you set the starting conditions and the physics takes it from there.</p>
      </header>
      <div className={contentStyles.prose}>
        <p>
          Each lab comes at the end of a part and puts what it taught in your hands. Both are upgraded in Part III. Like the figures, they run
          entirely in your browser.
        </p>
      </div>
      <ul className={styles.cards}>
        {LABS.map((lab) => (
          <li key={lab.slug}>
            <LabCard lab={lab} />
          </li>
        ))}
      </ul>
    </article>
  );
}

export function LabPage({ lab }: { lab: LabInfo }) {
  const Lab = labContent(lab.slug);
  if (Lab) {
    return (
      <Suspense fallback={<p className={styles.loading}>Loading {lab.title}…</p>}>
        {/* Not created during render: every lab's component is made once, in pageContent.ts. */}
        {/* eslint-disable-next-line react-hooks/static-components */}
        <Lab />
      </Suspense>
    );
  }
  return (
    <article className={styles.page}>
      <header className={styles.chapterHeader}>
        <p className={styles.kicker}>Lab · {lab.subject}</p>
        <h1>{lab.title}</h1>
        <p className={styles.lede}>{lab.blurb}</p>
      </header>
      <div className={contentStyles.prose}>
        <p>
          <SoonTag /> This lab isn’t built yet. Here is what is planned:
        </p>
        <dl className={styles.versions}>
          {lab.versions.map((v) => (
            <div key={v.version}>
              <dt>
                Version {v.version}, with{' '}
                <a href={href(partNumbered(v.part).slug)}>
                  Part {partNumbered(v.part).numeral}: {partNumbered(v.part).title}
                </a>
              </dt>
              <dd>{v.summary}</dd>
            </div>
          ))}
        </dl>
        <p>
          <a href={href('labs')}>← Both labs</a>
        </p>
      </div>
    </article>
  );
}
