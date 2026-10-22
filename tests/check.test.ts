import { describe, expect, it } from 'vitest';
import { answerKey, parseAnswers, tally } from '../src/site/check/answers';

describe('stored answers', () => {
  it('reads back what was stored', () => {
    const raw = JSON.stringify({ 'the-moon/eclipse-phase': { value: 1, correct: false }, 'sample/guess': { value: 109, correct: true } });
    expect(parseAnswers(raw)).toEqual({
      'the-moon/eclipse-phase': { value: 1, correct: false },
      'sample/guess': { value: 109, correct: true },
    });
  });

  it('drops anything malformed instead of breaking the page', () => {
    expect(parseAnswers(null)).toEqual({});
    expect(parseAnswers('not json')).toEqual({});
    expect(parseAnswers('[1, 2]')).toEqual({});
    expect(parseAnswers('null')).toEqual({});
    const raw = JSON.stringify({ ok: { value: 'x', correct: true }, noCorrect: { value: 2 }, badCorrect: { value: 2, correct: 'yes' }, number: 3, nothing: null });
    expect(parseAnswers(raw)).toEqual({ ok: { value: 'x', correct: true } });
  });

  it('keys answers by block and question', () => {
    expect(answerKey('the-moon', 'eclipse-phase')).toBe('the-moon/eclipse-phase');
  });
});

describe('the tally', () => {
  const answers = {
    'a/1': { value: 0, correct: true },
    'a/2': { value: 2, correct: false },
    'b/1': { value: 1, correct: true },
  };

  it('counts only the block’s own questions', () => {
    expect(tally(answers, 'a', ['1', '2', '3'])).toEqual({ total: 3, answered: 2, correct: 1 });
    expect(tally(answers, 'b', ['1'])).toEqual({ total: 1, answered: 1, correct: 1 });
    expect(tally(answers, 'c', [])).toEqual({ total: 0, answered: 0, correct: 0 });
  });
});
