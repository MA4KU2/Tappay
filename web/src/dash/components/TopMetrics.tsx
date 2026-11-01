import React, { useState } from "react";
import { ArrowUpRight, Copy, Check, ExternalLink } from "lucide-react";
import type { DayBucket } from "../types";
import { fmtUsd, fmtUsdCompact, shortAddr, basescanAddress } from "../format";

interface TopMetricsProps {
  balance: number | null;
  address: string | null;
  demo?: boolean;
  today: number;
  yesterday: number;
  growth: number | null;
  days: DayBucket[];
  range: 7 | 14;
  onRangeChange: (r: 7 | 14) => void;
  onViewAll: () => void;
}

export const TopMetrics: React.FC<TopMetricsProps> = ({
  balance, address, demo = false, today, yesterday, growth, days, range, onRangeChange, onViewAll,
}) => {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState<DayBucket | null>(null);

  const visible = days.slice(-range);
  const max = visible.reduce((m, d) => Math.max(m, d.total), 0) || 1;

  const copyAddress = () => {
    if (!address) return;
    void navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const growthLabel = growth === null ? null : `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`;

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start py-2">
      {/* wallet balance */}
      <div className="lg:col-span-3 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-500">Wallet balance</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500">
              USDC
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight tabular-nums">
              {balance === null ? "—" : fmtUsd(balance)}
            </h2>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-neutral-500 min-w-0">
            <span>{address ? <span className="font-mono">{shortAddr(address)}</span> : demo ? "Sample merchant" : "Not connected"}</span>
            <span className="w-1 h-1 rounded-full bg-neutral-300 shrink-0" />
            <span className="text-emerald-600 font-bold">Base Sepolia</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={onViewAll}
            className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
          >
            View transactions <ArrowUpRight className="w-3 h-3" />
          </button>
          {address && (
            <button
              onClick={copyAddress}
              title="Copy wallet address"
              className="p-1.5 rounded-full text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
          {address && (
            <a
              href={basescanAddress(address)}
              target="_blank" rel="noreferrer"
              title="Open wallet on BaseScan"
              className="p-1.5 rounded-full text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* today */}
      <div className="lg:col-span-3 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-neutral-500">Today's revenue</span>
            {growthLabel && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                growth! >= 0 ? "bg-indigo-100/70 text-indigo-700" : "bg-rose-50 text-rose-600"
              }`}>
                {growthLabel}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight tabular-nums">
              {fmtUsd(today, today < 1000)}
            </h2>
          </div>
          <p className="mt-2 text-xs font-medium text-neutral-400">
            vs. yesterday ({fmtUsd(yesterday, yesterday < 1000)})
          </p>
        </div>
      </div>

      {/* volume bars */}
      <div className="lg:col-span-6 flex flex-col min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-semibold text-neutral-800">Payment volume</span>
            <div className="flex items-center gap-3 text-xs font-medium text-neutral-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#8da3f8]" /> USDC
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-neutral-900" /> ETH swap
              </span>
            </div>
          </div>

          <div className="relative flex items-center gap-1 bg-neutral-100 rounded-full p-0.5">
            {([7, 14] as const).map((r) => (
              <button
                key={r}
                onClick={() => onRangeChange(r)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                  range === r ? "bg-white text-neutral-900 shadow-2xs" : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {r} days
              </button>
            ))}
          </div>
        </div>

        {/* hover read-out keeps the tooltip from clipping on edge columns */}
        <div className="h-6 hidden sm:flex items-center justify-end text-[11px] font-medium tabular-nums">
          {hovered ? (
            <span className="text-neutral-500">
              <span className="font-bold text-neutral-800">{hovered.full}</span>
              {" · "}
              <span className="text-indigo-600">USDC {fmtUsdCompact(hovered.usdc)}</span>
              {" · "}
              <span className="text-neutral-700">ETH {fmtUsdCompact(hovered.eth)}</span>
              {" · "}
              <span className="font-bold text-neutral-900">{fmtUsd(hovered.total)}</span>
            </span>
          ) : (
            <span className="text-neutral-300">hover a day for the split</span>
          )}
        </div>

        <div className="relative w-full h-24 bg-neutral-50/60 rounded-2xl p-2.5 flex items-end justify-between gap-1 sm:gap-1.5">
          {visible.map((d, i) => {
            const totalH = d.total === 0 ? 3 : Math.max(6, Math.round((d.total / max) * 82));
            const ethH = d.total === 0 ? 0 : Math.round((d.eth / d.total) * totalH);
            const usdcH = Math.max(0, totalH - ethH);
            return (
              <div
                key={d.full + i}
                onMouseEnter={() => setHovered(d)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(d)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
                role="img"
                aria-label={`${d.full}: ${fmtUsd(d.total)} settled (USDC ${fmtUsd(d.usdc)}, ETH swap ${fmtUsd(d.eth)})`}
                className="group relative flex-1 flex flex-col items-center justify-end h-full cursor-pointer py-1 outline-none"
              >
                {ethH > 0 && (
                  <div
                    style={{ height: `${ethH}px` }}
                    className={`relative w-full max-w-[20px] rounded-t-md bg-neutral-900 overflow-hidden transition-all duration-200 group-hover:opacity-90 ${
                      usdcH === 0 ? "rounded-b-md" : ""
                    }`}
                  >
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff,#fff 2px,transparent 2px,transparent 4px)" }}
                    />
                  </div>
                )}
                <div
                  style={{ height: `${totalH === 3 && d.total === 0 ? 3 : usdcH}px` }}
                  className={`w-full max-w-[20px] bg-[#8da3f8] group-hover:bg-[#7b92f7] transition-all duration-200 shadow-2xs ${
                    ethH > 0 ? "rounded-b-lg" : "rounded-lg"
                  } ${d.today ? "ring-2 ring-indigo-300/60" : ""}`}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-1.5 flex items-end justify-between gap-1 sm:gap-1.5 px-2.5">
          {visible.map((d, i) => (
            <span
              key={d.full + i}
              className={`flex-1 text-center text-[10px] tabular-nums ${
                d.today ? "font-extrabold text-neutral-900" : range === 14 && i % 2 === 1 ? "text-transparent" : "text-neutral-400"
              }`}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
