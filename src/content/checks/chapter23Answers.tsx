/**
 * Answers for Chapter 23's interactive Check yourself question: in Figure
 * 23.2, run the slow process from its iron seed and find the first magic
 * number of neutrons where the flow piles up. Iron-56 already has 30
 * neutrons, past the magic 28, so the first the path meets is N = 50
 * (krypton-86, strontium-88, yttrium-89, zirconium-90); a unit test checks
 * that the network piles up there.
 */

export const PILE_UP_N = 50;
export const PILE_UP_CHOICES = [28, 40, 50, 82, 126] as const;
export const PILE_UP_START = 28;

export function checkPileUp({ N }: { N: number }) {
  if (N === PILE_UP_N) {
    return {
      correct: true,
      feedback: (
        <p>
          N = 50: right. Strontium-88, with 50 neutrons, catches a neutron with a cross section of only 6.1 millibarns, against hundreds for its
          neighbours, so the flow from iron piles up there (and at krypton-86, yttrium-89 and zirconium-90) before moving on. The next bottlenecks
          are N = 82 (barium-138) and N = 126 (lead-208).
        </p>
      ),
    };
  }
  const why: Record<number, string> = {
    28: 'N = 28 is magic, but the iron-56 seed already has 30 neutrons, so the path starts beyond it.',
    40: 'N = 40 isn’t one of the magic numbers: the flow passes it without stalling.',
    82: 'N = 82 is a bottleneck, but not the first: the flow stalls at a lighter one before it gets there.',
    126: 'N = 126 is the last bottleneck, at lead-208, not the first.',
  };
  return {
    correct: false,
    feedback: (
      <p>
        {why[N] ?? 'Not that one.'} In Figure 23.2, slide the exposure up slowly and watch which nuclei hold most of the flow beyond iron.
      </p>
    ),
  };
}
