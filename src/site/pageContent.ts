import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { MDXProps } from 'mdx/types';
import { CHAPTERS, LABS, TOOLKIT } from './course';

/**
 * Page content loaded on demand: chapters' and Toolkit pages' MDX, and the labs.
 *
 * A page opened by following a link loads its content lazily, behind Suspense.
 * The first page shown is different: its content is loaded before React renders
 * (preloadPage), both when prerendering and before hydrating, so the two render
 * the content straight away and agree, with no "Loading…" fallback in between.
 */
class Loadable<P> {
  readonly lazy: LazyExoticComponent<ComponentType<P>>;
  private readonly load: () => Promise<{ default: ComponentType<P> }>;
  private loaded: ComponentType<P> | null = null;

  constructor(load: () => Promise<{ default: ComponentType<P> }>) {
    this.load = load;
    this.lazy = lazy(load);
  }

  async preload(): Promise<void> {
    this.loaded ??= (await this.load()).default;
  }

  /** The preloaded component if there is one (nothing suspends), else the lazy one. Made once per page, never during render. */
  get component(): ComponentType<P> {
    return this.loaded ?? this.lazy;
  }
}

const chapters = new Map(CHAPTERS.flatMap((c) => (c.load ? [[c.slug, new Loadable<MDXProps>(c.load)] as const] : [])));
const toolkit = new Map(TOOLKIT.flatMap((t) => (t.load ? [[t.slug, new Loadable<MDXProps>(t.load)] as const] : [])));
const labs = new Map<string, Loadable<object>>(LABS.flatMap((l) => (l.load ? [[l.slug, new Loadable<object>(l.load)] as const] : [])));

/** A chapter's written content, if it is written. */
export function chapterContent(slug: string): ComponentType<MDXProps> | undefined {
  return chapters.get(slug)?.component;
}

/** A Toolkit page's written content, by its slug ("powers-of-ten"). */
export function toolkitContent(slug: string): ComponentType<MDXProps> | undefined {
  return toolkit.get(slug)?.component;
}

/** A lab, if it is built. */
export function labContent(slug: string): ComponentType | undefined {
  return labs.get(slug)?.component;
}

/** Loads a page's content before the first render: "the-turning-sky", "toolkit/powers-of-ten", "orrery". */
export async function preloadPage(page: string): Promise<void> {
  const content = page.startsWith('toolkit/') ? toolkit.get(page.slice('toolkit/'.length)) : (chapters.get(page) ?? labs.get(page));
  await content?.preload();
}
