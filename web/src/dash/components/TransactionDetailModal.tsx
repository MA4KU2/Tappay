import React, { useState } from "react";
import {
  X, Copy, Check, ExternalLink, ShieldCheck, QrCode, Clock, Hash, Wallet, CalendarClock,
} from "lucide-react";
import type { Row } from "../types";
import { fmtDateTime, fmtLeft, fmtUsd, shortAddr } from "../format";
import { basescanAddress } from "../format";
import { basescanTx } from "../../lib/links";
import { Avatar, RailChip, StatusPill } from "./bits";

interface TransactionDetailModalProps {
  row: Row | null;
  now: number;
  onClose: () => void;
  onNewCharge: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({ row, now, onClose, onNewCharge }) => {
  const [copied, setCopied] = useState<string | null>(null);
  if (!row) return null;

  const copy = (key: string, value: string) => {
    void navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  };

  const CopyBtn: React.FC<{ id: string; value: string }> = ({ id, value }) => (
    <button
      onClick={() => copy(id, value)}
      className="p-1 rounded text-neutral-400 hover:text-neutral-800 cursor-pointer"
      title="Copy"
    >
      {copied === id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-neutral-100 overflow-hidden my-4" role="dialog" aria-modal="true" aria-labelledby="txn-title">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              row.status === "Settled" ? "bg-emerald-50 text-emerald-600"
                : row.status === "Awaiting" ? "bg-amber-50 text-amber-600"
                : "bg-stone-100 text-stone-500"
            }`}>
              {row.status === "Settled" ? <ShieldCheck className="w-4 h-4" /> : row.status === "Awaiting" ? <Clock className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-extrabold text-base text-neutral-900" id="txn-title">Transaction detail</h3>
              <p className="text-[11px] text-neutral-400">
                {row.status === "Settled" ? "Settled on Base Sepolia" : row.status === "Awaiting" ? "Signed request, waiting for payment" : "Request expired without a payment"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-3xl font-black text-neutral-900 tabular-nums">
                {row.status === "Settled" ? "+" : ""}{fmtUsd(row.amount)}
              </div>
              <div className="mt-1"><StatusPill status={row.status} /></div>
            </div>
            <RailChip rail={row.rail} />
          </div>

          {row.status === "Awaiting" && row.expiry && (
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-3">
              <div className="text-[11px] text-amber-800">
                <div className="font-bold">Waiting for the customer</div>
                <div className="opacity-80">Link and QR stay valid for the signed window.</div>
              </div>
              <div className="text-lg font-extrabold text-amber-800 tabular-nums">{fmtLeft(row.expiry, now)}</div>
            </div>
          )}

          {row.status === "Expired" && (
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-[11px] text-stone-600 flex items-start gap-2">
              <Clock className="w-4 h-4 shrink-0 mt-px" />
              <span>No funds moved. The signature is unusable after expiry — sign a fresh charge when the customer is ready.</span>
            </div>
          )}

          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 divide-y divide-neutral-200/60 text-xs">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-neutral-500 inline-flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Payer</span>
              {row.payer ? (
                <span className="flex items-center gap-1 min-w-0">
                  <Avatar address={row.payer} size={18} />
                  <a
                    href={basescanAddress(row.payer)}
                    target="_blank" rel="noreferrer"
                    className="font-mono font-bold text-neutral-800 hover:text-indigo-600 truncate"
                    title={row.payer}
                  >
                    {shortAddr(row.payer)}
                  </a>
                  <CopyBtn id="payer" value={row.payer} />
                </span>
              ) : (
                <span className="font-mono font-semibold text-neutral-600">{row.ensName || "awaiting"}</span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-neutral-500 inline-flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" /> {row.status === "Settled" ? "Settled" : "Created"}</span>
              <span className="font-semibold text-neutral-800 text-right">
                {row.time ? fmtDateTime(row.time) : row.blockNumber ? `block ${Number(row.blockNumber).toLocaleString()}` : "—"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-neutral-500 inline-flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Nonce</span>
              <span className="flex items-center gap-1 min-w-0">
                <span className="font-mono font-semibold text-neutral-800 truncate" title={row.nonce}>{row.nonce.slice(0, 14)}…</span>
                <CopyBtn id="nonce" value={row.nonce} />
              </span>
            </div>

            {row.tx && (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-neutral-500 inline-flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Tx hash</span>
                <span className="flex items-center gap-1 min-w-0">
                  <a
                    href={basescanTx(row.tx)}
                    target="_blank" rel="noreferrer"
                    className="font-mono font-bold text-indigo-700 hover:text-indigo-900 truncate"
                    title={row.tx}
                  >
                    {row.tx.slice(0, 14)}…
                  </a>
                  <CopyBtn id="tx" value={row.tx} />
                </span>
              </div>
            )}

            {row.blockNumber !== undefined && row.status === "Settled" && (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-neutral-500">Block</span>
                <span className="font-mono font-semibold text-neutral-800">{Number(row.blockNumber).toLocaleString()}</span>
              </div>
            )}

            {row.ensName && (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-neutral-500">Verified ENS</span>
                <span className="font-bold text-indigo-700">{row.ensName}</span>
              </div>
            )}
          </div>

          {row.status === "Settled" ? (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-800 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-px" />
              <span>
                USDC was transferred straight to the merchant wallet by <span className="font-mono">PaymentSettlement</span>.
                {row.rail === "ETH swap" ? " The payer sent ETH; the contract swapped exactly this USDC and refunded the excess." : ""}
              </span>
            </div>
          ) : row.url ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                <span className="text-[11px] font-mono text-neutral-700 truncate flex-1">{row.url}</span>
                <CopyBtn id="url" value={row.url} />
              </div>
              <a
                href={row.url}
                target="_blank" rel="noreferrer"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open pay page
              </a>
            </div>
          ) : null}

          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
            <button onClick={onNewCharge} className="px-4 py-2 text-xs font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer">
              + New charge
            </button>
            <div className="flex items-center gap-2">
              {row.tx && (
                <a
                  href={basescanTx(row.tx)}
                  target="_blank" rel="noreferrer"
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                >
                  BaseScan <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button onClick={onClose} className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold cursor-pointer">
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
