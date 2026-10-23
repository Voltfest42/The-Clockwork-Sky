import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { useHydrated } from '../site/hydration';

function subscribeMedia(query: string) {
  return (onChange: () => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {};
    const list = window.matchMedia(query);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  };
}

function matches(query: string): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches;
}

const REDUCED = '(prefers-reduced-motion: reduce)';
const subscribeReduced = subscribeMedia(REDUCED);
const DARK = '(prefers-color-scheme: dark)';
const subscribeDark = subscribeMedia(DARK);

/** True when the reader has asked for less motion. Figures then don't play by themselves, and move in steps rather than glides. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => matches(REDUCED),
    () => false,
  );
}

/** True in dark mode. Figures that read the design tokens redraw when it changes. */
export function useDarkMode(): boolean {
  return useSyncExternalStore(
    subscribeDark,
    () => matches(DARK),
    () => false,
  );
}

/**
 * Whether an element is on (or near) the screen, and the page is visible.
 * Animations pause when it's false.
 *
 * A figure's elements only exist once the page has hydrated (see Figure), so the
 * watch starts again then: the element may not have been there at first.
 */
export function useOnScreen(ref: RefObject<Element | null>, margin = '100px'): boolean {
  const [onScreen, setOnScreen] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
  const hydrated = useHydrated();

  useEffect(() => {
    const element = ref.current;
    if (!hydrated || !element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => setOnScreen(entries.some((e) => e.isIntersecting)), { rootMargin: margin });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, margin, hydrated]);

  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  return onScreen && pageVisible;
}

/** Reads design tokens (CSS custom properties) from an element, e.g. tokens(el, ['--sky-bg']). */
export function readTokens<K extends string>(element: Element, names: readonly K[]): Record<K, string> {
  const style = getComputedStyle(element);
  return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(n).trim()])) as Record<K, string>;
}

/**
 * Calls `frame(dtSeconds)` on every animation frame while `running` is true.
 * dt is capped at 0.1 s, so a figure doesn't leap after the tab was asleep.
 */
export function useAnimationFrame(running: boolean, frame: (dt: number) => void) {
  const callback = useRef(frame);
  useEffect(() => {
    callback.current = frame;
  });
  useEffect(() => {
    if (!running) return;
    let last: number | null = null;
    let id = requestAnimationFrame(function tick(now) {
      const dt = last === null ? 0 : Math.min(0.1, (now - last) / 1000);
      last = now;
      callback.current(dt);
      id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [running, callback]);
}
