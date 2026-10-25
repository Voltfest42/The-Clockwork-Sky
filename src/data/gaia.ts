/**
 * ESA's Gaia mission, for Chapter 9. Data Release 3 (13 June 2022) has
 * positions for about 1.8 billion sources and parallaxes for about 1.5
 * billion. ESA has announced Data Release 4 for 2 December 2026 (ESA Gaia news,
 * checked 25 Oct 2026); the chapter's sentence changes tense by itself on the day.
 */
export const GAIA = {
  launched: 'December 2013',
  dr3: { date: '13 June 2022', sources: '1.8 billion', parallaxes: '1.5 billion' },
  dr4: { when: '2026-12-02T10:00:00Z', date: '2 December 2026' },
} as const;
