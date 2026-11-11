/**
 * T Coronae Borealis, the recurrent nova (Chapter 28): a white dwarf fed by a
 * red giant on a 228-day orbit, which erupted in 1866 and 1946, each time
 * reaching about magnitude 2, and showed the same dip and rise before its
 * 1946 eruption from 2023. It hadn't erupted when last checked (registered in
 * asOf.ts as "tcrb"; checked 11 Nov 2026 against the literature and news:
 * still quiet, and hidden by the Sun from late November for a few months).
 * When it erupts: set `erupted` to the date, and Chapter 28's sentence reads
 * it in the past tense.
 */
export const T_CRB = {
  eruptions: [1866, 1946],
  /** The date of the eruption once it has happened ("12 March 2027"), or null. */
  erupted: null as string | null,
  orbitDays: 228,
  asOf: 'November 2026',
} as const;
