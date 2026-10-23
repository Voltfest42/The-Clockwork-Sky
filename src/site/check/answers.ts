import { useSyncExternalStore } from 'react';

/**
 * The reader's answers to Check yourself questions, kept in this browser only
 * and never sent anywhere. Storage can be unavailable (private mode, blocked
 * cookies), so every access is guarded, and the questions still work for the
 * rest of the visit without it.
 */
export interface StoredAnswer {
  /** What the reader last checked: a choice's index, or the state of a figure. */
  value: unknown;
  correct: boolean;
}

export type Answers = Readonly<Record<string, StoredAnswer>>;

const KEY = 'clockwork-sky:answers';
const NONE: Answers = {};
const listeners = new Set<() => void>();
/** Read from storage on first use, never at import, so the module also runs on the server. */
let cache: Answers | null = null;
const current = () => (cache ??= load());

/** Where a question's answer is kept: its block's scope (usually the chapter's slug) and its own id. */
export function answerKey(scope: string, id: string): string {
  return `${scope}/${id}`;
}

/** Reads stored answers, dropping anything malformed. */
export function parseAnswers(raw: string | null): Answers {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw ?? '{}');
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const answers: Record<string, StoredAnswer> = {};
  for (const [key, entry] of Object.entries(parsed as Record<string, unknown>)) {
    if (entry && typeof entry === 'object' && 'value' in entry && 'correct' in entry && typeof entry.correct === 'boolean') {
      answers[key] = { value: entry.value, correct: entry.correct };
    }
  }
  return answers;
}

export interface Tally {
  total: number;
  answered: number;
  correct: number;
}

/** How many of a block's questions the reader has answered, and how many of those correctly. */
export function tally(answers: Answers, scope: string, ids: readonly string[]): Tally {
  const given = ids.map((id) => answers[answerKey(scope, id)]).filter((a) => a !== undefined);
  return { total: ids.length, answered: given.length, correct: given.filter((a) => a.correct).length };
}

function load(): Answers {
  try {
    return parseAnswers(window.localStorage.getItem(KEY));
  } catch {
    return {};
  }
}

function save(next: Answers): void {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Not persisted; still shown for this visit.
  }
  listeners.forEach((listener) => listener());
}

export function recordAnswer(scope: string, id: string, answer: StoredAnswer): void {
  save({ ...current(), [answerKey(scope, id)]: answer });
}

export function forgetAnswers(scope: string, ids: readonly string[]): void {
  const next = { ...current() };
  for (const id of ids) delete next[answerKey(scope, id)];
  save(next);
}

export function useAnswers(): Answers {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    current,
    () => NONE,
  );
}
