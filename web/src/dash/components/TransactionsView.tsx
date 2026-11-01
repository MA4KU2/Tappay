import React, { useState } from "react";
import { Link2, Copy, Check, ExternalLink, QrCode, Clock } from "lucide-react";
import type { Row, Charge } from "../types";
import { fmtDateTime, fmtLeft, fmtUsd } from "../format";
import { RecentTransactionsTable } from "./RecentTransactionsTable";
import { StatusPill, EmptyState } from "./bits";

interface TransactionsViewProps {
  rows: Row[];
  charges: Charge[];
  now: number;
  loading: boolean;
  onSelectRow: (r: Row) => void;
  onNewCharge: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  rows, charges, now, loading, onSelectRow, onNewCharge,
}) => {
  const [sub, setSub] = useState<"transactions" | "links">("transactions");
  const [copied, setCopied] = useState<string | null>(null);

  const awaiting = charges.filter((c) => !c.tx && now < c.expiry).length;

  const copy = (c: Charge) => {
    void navigator.clipboard.writeText(c.url);
    setCopied(c.nonce);
    setTimeout(() => setCopied(null), 1600);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="inline-flex items-center bg-[#f0eee9]/80 p-1 rounded-full border border-black/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] self-start">
          <button
            onClick={() => setSub("transactions")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              sub === "transactions" ? "bg-neutral-900 text-white shadow-sm" : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setSub("links")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              sub === "links" ? "bg-neutral-900 text-white shadow-sm" : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            Charge links
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              sub === "links" ? "bg-white/20 text-white" : "bg-neutral-200/70 text-neutral-600"
            }`}>
              {awaiting > 0 ? `${awaiting} live` : charges.length}
            </span>
          </button>
        </div>
      </div>

      {sub === "transactions" ? (
        <>
          <RecentTransactionsTable
            rows={rows}
            onSelectRow={onSelectRow}
            isDetailedView
            loading={loading}
          />
          <p className="text-[11px] text-neutral-400 px-2">
            Scanned from <span className="font-mono">PaymentSettled</span> logs for this merchant — the last ~500k blocks
            (≈ 11.5 days on Base Sepolia). Live sales appear without a refresh.
          </p>
        </>
      ) : (
        <div className="bg-white rounded-[28px] border border-neutral-100 shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg sm:text-xl font-extrabold text-neutral-900 tracking-tight">Charge links</h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                {charges.length} signed
              </span>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-400">
              <Clock className="w-3.5 h-3.5" /> requests expire 2 minutes after signing
            </span>
          </div>

          {charges.length === 0 ? (
            <EmptyState
              title="No charge links yet"
              body="A charge is an EIP-712 payment request signed by your wallet. Sign one and its QR / link shows up here while the customer pays."
              action={
                <button
                  onClick={onNewCharge}
                  className="inline-flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs px-3.5 py-2 rounded-full cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-indigo-400" /> Sign a charge
                </button>
              }
            />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {charges.map((c) => {
                const status = c.tx ? "Settled" : now >= c.expiry ? "Expired" : "Awaiting";
                return (
                  <li key={c.nonce} className="py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        status === "Settled" ? "bg-emerald-50 text-emerald-600"
                          : status === "Awaiting" ? "bg-amber-50 text-amber-600"
                          : "bg-stone-100 text-stone-400"
                      }`}>
                        <Link2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-neutral-900 tabular-nums">{fmtUsd(c.amount)}</span>
                          <StatusPill status={status} />
                          {status === "Awaiting" && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded tabular-nums">
                              {fmtLeft(c.expiry, now)} left
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                          to <span className="font-semibold text-neutral-600">{c.ensName || "merchant"}</span>
                          {" · "}{fmtDateTime(c.createdAt)}
                          {" · "}<span className="font-mono">{c.nonce.slice(0, 10)}…</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:shrink-0 pl-12 sm:pl-0">
                      <button
                        onClick={() => copy(c)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1.5 rounded-full cursor-pointer"
                      >
                        {copied === c.nonce ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {copied === c.nonce ? "Copied" : "Copy link"}
                      </button>
                      {status !== "Expired" && (
                        <a
                          href={c.url}
                          target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-full"
                        >
                          <ExternalLink className="w-3 h-3" /> Open
                        </a>
                      )}
                      {c.tx && (
                        <a
                          href={`https://sepolia.basescan.org/tx/${c.tx}`}
                          target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-full"
                        >
                          Receipt <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="text-[11px] text-neutral-400 mt-4 pt-3 border-t border-neutral-100">
            Links carry the signed request itself — whoever opens one pays you directly, and the funds never touch this
            app. Signed links are kept in this browser for 24 hours so a refresh doesn't lose the QR.
          </p>
        </div>
      )}
    </div>
  );
};
