/* Formatting helpers for the merchant dashboard (USDC world). */

export const fmtUsd = (n: number, decimals = true): string =>
  "$" +
  n.toLocaleString("en-US", decimals
    ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : { maximumFractionDigits: 0 });

export const fmtUsdCompact = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `$${(n / 1_000).toFixed(1)}K`;
  return fmtUsd(n);
};

export const shortAddr = (a?: string | null): string =>
  a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—";

export const shortHash = (h?: string | null): string =>
  h ? `${h.slice(0, 10)}…` : "—";

export const initials = (a?: string | null): string =>
  a && a.length >= 4 ? a.slice(2, 4).toUpperCase() : "··";

/** stable avatar colour index from an address */
export const avatarTone = (a?: string | null): number =>
  a ? parseInt(a.slice(2, 4), 16) % 5 : 0;

export const fmtDateTime = (tsSec: number | null): string => {
  if (!tsSec) return "—";
  const d = new Date(tsSec * 1000);
  return d.toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
};

export const fmtDay = (tsSec: number): string =>
  new Date(tsSec * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export const fmtClock = (tsSec: number | null): string => {
  if (!tsSec) return "—";
  return new Date(tsSec * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

/** "1:43" countdown from an expiry timestamp */
export const fmtLeft = (expiry: number, now: number): string => {
  const s = Math.max(0, expiry - now);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const basescanAddress = (a: string): string => `https://sepolia.basescan.org/address/${a}`;
