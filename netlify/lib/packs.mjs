// Cash packs — the ONLY source of truth for price -> in-game cash.
// Base rate $1 = 60K game cash; bigger packs get a small bonus (up to +33%).
export const PACKS = {
  p1:  { cents: 99,   cash: 60000,   name: '60,000 Cash' },
  p5:  { cents: 499,  cash: 325000,  name: '325,000 Cash' },
  p10: { cents: 999,  cash: 700000,  name: '700,000 Cash' },
  p20: { cents: 1999, cash: 1500000, name: '1,500,000 Cash' },
  p50: { cents: 4999, cash: 4000000, name: '4,000,000 Cash' },
};
