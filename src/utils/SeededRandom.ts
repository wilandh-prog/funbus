/**
 * Seeded Random Number Generator
 *
 * Uses Linear Congruential Generator (LCG) algorithm for reproducible randomness.
 * Same seed always produces the same sequence of random numbers.
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Generate next random number between 0 (inclusive) and 1 (exclusive)
   * Uses LCG algorithm (same as Java's Random)
   */
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  /**
   * Generate random integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min) + min);
  }

  /**
   * Reset the RNG with a new seed
   */
  reset(seed: number): void {
    this.seed = seed;
  }
}
