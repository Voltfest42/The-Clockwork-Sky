import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CheckYourself, Choice, InteractiveQuestion, Question } from '../src/site/check/CheckYourself';
import { Figure } from '../src/viz/Figure';

describe('the figure frame', () => {
  it('names the figure and carries a reset button, a legend, a "Try this" and the notes', () => {
    const html = renderToStaticMarkup(
      <Figure
        number="1.1"
        title="The zoom"
        description="A zoom from a person to the Milky Way."
        legend={[{ label: 'the Sun', symbol: <circle r="6" /> }]}
        tryThis="Zoom out until the Sun disappears."
        onReset={() => {}}
        simplified="The planets are drawn 1,000 times too big."
        notToScale
      >
        <svg />
      </Figure>,
    );
    expect(html).toContain('aria-labelledby="figure-1.1"');
    expect(html).toContain('id="figure-1.1"');
    expect(html).toMatch(/<button[^>]*aria-label="Reset figure 1.1"[^>]*>/);
    expect(html).toContain('Not to scale');
    expect(html).toContain('aria-label="Legend"');
    expect(html).toContain('the Sun');
    expect(html).toContain('Try this');
    expect(html).toContain('What’s simplified here?');
  });

  it('prerenders its description in place of the live figure, which needs the browser', () => {
    const html = renderToStaticMarkup(
      <Figure number="1.1" title="The zoom" description="A zoom from a person to the Milky Way." height={480} tryThis="Zoom out." onReset={() => {}}>
        <canvas />
      </Figure>,
    );
    expect(html).toContain('A zoom from a person to the Milky Way.');
    expect(html).toContain('--placeholder-height:480px');
    expect(html).toContain('<noscript>');
    expect(html).not.toContain('<canvas');
  });

  it('leaves out the tag and the note when the figure is true to scale and simplifies nothing', () => {
    const html = renderToStaticMarkup(
      <Figure number="2.4" title="One spin, two days" description="Earth spins as it orbits." tryThis="Step one day." onReset={() => {}}>
        <svg />
      </Figure>,
    );
    expect(html).not.toContain('Not to scale');
    expect(html).not.toContain('simplified');
    expect(html).toContain('Reset');
  });
});

describe('Check yourself', () => {
  const block = (
    <CheckYourself scope="test">
      <Question id="phase" prompt="What phase is the Moon in during a solar eclipse?">
        <Choice label="New" correct>
          It sits between the Sun and Earth.
        </Choice>
        <Choice label="Full">That’s when lunar eclipses happen.</Choice>
      </Question>
      <InteractiveQuestion id="slider" prompt="Pick 3." initial={1} check={(n: number) => ({ correct: n === 3, feedback: 'ok' })}>
        {(n) => <output>{n}</output>}
      </InteractiveQuestion>
    </CheckYourself>
  );
  const html = renderToStaticMarkup(block);

  it('groups each question in a fieldset with its prompt as the legend', () => {
    expect(html).toContain('>Check yourself</h2>');
    expect(html.match(/<fieldset/g)).toHaveLength(2);
    expect(html).toContain('<legend');
    expect(html).toContain('What phase is the Moon in during a solar eclipse?');
  });

  it('offers the choices as one group of radio buttons, and hides the explanations until an answer is checked', () => {
    const radios = [...html.matchAll(/<input type="radio" name="([^"]+)"/g)];
    expect(radios).toHaveLength(2);
    expect(radios[0][1]).toBe(radios[1][1]);
    expect(html).not.toContain('It sits between the Sun and Earth.');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Check<\/button>/);
  });

  it('prerenders an interactive question’s prompt, and leaves its figure to the browser', () => {
    expect(html).toContain('Pick 3.');
    expect(html).not.toContain('<output>');
    expect(html).toContain('needs JavaScript');
    expect(html).toContain('Your answers stay in this browser.');
  });

  it('insists that questions sit inside a Check yourself block', () => {
    expect(() =>
      renderToStaticMarkup(
        <Question id="lost" prompt="?">
          <Choice label="A">a</Choice>
        </Question>,
      ),
    ).toThrow(/inside <CheckYourself>/);
  });
});
