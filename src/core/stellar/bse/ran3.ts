/**
 * BSE's random numbers, ported from ran3.f of Hurley's BSE (Numerical Recipes'
 * ran2: L'Ecuyer's two generators combined with a Bays–Durham shuffle). The
 * Fortran returns a single-precision REAL, so every value is rounded to single
 * precision with Math.fround, as gfortran rounds it; the kick's draws then match
 * Hurley's code bit for bit for the same seed.
 */
const IM1 = 2147483563;
const IM2 = 2147483399;
const IA1 = 40014;
const IA2 = 40692;
const IQ1 = 53668;
const IQ2 = 52774;
const IR1 = 12211;
const IR2 = 3791;
const NTAB = 32;
const IMM1 = IM1 - 1;
const NDIV = 1 + Math.trunc(IMM1 / NTAB);
/** 1/float(im1) in single precision: float(2147483563) rounds to 2³¹. */
const AM = Math.fround(1 / Math.fround(IM1));

export class Ran3 {
  /** COMMON /VALUE3/ idum: negative to (re)start the sequence. */
  idum: number;
  /** COMMON /RAND3/, with the Fortran's DATA values. */
  private idum2 = 123456789;
  private iy = 0;
  private readonly ir = new Array<number>(NTAB + 1).fill(0);

  /** A generator seeded as bse.f seeds it: a positive seed is negated, so the first call starts the sequence. */
  constructor(seed: number) {
    this.idum = seed > 0 ? -seed : seed;
  }

  /** The next uniform deviate in (0, 1), single precision. */
  next(): number {
    let k: number;
    if (this.idum <= 0) {
      this.idum = Math.max(-this.idum, 1);
      this.idum2 = this.idum;
      for (let j = NTAB + 8; j >= 1; j--) {
        k = Math.trunc(this.idum / IQ1);
        this.idum = IA1 * (this.idum - k * IQ1) - k * IR1;
        if (this.idum < 0) this.idum = this.idum + IM1;
        if (j <= NTAB) this.ir[j] = this.idum;
      }
      this.iy = this.ir[1];
    }
    k = Math.trunc(this.idum / IQ1);
    this.idum = IA1 * (this.idum - k * IQ1) - k * IR1;
    if (this.idum < 0) this.idum = this.idum + IM1;
    k = Math.trunc(this.idum2 / IQ2);
    this.idum2 = IA2 * (this.idum2 - k * IQ2) - k * IR2;
    if (this.idum2 < 0) this.idum2 = this.idum2 + IM2;
    const j = 1 + Math.trunc(this.iy / NDIV);
    this.iy = this.ir[j] - this.idum2;
    this.ir[j] = this.idum;
    if (this.iy < 1) this.iy = this.iy + IMM1;
    return Math.fround(AM * Math.fround(this.iy));
  }
}
