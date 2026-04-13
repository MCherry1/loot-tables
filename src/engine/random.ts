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

/**
 * Generate a standard normal random variable (mean 0, std 1)
 * using the Box-Muller transform with cryptographic randomness.
 */
export function standardNormal(): number {
  const u1 = cryptoRandom();
  const u2 = cryptoRandom();
  // Box-Muller: Z = sqrt(-2 ln U1) × cos(2π U2)
  return Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Generate a log-normal variance multiplier with mean 1.0 and the given
 * coefficient of variation (CV).
 *
 * Derived from DMG hoard table analysis: the combined gem+art GP value
 * per hoard has CV 0.60–0.82 across tiers. A log-normal distribution
 * naturally produces the right-skewed shape where most results are
 * modest and a few are jackpots.
 *
 * @param cv - Coefficient of variation (default 0.75, matching DMG average).
 * @returns A non-negative multiplier with E[X] = 1.0.
 */
export function logNormalVariance(cv: number = 0.75): number {
  // Log-normal parameters for mean = 1.0:
  //   σ² = ln(1 + cv²)
  //   μ  = -σ²/2   (ensures E[X] = exp(μ + σ²/2) = 1.0)
  const sigma2 = Math.log(1 + cv * cv);
  const sigma = Math.sqrt(sigma2);
  const mu = -sigma2 / 2;
  return Math.exp(mu + sigma * standardNormal());
}
