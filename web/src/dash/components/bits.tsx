import React from "react";
import { CheckCircle2, Clock, MinusCircle, Coins, Repeat2, QrCode } from "lucide-react";
import type { Rail, RowStatus } from "../types";
import { initials } from "../format";

/* Small shared pieces of the BasePOS dashboard language. */

const TONES = [
  "from-indigo-500 via-purple-500 to-rose-400",
  "from-sky-500 via-cyan-500 to-emerald-400",
  "from-amber-400 via-orange-500 to-rose-400",
  "from-violet-500 via-fuchsia-500 to-pink-400",
  "from-emerald-500 via-teal-500 to-cyan-400",
];

export const Avatar: React.FC<{ address?: string | null; size?: number }> = ({ address, size = 30 }) => {
  const tone = address ? parseInt(address.slice(2, 4), 16) % TONES.length : 0;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-tr ${TONES[tone]} text-white font-black ring-2 ring-white shrink-0 select-none`}
      style={{ width: size, height: size, fontSize: Math.max(8, Math.round(size * 0.34)) }}
      aria-hidden
    >
      {initials(address)}
    </span>
  );
};

export const StatusPill: React.FC<{ status: RowStatus }> = ({ status }) => {
  if (status === "Settled") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> Settled
      </span>
    );
  }
  if (status === "Awaiting") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Awaiting
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200">
      <MinusCircle className="w-3 h-3" /> Expired
    </span>
  );
};

export const RailChip: React.FC<{ rail: Rail }> = ({ rail }) => {
  if (rail === "USDC") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
        <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <Coins className="w-3.5 h-3.5" />
        </span>
        USDC
      </span>
    );
  }
  if (rail === "ETH swap") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
        <span className="w-6 h-6 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0">
          <Repeat2 className="w-3.5 h-3.5" />
        </span>
        ETH swap
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
      <span className="w-6 h-6 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
        <QrCode className="w-3.5 h-3.5" />
      </span>
      QR request
    </span>
  );
};

export const EmptyState: React.FC<{
  title: string;
  body: string;
  action?: React.ReactNode;
}> = ({ title, body, action }) => (
  <div className="py-12 px-4 flex flex-col items-center text-center gap-2">
    <div className="w-11 h-11 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mb-1">
      <Clock className="w-5 h-5" />
    </div>
    <div className="font-extrabold text-sm text-neutral-800">{title}</div>
    <p className="text-xs text-neutral-500 max-w-sm">{body}</p>
    {action && <div className="mt-2">{action}</div>}
  </div>
);
