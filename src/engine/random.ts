// ---------------------------------------------------------------------------
// Cryptographically secure random number generation
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically secure random float in [0, 1).
 * Uses crypto.getRandomValues() for true randomness from the OS entropy pool.
 */
export function cryptoRandom(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / (0xFFFFFFFF + 1);
}
