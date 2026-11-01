import { formatUnits } from "viem";
import type { Sale } from "../lib/merchant-data";

/** One row in the dashboard ledger: a settled on-chain sale or a signed charge. */
export type Rail = "USDC" | "ETH swap" | "QR request";
export type RowStatus = "Settled" | "Awaiting" | "Expired";

export interface Row {
  key: string;
  nonce: string;
  tx?: string;
  payer?: string;
  amount: number; // USDC, human units
  rail: Rail;
  status: RowStatus;
  /** settled time, or creation time for an unsigned charge */
  time: number | null;
  blockNumber?: bigint;
  ensName?: string;
  url?: string;
  expiry?: number;
}

/** A real EIP-712 signed payment request made from this dashboard (2-min expiry). */
export interface Charge {
  nonce: `0x${string}`;
  amount: number;
  ensName: string;
  createdAt: number;
  expiry: number;
  url: string;
  tx?: string;
}

export const saleToRow = (s: Sale): Row => ({
  key: s.nonce,
  nonce: s.nonce,
  tx: s.tx,
  payer: s.payer,
  amount: Number(formatUnits(s.usdcAmount, 6)),
  rail: s.paidWithEth ? "ETH swap" : "USDC",
  status: "Settled",
  time: s.time,
  blockNumber: s.blockNumber,
});

export const chargeToRow = (c: Charge, now: number): Row => ({
  key: c.nonce,
  nonce: c.nonce,
  amount: c.amount,
  rail: "QR request",
  status: c.tx ? "Settled" : now >= c.expiry ? "Expired" : "Awaiting",
  time: c.createdAt,
  ensName: c.ensName,
  url: c.url,
  expiry: c.expiry,
});

/* ── day buckets for the volume chart ──────────────────────────────── */

export interface DayBucket {
  label: string; // day-of-month under the bars
  full: string;  // "Oct 31"
  usdc: number;
  eth: number;
  total: number;
  today: boolean;
}

const dayKey = (sec: number): string => new Date(sec * 1000).toLocaleDateString("en-CA");

export const localDayStart = (sec: number): number => {
  const d = new Date(sec * 1000);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
};

export function buildDays(rows: Row[], now: number, days = 14): DayBucket[] {
  // Anchor at local noon so DST shifts never skip or repeat a date.
  const anchor = new Date(now * 1000);
  anchor.setHours(12, 0, 0, 0);

  const buckets: DayBucket[] = [];
  const byKey = new Map<string, DayBucket>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const b: DayBucket = {
      label: String(d.getDate()),
      full: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      usdc: 0, eth: 0, total: 0, today: i === 0,
    };
    buckets.push(b);
    byKey.set(dayKey(d.getTime() / 1000), b);
  }

  for (const r of rows) {
    if (r.status !== "Settled" || !r.time) continue;
    const b = byKey.get(dayKey(r.time));
    if (!b) continue;
    if (r.rail === "ETH swap") b.eth += r.amount;
    else b.usdc += r.amount;
    b.total += r.amount;
  }
  return buckets;
}

/* ── aggregate stats (all from real rows) ──────────────────────────── */

export interface Stats {
  today: number;
  yesterday: number;
  todayCount: number;
  total: number;
  settledCount: number;
  ethShare: number;
  usdcShare: number;
  growth: number | null;
}

export function computeStats(rows: Row[], now: number): Stats {
  const todayStart = localDayStart(now);
  const yDate = new Date(todayStart * 1000);
  yDate.setDate(yDate.getDate() - 1);
  yDate.setHours(0, 0, 0, 0);
  const yStart = Math.floor(yDate.getTime() / 1000);
  let today = 0, yesterday = 0, todayCount = 0, total = 0, settledCount = 0, ethVol = 0;

  for (const r of rows) {
    if (r.status !== "Settled" || !r.time) continue;
    settledCount++;
    total += r.amount;
    if (r.rail === "ETH swap") ethVol += r.amount;
    if (r.time >= todayStart) { today += r.amount; todayCount++; }
    else if (r.time >= yStart) yesterday += r.amount;
  }

  const ethShare = total > 0 ? (ethVol / total) * 100 : 0;
  const growth = yesterday > 0 ? ((today - yesterday) / yesterday) * 100 : null;
  return {
    today, yesterday, todayCount, total, settledCount,
    ethShare, usdcShare: 100 - ethShare, growth,
  };
}
