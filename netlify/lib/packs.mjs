// Cash packs — the ONLY source of truth for price -> in-game cash.
// Roughly $1 ≈ 30K–50K game cash; bigger packs = better rate.
export const PACKS = {
  p1:  { cents: 99,   cash: 30000,   name: '30,000 Cash' },
  p5:  { cents: 499,  cash: 175000,  name: '175,000 Cash' },
  p10: { cents: 999,  cash: 400000,  name: '400,000 Cash' },
  p20: { cents: 1999, cash: 900000,  name: '900,000 Cash' },
  p50: { cents: 4999, cash: 2500000, name: '2,500,000 Cash' },
};
