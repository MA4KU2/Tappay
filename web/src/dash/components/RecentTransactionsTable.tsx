import React, { useMemo, useState } from "react";
import { Search, ChevronRight, Copy, Check, Download, Inbox } from "lucide-react";
import type { Row, RowStatus } from "../types";
import { fmtDateTime, fmtUsd, shortAddr, shortHash } from "../format";
import { Avatar, RailChip, StatusPill } from "./bits";

interface RecentTransactionsTableProps {
  rows: Row[];
  onSelectRow: (r: Row) => void;
  onViewAll?: () => void;
  isDetailedView?: boolean;
  loading?: boolean;
}

const STATUS_FILTERS: Array<"All" | RowStatus> = ["All", "Settled", "Awaiting", "Expired"];
const RAIL_FILTERS = ["All", "USDC", "ETH swap", "QR request"] as const;

export const RecentTransactionsTable: React.FC<RecentTransactionsTableProps> = ({
  rows, onSelectRow, onViewAll, isDetailedView = false, loading = false,
}) => {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"All" | RowStatus>("All");
  const [rail, setRail] = useState<(typeof RAIL_FILTERS)[number]>("All");
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    return rows.filter((r) => {
      const matchesSearch = !needle ||
        r.nonce.toLowerCase().includes(needle) ||
        r.tx?.toLowerCase().includes(needle) ||
        r.payer?.toLowerCase().includes(needle) ||
        r.ensName?.toLowerCase().includes(needle);
      const matchesStatus = status === "All" || r.status === status;
      const matchesRail = rail === "All" || r.rail === rail;
      return matchesSearch && matchesStatus && matchesRail;
    });
  }, [rows, q, status, rail]);

  const display = isDetailedView ? filtered : filtered.slice(0, 7);

  const copy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1600);
  };

  const exportCsv = () => {
    const head = ["nonce", "tx_hash", "payer", "usdc_amount", "rail", "status", "time_utc", "block"];
    const lines = filtered.map((r) => [
      r.nonce,
      r.tx ?? "",
      r.payer ?? "",
      r.amount.toFixed(6),
      r.rail,
      r.status,
      r.time ? new Date(r.time * 1000).toISOString() : "",
      r.blockNumber?.toString() ?? "",
    ].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","));
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BasePOS_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full bg-white rounded-[28px] border border-neutral-100 shadow-sm p-4 sm:p-6 my-2 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl font-extrabold text-neutral-900 tracking-tight">
            {isDetailedView ? "All transactions" : "Recent transactions"}
          </h2>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 tabular-nums">
            {filtered.length} total
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200/80 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            title="Export the filtered rows to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {!isDetailedView && onViewAll && (
            <button
              onClick={onViewAll}
              className="inline-flex items-center gap-1 text-xs font-bold text-neutral-700 hover:text-neutral-950 transition-colors cursor-pointer ml-1"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by payer, nonce, or tx hash…"
            className="w-full bg-neutral-50 hover:bg-neutral-100/60 focus:bg-white text-xs font-medium text-neutral-900 placeholder:text-neutral-400 pl-9 pr-4 py-2 rounded-xl border border-neutral-200/80 focus:border-neutral-900 focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={rail}
            onChange={(e) => setRail(e.target.value as (typeof RAIL_FILTERS)[number])}
            className="text-xs font-semibold bg-neutral-100 hover:bg-neutral-200/70 text-neutral-700 px-3 py-1.5 rounded-full border border-neutral-200/60 cursor-pointer focus:outline-none"
            aria-label="Filter by rail"
          >
            {RAIL_FILTERS.map((r) => (
              <option key={r} value={r}>{r === "All" ? "All rails" : r}</option>
            ))}
          </select>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  status === s
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "bg-neutral-100 hover:bg-neutral-200/70 text-neutral-600"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
          <table className="w-full text-left border-collapse min-w-full sm:min-w-[780px]">
            <thead>
              <tr className="border-b border-neutral-100 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                <th className="hidden sm:table-cell py-3 px-2 sm:px-4">Transaction</th>
                <th className="py-3 px-2 sm:px-4">Payer</th>
                <th className="py-3 px-2 sm:px-4">Amount</th>
                <th className="hidden md:table-cell py-3 px-4">Rail</th>
                <th className="py-3 px-2 sm:px-4">Status</th>
                <th className="hidden lg:table-cell py-3 px-4 text-right">Date &amp; time</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-neutral-100/80 text-xs">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-neutral-400">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    Reading PaymentSettled logs…
                  </span>
                </td>
              </tr>
            ) : display.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-neutral-400">
                  <div className="inline-flex flex-col items-center gap-2">
                    <Inbox className="w-6 h-6 text-neutral-300" />
                    <span>{rows.length === 0 ? "No settled payments yet — sign a new charge to ring one up." : "No transactions match your search and filters."}</span>
                  </div>
                </td>
              </tr>
            ) : (
              display.map((r) => {
                const ref = r.tx ?? r.nonce;
                return (
                  <tr
                    key={r.key}
                    tabIndex={0}
                    onClick={() => onSelectRow(r)}
                    onKeyDown={(e) => { if (e.key === "Enter") onSelectRow(r); }}
                    className="hover:bg-neutral-50/80 transition-colors cursor-pointer group outline-none focus:bg-neutral-50"
                  >
                    <td className="hidden sm:table-cell py-3.5 px-2 sm:px-4 font-mono font-medium text-neutral-800">
                      <div className="flex items-center gap-1.5">
                        <span className="group-hover:text-indigo-600 transition-colors font-bold">
                          {r.tx ? shortHash(r.tx) : `nonce ${r.nonce.slice(0, 8)}…`}
                        </span>
                        <button
                          onClick={(e) => copy(e, ref)}
                          className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-neutral-700 transition-opacity p-0.5 rounded cursor-pointer"
                          title="Copy transaction hash"
                        >
                          {copied === ref ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-2 sm:px-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar address={r.payer} size={28} />
                        <div className="min-w-0">
                          <div className="font-bold text-neutral-900 group-hover:text-indigo-600 transition-colors">
                            {r.payer ? shortAddr(r.payer) : (r.ensName || "Charge link")}
                          </div>
                          <div className="text-[11px] text-neutral-400 font-mono truncate max-w-[150px]">
                            {r.status === "Settled" ? "on-chain payer" : "awaiting payment"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-2 sm:px-4 font-bold text-neutral-900 text-sm tabular-nums">
                      {r.status === "Settled" ? "+" : ""}{fmtUsd(r.amount)}
                    </td>

                    <td className="hidden md:table-cell py-3.5 px-4"><RailChip rail={r.rail} /></td>
                    <td className="py-3.5 px-2 sm:px-4"><StatusPill status={r.status} /></td>
                    <td className="hidden lg:table-cell py-3.5 px-4 text-right text-neutral-500 font-medium whitespace-nowrap">
                      {r.time ? fmtDateTime(r.time) : r.blockNumber ? `block ${Number(r.blockNumber).toLocaleString()}` : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
