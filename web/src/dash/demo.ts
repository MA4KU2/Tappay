import type { Sale } from "../lib/merchant-data";

/* Labelled sample data for design previews only (?demo=1). It never appears
   once a wallet is connected. */

/** Deterministic pseudo-random hex of an exact length (addresses, hashes). */
const hex = (seed: number, chars: number): `0x${string}` => {
  let x = (Math.imul(seed + 1, 2654435761) ^ 0x9e3779b9) >>> 0;
  let out = "";
  for (let i = 0; i < chars; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    out += ((x >>> 28) & 0xf).toString(16);
  }
  return `0x${out}` as `0x${string}`;
};

export const DEMO_BALANCE = 48_250_000000n; // $48,250.00 in 6-dec USDC

export function demoSales(): Sale[] {
  const now = Math.floor(Date.now() / 1000);
  const out: Sale[] = [];

  for (let d = 0; d < 14; d++) {
    for (let k = 0; k < 1 + (d % 3); k++) {
      const n = d * 7 + k;
      const eth = n % 4 === 0;
      // nine wallets pay repeatedly — the Customers tab groups them
      const payerSeed = 11 + (n % 9);
      out.push({
        nonce: hex(1000 + n, 64),
        payer: hex(payerSeed, 40),
        usdcAmount: BigInt(Math.round((3.5 + (n % 21)) * 1e6)),
        paidWithEth: eth,
        ethSpent: eth ? 1_000_000_000_000_000n : 0n,
        tx: hex(5000 + n, 64),
        blockNumber: BigInt(12_800_000 + d * 500 + k),
        time: now - d * 86_400 - (k + 1) * 4200,
      });
    }
  }
  return out.sort((a, b) => (b.time ?? 0) - (a.time ?? 0));
}
