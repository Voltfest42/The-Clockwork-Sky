import type { ReactNode } from 'react';

/** A legend symbol on a patch of night sky, so pale sky colours show up in the light theme too. */
export function onSky(symbol: ReactNode): ReactNode {
  return (
    <>
      <rect x={-11} y={-11} width={22} height={22} rx={4} fill="#070b16" />
      {symbol}
    </>
  );
}
