import { useSyncExternalStore } from 'react';

/**
 * Which chapters the reader has finished, remembered in this browser only.
 * Storage can be unavailable (private mode, blocked cookies), so every access
 * is guarded and the site works the same without it.
 */
const KEY = 'clockwork-sky:read-chapters';
const listeners = new Set<() => void>();
const NONE: readonly string[] = [];
/** Read from storage on first use, never at import, so the module also runs on the server. */
let cache: readonly string[] | null = null;
const current = () => (cache ??= load());

function load(): readonly string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function markChapterRead(slug: string): void {
  if (current().includes(slug)) return;
  cache = [...current(), slug];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Not persisted; still shown for this visit.
  }
  listeners.forEach((listener) => listener());
}

export function useReadChapters(): readonly string[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    current,
    () => NONE,
  );
}
