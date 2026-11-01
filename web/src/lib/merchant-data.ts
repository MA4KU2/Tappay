import type { Address, PublicClient } from "viem";
import { formatUnits } from "viem";
import { SETTLEMENT, settlementAbi, USDC, erc20Abi } from "@pos/shared";

export interface Sale {
  nonce: `0x${string}`;
  payer: Address;
  usdcAmount: bigint;
  paidWithEth: boolean;
  ethSpent: bigint;
  tx: string;
  blockNumber: bigint;
  time: number | null; // unix seconds, null until block search-index resolves
}

export function saleFromLog(log: any): Sale {
  const a = log.args;
  return {
    nonce: a.nonce, payer: a.payer, usdcAmount: a.usdcAmount,
    paidWithEth: a.paidWithEth, ethSpent: a.ethSpent ?? 0n,
    tx: log.transactionHash, blockNumber: log.blockNumber, time: null,
  };
}

/** Scans PaymentSettled logs for one merchant, chunked for public-RPC friendliness. */
export async function fetchMerchantHistory(pc: PublicClient, merchant: Address): Promise<Sale[]> {
  const head = await pc.getBlockNumber();
  const WINDOW = 500_000n; // ~11.5 days on Base Sepolia 2s blocks
  const STEP = 250_000n;
  const sales: Sale[] = [];
  const from = head > WINDOW ? head - WINDOW : 0n;
  for (let start = from; start < head; start += STEP) {
    const to = start + STEP - 1n > head ? head : start + STEP - 1n;
    const logs = await pc.getContractEvents({
      address: SETTLEMENT, abi: settlementAbi as any, eventName: "PaymentSettled" as const,
      args: { merchant }, fromBlock: start, toBlock: to,
    }).catch(() => []);
    for (const log of logs) sales.push(saleFromLog(log));
  }
  await resolveTimes(pc, sales);
  return sales.sort((x, y) => (y.time ?? 0) - (x.time ?? 0));
}

/** Fills block timestamps (batched by unique block number). */
export async function resolveTimes(pc: PublicClient, sales: Sale[]): Promise<void> {
  const need = [...new Set(sales.filter((s) => s.time === null).map((s) => s.blockNumber))].slice(0, 48);
  if (!need.length) return;
  const blocks = await Promise.all(need.map((bn) => pc.getBlock({ blockNumber: bn }).catch(() => null)));
  const byBlock = new Map<bigint, number>();
  blocks.forEach((b, i) => { if (b) byBlock.set(need[i], Number(b.timestamp)); });
  for (const s of sales) if (s.time === null && byBlock.has(s.blockNumber)) s.time = byBlock.get(s.blockNumber)!;
}

export async function usdcBalance(pc: PublicClient, merchant: Address): Promise<bigint> {
  const v = await pc.readContract({
    address: USDC as `0x${string}`, abi: erc20Abi as any, functionName: "balanceOf", args: [merchant],
  });
  return v as bigint;
}

export const fmtUsdc = (v: bigint): string =>
  Number(formatUnits(v, 6)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
