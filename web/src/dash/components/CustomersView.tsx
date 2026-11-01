import React, { useMemo, useState } from "react";
import { Search, ExternalLink, UserCheck, Users, Inbox } from "lucide-react";import type { Row } from "../types";
import { basescanAddress, fmtDateTime, fmtUsd, shortAddr } from "../format";
import { Avatar, RailChip } from "./bits";

interface CustomersViewProps {
  rows: Row[];
}

interface Payer {
  address: string;
  total: number;
  count: number;
  last: number | null;
  usdc: number;
  eth: number;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ rows }) => {
  const [q, setQ] = useState("");

  const payers = useMemo<Payer[]>(() => {
    const map = new Map<string, Payer>();
    for (const r of rows) {
      if (r.status !== "Settled" || !r.payer) continue;
      const key = r.payer.toLowerCase();
      const p = map.get(key) ?? { address: r.payer, total: 0, count: 0, last: null, usdc: 0, eth: 0 };
      p.total += r.amount;
      p.count += 1;
      if (r.time && (!p.last || r.time > p.last)) p.last = r.time;
      if (r.rail === "ETH swap") p.eth += r.amount;
      else p.usdc += r.amount;
      map.set(key, p);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [rows]);

  const filtered = payers.filter((p) => !q.trim() || p.address.toLowerCase().includes(q.toLowerCase().trim()));
  const repeat = payers.filter((p) => p.count > 1).length;
  const volume = payers.reduce((s, p) => s + p.total, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-[24px] p-5 border border-neutral-100 shadow-2xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-neutral-900 tabular-nums">{payers.length}</div>
            <div className="text-[11px] font-semibold text-neutral-400">unique payers</div>
          </div>
        </div>
        <div className="bg-white rounded-[24px] p-5 border border-neutral-100 shadow-2xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-neutral-900 tabular-nums">{repeat}</div>
            <div className="text-[11px] font-semibold text-neutral-400">repeat payers</div>
          </div>
        </div>
        <div className="bg-white rounded-[24px] p-5 border border-neutral-100 shadow-2xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-sm font-black">$</div>
          <div>
            <div className="text-2xl font-extrabold text-neutral-900 tabular-nums">{fmtUsd(volume, volume < 1000)}</div>
            <div className="text-[11px] font-semibold text-neutral-400">settled volume</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[28px] p-6 border border-neutral-100 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="font-extrabold text-base text-neutral-900 tracking-tight">Paying wallets</h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Grouped from <span className="font-mono">PaymentSettled</span> events — no account, no email, just the
              address that paid.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a wallet address…"
              className="w-full bg-neutral-50 focus:bg-white text-xs font-medium text-neutral-900 placeholder:text-neutral-400 pl-9 pr-4 py-2 rounded-xl border border-neutral-200/80 focus:border-neutral-900 focus:outline-none transition-all"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center gap-2">
            <Inbox className="w-6 h-6 text-neutral-300" />
            <div className="font-extrabold text-sm text-neutral-800">
              {payers.length === 0 ? "No paying wallets yet" : "No match"}
            </div>
            <p className="text-xs text-neutral-500 max-w-sm">
              {payers.length === 0
                ? "Every wallet that settles a charge appears here with its lifetime volume at your till."
                : "Try a full address or the first few characters."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {filtered.map((p) => (
              <li key={p.address} className="py-3.5 flex items-center gap-3">
                <Avatar address={p.address} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={basescanAddress(p.address)}
                      target="_blank" rel="noreferrer"
                      className="font-mono font-bold text-sm text-neutral-900 hover:text-indigo-600 inline-flex items-center gap-1"
                    >
                      {shortAddr(p.address)}
                      <ExternalLink className="w-3 h-3 text-neutral-300" />
                    </a>
                    {p.count > 1 && (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                        repeat
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    {p.count} payment{p.count === 1 ? "" : "s"} · last {p.last ? fmtDateTime(p.last) : "—"}
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-4 shrink-0">
                  {p.usdc > 0 && (
                    <div className="flex flex-col gap-1 items-end">
                      <RailChip rail="USDC" />
                      <span className="text-[10px] text-neutral-400 tabular-nums">{fmtUsd(p.usdc)}</span>
                    </div>
                  )}
                  {p.eth > 0 && (
                    <div className="flex flex-col gap-1 items-end">
                      <RailChip rail="ETH swap" />
                      <span className="text-[10px] text-neutral-400 tabular-nums">{fmtUsd(p.eth)}</span>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-sm text-neutral-900 tabular-nums">{fmtUsd(p.total)}</div>
                  <div className="text-[10px] text-neutral-400">lifetime volume</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
