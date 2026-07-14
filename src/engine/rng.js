// Seeded RNG (mulberry32). All game randomness must route through an instance
// of this so lives are reproducible for testing/verification.

export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    seed: a,
    get state() { return a >>> 0; },        // current internal state, for save/restore
    next,                                   // [0,1)
    float: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)), // inclusive
    chance: (p) => next() < p,              // true with probability p
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    // weighted pick: items [{...}], weightFn -> number
    weighted: (items, weightFn) => {
      const weights = items.map(weightFn);
      const total = weights.reduce((s, w) => s + w, 0);
      if (total <= 0) return rng.pick(items);
      let r = next() * total;
      for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r < 0) return items[i];
      }
      return items[items.length - 1];
    },
    // gaussian via Box-Muller
    gaussian: (mean = 0, sd = 1) => {
      const u = Math.max(next(), 1e-9), v = next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
  };
  return rng;
}

export function randomSeed() {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
