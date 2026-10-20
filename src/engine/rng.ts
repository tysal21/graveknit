// Random numbers. The game uses Math.random; tests use a seeded generator so results repeat.
export type Rng = () => number;

/** a small, fast seeded generator (mulberry32) */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** pick a key from a table of weights, like { common: 55, magic: 35, rare: 10 } */
export function pickWeighted<K extends string | number>(rng: Rng, w: Record<K, number>): K {
  const keys = Object.keys(w) as K[];
  let total = 0;
  for (const k of keys) total += w[k];
  let r = rng() * total;
  for (const k of keys) {
    r -= w[k];
    if (r <= 0) return k;
  }
  return keys[0];
}
