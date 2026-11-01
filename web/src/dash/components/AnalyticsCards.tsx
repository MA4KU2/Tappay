import React from "react";
import { Plus, ArrowRight, ArrowUpRight } from "lucide-react";
import type { DayBucket, Row } from "../types";
import { fmtDay, fmtUsd, fmtUsdCompact, shortAddr } from "../format";
import { Avatar, StatusPill } from "./bits";

interface AnalyticsCardsProps {
  today: number;
  todayCount: number;
  avgTicket: number;
  total: number;
  settledCount: number;
  usdcShare: number;
  ethShare: number;
  rows: Row[];
  days: DayBucket[];
  onNewCharge: () => void;
  onSelectRow: (r: Row) => void;
  onViewAll: () => void;
}

const dotColumns = [
  [1, 1, 1],
  [1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1],
  [1, 1],
];

export const AnalyticsCards: React.FC<AnalyticsCardsProps> = ({
  today, todayCount, avgTicket, total, settledCount, usdcShare, ethShare, rows, days,
  onNewCharge, onSelectRow, onViewAll,
}) => {
  const maxDay = days.reduce((m, d) => Math.max(m, d.total), 0) || 1;
  const recent = rows.slice(0, 3);

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5 items-start xl:items-stretch py-2">
      {/* payments today */}
      <div className="xl:col-span-3 rounded-[28px] p-6 bg-gradient-to-b from-[#8ba7f8] via-[#8fa9f7] to-[#99b5ff] text-white flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="text-3xl font-extrabold tracking-tight tabular-nums">+{todayCount}</div>
            <div className="text-xs font-medium text-white/85 mt-0.5">Payments today</div>
          </div>
          <button
            onClick={onNewCharge}
            aria-label="Sign a new charge"
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="my-5 flex items-center justify-center relative py-3" aria-hidden>
          <div className="w-16 h-20 bg-white/25 backdrop-blur-md rounded-xl rotate-[-12deg] shadow-lg border border-white/30 transition-transform group-hover:rotate-[-16deg]" />
          <div className="w-18 h-22 bg-white/40 backdrop-blur-md rounded-xl rotate-[8deg] -ml-8 shadow-xl border border-white/40 flex flex-col p-2.5 justify-between transition-transform group-hover:rotate-[12deg]">
            <div className="space-y-1">
              <div className="w-6 h-1.5 bg-white/80 rounded-full" />
              <div className="w-9 h-1.5 bg-white/60 rounded-full" />
            </div>
            <div className="flex items-center justify-between text-[8px] font-bold text-white/90">
              <span>USDC</span>
              <span>✓</span>
            </div>
          </div>
        </div>

        <button
          onClick={onViewAll}
          className="relative z-10 w-full bg-white/20 hover:bg-white/25 backdrop-blur-md border border-white/30 rounded-2xl px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="text-left">
            <div className="text-xs font-extrabold tracking-tight tabular-nums">{fmtUsd(today, today < 1000)}</div>
            <div className="text-[10px] text-white/80">Settled today</div>
          </div>
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowRight className="w-3.5 h-3.5 text-white" />
          </div>
        </button>
      </div>

      {/* payment mix */}
      <div className="xl:col-span-3 rounded-[28px] p-6 bg-gradient-to-b from-[#8fa0f0] via-[#c693df] to-[#f89582] text-white flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="flex items-center justify-center">
          <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-semibold text-white/90 border border-white/20">
            Payment mix
          </span>
        </div>

        <div className="text-center my-auto py-2">
          <div className="text-4xl font-extrabold tracking-tight tabular-nums">{Math.round(usdcShare)}%</div>
          <div className="text-xs font-medium text-white/85 mt-1">USDC share of volume</div>
          <div className="text-[11px] text-white/70 mt-0.5">
            ETH swap <strong className="text-white font-bold">{Math.round(ethShare)}%</strong>
            {" · "}
            {settledCount} settled
          </div>
        </div>

        <div className="flex items-end justify-center gap-1.5 h-12 pt-2" aria-hidden>
          {dotColumns.map((col, cIdx) => (
            <div key={cIdx} className="flex flex-col gap-1 items-center">
              {col.map((_, dotIdx) => (
                <span key={dotIdx} className="w-1.5 h-1.5 rounded-full bg-white/80 shadow-xs" />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* total revenue */}
      <div className="xl:col-span-3 rounded-[28px] p-6 bg-gradient-to-r from-[#fcb383] via-[#ff8d69] to-[#f43f75] text-white flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="flex items-center justify-center">
          <span className="px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-semibold text-white/95 border border-white/20">
            Total revenue
          </span>
        </div>

        <div className="text-center my-auto py-2">
          <div className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-xs tabular-nums">
            {fmtUsd(total, total < 1000)}
          </div>
          <div className="text-xs font-semibold text-white/85 mt-1">Scanned window</div>
          <div className="text-[10px] text-white/65 mt-0.5">settled USDC volume</div>
        </div>

        <div className="w-full flex items-end justify-between gap-[2px] h-10 px-1 pt-2" aria-hidden>
          {days.map((d, idx) => (
            <div
              key={d.full + idx}
              title={`${d.full}: ${fmtUsd(d.total)}`}
              style={{ height: `${d.total === 0 ? 4 : 4 + (d.total / maxDay) * 32}px` }}
              className="flex-1 max-w-[3px] bg-white/80 rounded-full transition-all duration-150 group-hover:bg-white"
            />
          ))}
        </div>
      </div>

      {/* recent payments */}
      <div className="xl:col-span-3 rounded-[28px] p-5 bg-white border border-neutral-100 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3 pb-1">
          <h3 className="text-base font-extrabold text-neutral-900 tracking-tight">Recent activity</h3>
          <button
            onClick={onViewAll}
            aria-label="View all transactions"
            className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3 flex-1">
          {recent.length === 0 && (
            <p className="text-xs text-neutral-400 py-6 text-center">Nothing yet — sign a charge to start the ledger.</p>
          )}
          {recent.map((r) => (
            <div
              key={r.key}
              onClick={() => onSelectRow(r)}
              className="flex items-center justify-between text-xs p-1.5 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer group gap-2"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Avatar address={r.payer} size={30} />
                <div className="min-w-0">
                  <div className="font-bold text-neutral-900 truncate">
                    {r.payer ? shortAddr(r.payer) : r.ensName || "Charge link"}
                  </div>
                  <div className="text-[11px] text-neutral-400 truncate">
                    {r.time ? fmtDay(r.time) : "pending"} · {r.rail}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="font-bold text-neutral-900 tabular-nums">{fmtUsdCompact(r.amount)}</span>
                <StatusPill status={r.status} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
          <span>Avg ticket</span>
          <span className="font-bold text-neutral-700 tabular-nums">{fmtUsd(avgTicket)}</span>
        </div>
      </div>
    </div>
  );
};
