import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatUnits } from "viem";
import { createPublicClient, http, type Address } from "viem";
import {
  SETTLEMENT, ENS_CHAIN, ENS_RPC, settlementAbi, watchSettlement,
} from "@pos/shared";
import { hasInjected, publicClient } from "../lib/wallet";
import { fetchMerchantHistory, saleFromLog, usdcBalance, type Sale } from "../lib/merchant-data";
import type { WalletApi } from "../App";
import { Header, type TabType } from "../dash/components/Header";
import { TopMetrics } from "../dash/components/TopMetrics";
import { AnalyticsCards } from "../dash/components/AnalyticsCards";
import { RecentTransactionsTable } from "../dash/components/RecentTransactionsTable";
import { TransactionsView } from "../dash/components/TransactionsView";
import { CustomersView } from "../dash/components/CustomersView";
import { SettingsView } from "../dash/components/SettingsView";
import { NewChargeModal } from "../dash/components/NewChargeModal";
import { TransactionDetailModal } from "../dash/components/TransactionDetailModal";
import { saleToRow, chargeToRow, buildDays, computeStats, type Row, type Charge } from "../dash/types";
import { demoSales, DEMO_BALANCE } from "../dash/demo";
import { shortAddr, fmtUsd } from "../dash/format";
import {
  Wallet, ShieldCheck, QrCode, Radio, ArrowUpRight, Smartphone,
  FlaskConical, RefreshCw, AlertTriangle,
} from "lucide-react";

const pc = publicClient();
const SANDBOX = SETTLEMENT.startsWith("0x00000000");
const Q = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
const DEMO = Q.has("demo");

const CHARGES_KEY = "basepos.charges.v1";
const ENS_KEY = "basepos.ens.v1";
const DAY = 86_400;

/* ── persistence for signed charge links (public payloads, no keys) ───── */
function loadCharges(): Charge[] {
  if (DEMO || typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(CHARGES_KEY) ?? "[]") as Charge[];
    if (!Array.isArray(raw)) return [];
    const cutoff = Math.floor(Date.now() / 1000) - DAY;
    return raw.filter((c) =>
      c && typeof c.nonce === "string" && typeof c.url === "string" &&
      typeof c.amount === "number" && typeof c.createdAt === "number" && c.createdAt >= cutoff,
    );
  } catch {
    return [];
  }
}

function mergeSales(base: Sale[], fresh: Sale[]): Sale[] {
  const next = [...base];
  for (const s of fresh) {
    const i = next.findIndex((x) => x.nonce.toLowerCase() === s.nonce.toLowerCase());
    if (i >= 0) {
      if (!next[i].time && s.time) next[i] = { ...next[i], time: s.time };
    } else next.unshift(s);
  }
  return next.sort((a, b) => (b.time ?? 0) - (a.time ?? 0) || Number(b.blockNumber - a.blockNumber));
}

export default function MerchantPage({ wallet }: { wallet: WalletApi }) {
  const addr = wallet.address;
  const [tab, setTab] = useState<TabType>(() => {
    const t = Q.get("tab");
    return t === "transactions" ? "Transactions" : t === "customers" ? "Customers" : t === "settings" ? "Settings" : "Overview";
  });
  const [sales, setSales] = useState<Sale[] | null>(DEMO ? demoSales() : null);
  const [balance, setBalance] = useState<bigint | null>(DEMO ? DEMO_BALANCE : null);
  const [charges, setCharges] = useState<Charge[]>(loadCharges);
  const [ensName, setEnsName] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(ENS_KEY) ?? "";
  });
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [range, setRange] = useState<7 | 14>(14);
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);

  const chargeWatchers = useRef<Map<string, () => void>>(new Map());

  /* ticks the countdowns and "today" buckets */
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  /* stop watchers when the merchant changes or the page unmounts */
  useEffect(() => () => {
    for (const unwatch of chargeWatchers.current.values()) unwatch();
    chargeWatchers.current.clear();
  }, [addr]);

  /* remember signed links + preferred ENS */
  useEffect(() => {
    if (DEMO) return;
    try { localStorage.setItem(CHARGES_KEY, JSON.stringify(charges.slice(0, 40))); } catch { /* quota */ }
  }, [charges]);

  const rememberEns = useCallback((name: string) => {
    setEnsName(name);
    try { localStorage.setItem(ENS_KEY, name); } catch { /* ignore */ }
  }, []);

  /* resolve the connected wallet's primary ENS name (Ethereum Sepolia) */
  useEffect(() => {
    if (DEMO || !addr) return;
    let cancelled = false;
    (async () => {
      try {
        const ensPc = createPublicClient({ chain: ENS_CHAIN as any, transport: http(ENS_RPC) });
        const name = await (ensPc as any).getEnsName({ address: addr as Address });
        if (!cancelled && name) rememberEns(name);
      } catch { /* no reverse record — keep whatever the merchant typed */ }
    })();
    return () => { cancelled = true; };
  }, [addr, rememberEns]);

  /* real chain data: history, balance, live settlement events */
  useEffect(() => {
    if (DEMO || !addr) return;
    let cancelled = false;
    let unwatchLive: (() => void) | undefined;

    (async () => {
      setError(undefined);
      setSales(null);
      try {
        const [hist, bal] = await Promise.all([
          fetchMerchantHistory(pc, addr),
          usdcBalance(pc, addr).catch(() => null),
        ]);
        if (cancelled) return;
        setSales(hist);
        if (bal !== null) setBalance(bal);
        // a persisted charge may have been paid while this tab was closed
        setCharges((prev) => prev.map((c) => {
          const sale = hist.find((s) => s.nonce.toLowerCase() === c.nonce.toLowerCase());
          return sale && !c.tx ? { ...c, tx: sale.tx } : c;
        }));
      } catch (e: any) {
        if (cancelled) return;
        setSales([]);
        setError(e?.shortMessage ?? e?.message ?? "Could not read the chain — retry in a moment.");
      }
    })();

    if (!SANDBOX) {
      unwatchLive = (pc as any).watchContractEvent({
        address: SETTLEMENT,
        abi: settlementAbi as any,
        eventName: "PaymentSettled" as const,
        args: { merchant: addr },
        onLogs: async (logs: any[]) => {
          const fresh: Sale[] = [];
          for (const log of logs) {
            const s = saleFromLog(log);
            try {
              s.time = Number((await pc.getBlock({ blockNumber: log.blockNumber })).timestamp);
            } catch { /* time stays null until retried */ }
            fresh.push(s);
          }
          if (!fresh.length) return;
          setSales((prev) => mergeSales(prev ?? [], fresh));
          setCharges((prev) => prev.map((c) => {
            const hit = fresh.find((s) => s.nonce.toLowerCase() === c.nonce.toLowerCase());
            return hit && !c.tx ? { ...c, tx: hit.tx } : c;
          }));
          void usdcBalance(pc, addr).then(setBalance).catch(() => {});
        },
      });
    }

    return () => { cancelled = true; unwatchLive?.(); };
  }, [addr, attempt]);

  /* one watcher per live charge — works even after the dialog is closed */
  const watchCharge = useCallback((c: Charge, merchant: string) => {
    if (SANDBOX || chargeWatchers.current.has(c.nonce)) return;
    const unwatch = watchSettlement(pc, merchant as Address, c.nonce as `0x${string}`, (tx) => {
      setCharges((prev) => prev.map((x) => (x.nonce === c.nonce ? { ...x, tx } : x)));
      chargeWatchers.current.get(c.nonce)?.();
      chargeWatchers.current.delete(c.nonce);
      void usdcBalance(pc, merchant as Address).then(setBalance).catch(() => {});
    });
    chargeWatchers.current.set(c.nonce, unwatch);
  }, []);

  useEffect(() => {
    if (DEMO || !addr) return;
    for (const c of charges) {
      if (!c.tx && now < c.expiry) watchCharge(c, addr);
    }
  }, [DEMO, addr, charges, now, watchCharge]);

  const onChargeCreated = useCallback((c: Charge) => {
    setCharges((prev) => [c, ...prev.filter((x) => x.nonce !== c.nonce)]);
    rememberEns(c.ensName);
    if (addr) watchCharge(c, addr);
  }, [addr, rememberEns, watchCharge]);

  /* ── derived view models ─────────────────────────────────────────── */
  const rows = useMemo(() => {
    const byNonce = new Map<string, Row>();
    for (const c of charges) byNonce.set(c.nonce, chargeToRow(c, now));
    for (const s of sales ?? []) byNonce.set(s.nonce, saleToRow(s)); // settled sale is richer
    return [...byNonce.values()].sort((a, b) => (b.time ?? 0) - (a.time ?? 0));
  }, [sales, charges, now]);

  const stats = useMemo(() => computeStats(rows, now), [rows, now]);
  const days = useMemo(() => buildDays(rows, now, 14), [rows, now]);
  const balanceNum = balance === null ? null : Number(formatUnits(balance, 6));
  const loading = !DEMO && !sales;
  const avgTicket = stats.settledCount > 0 ? stats.total / stats.settledCount : 0;

  const connect = async () => {
    const a = await wallet.connect();
    if (!a && !hasInjected()) setError("No wallet extension here — open this page in the MetaMask app, or install MetaMask.");
  };

  const greeting = now < 12 ? "Good morning" : now < 17 ? "Good afternoon" : "Good evening";

  /* ── shell ───────────────────────────────────────────────────────── */
  return (
    <div className="merchant-app min-h-screen bg-[#edeae4] text-neutral-900 p-2 sm:p-4 md:p-6 lg:p-8 flex justify-center items-start w-full overflow-x-hidden">
      <main className="w-full max-w-[1440px] bg-[#fdfcfb] sm:bg-white rounded-[28px] sm:rounded-[36px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.04)] p-3 sm:p-6 lg:p-8 space-y-5 overflow-hidden">
        <Header
          activeTab={tab}
          setActiveTab={setTab}
          address={addr}
          ensName={ensName}
          onConnect={() => void connect()}
          onNewCharge={() => setChargeOpen(true)}
          sandbox={SANDBOX}
          demo={DEMO}
        />

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 flex flex-wrap items-center gap-3" role="alert">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="flex-1 min-w-[200px]">{error}</span>
            {!DEMO && addr && (
              <button
                onClick={() => setAttempt((a) => a + 1)}
                className="inline-flex items-center gap-1.5 font-bold text-rose-900 bg-white/70 border border-rose-200 px-2.5 py-1 rounded-full cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            )}
          </div>
        )}

        {/* not connected — landing */}
        {!addr && !DEMO ? (
          <div className="py-2">
            <div className="relative overflow-hidden rounded-[28px] sm:rounded-[36px] border border-neutral-100 bg-gradient-to-br from-indigo-50 via-white to-rose-50 p-6 sm:p-10">
              <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-indigo-200/30 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-rose-200/30 blur-3xl pointer-events-none" />
              <div className="relative grid lg:grid-cols-2 gap-8 items-center">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-white/80 border border-indigo-100 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Base Sepolia · testnet
                  </span>
                  <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-neutral-900">
                    {greeting}. Your till, on-chain.
                  </h1>
                  <p className="mt-3 text-sm text-neutral-600 max-w-lg leading-relaxed">
                    Connect the merchant wallet to see its live USDC balance and every{" "}
                    <span className="font-mono text-[13px]">PaymentSettled</span> event. Sign a charge and the customer
                    pays you directly — the app never holds the money or the keys.
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => void connect()}
                      className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm px-5 py-3 rounded-full transition-all shadow-sm cursor-pointer"
                    >
                      <Wallet className="w-4 h-4 text-indigo-300" /> Connect MetaMask
                    </button>
                    <a
                      href="?demo=1"
                      className="inline-flex items-center gap-1.5 bg-white/80 hover:bg-white text-neutral-800 border border-neutral-200 font-bold text-xs px-4 py-3 rounded-full"
                    >
                      <FlaskConical className="w-3.5 h-3.5 text-orange-500" /> Preview with sample data
                    </a>
                    <a href="/" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 px-2 py-3">
                      Customer pay-side <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <p className="mt-3 text-[11px] text-neutral-500">
                    {hasInjected()
                      ? "MetaMask is available — the page only asks it to sign typed payment requests."
                      : "No wallet extension detected? Open this page inside the MetaMask app's browser."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: <Wallet className="w-4 h-4" />, t: "Live USDC balance", d: "Read straight from the USDC contract for your wallet." },
                    { icon: <Radio className="w-4 h-4" />, t: "Real settlement history", d: "PaymentSettled logs, scanned on Base Sepolia." },
                    { icon: <QrCode className="w-4 h-4" />, t: "EIP-712 charge links", d: "MetaMask signs; QR and link expire in 2 minutes." },
                    { icon: <ShieldCheck className="w-4 h-4" />, t: "ENS-verified payers", d: "Customers check your name before paying." },
                  ].map((f) => (
                    <div key={f.t} className="rounded-2xl bg-white/80 backdrop-blur-sm border border-neutral-200/70 p-4">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">{f.icon}</div>
                      <div className="mt-2.5 font-extrabold text-xs text-neutral-900">{f.t}</div>
                      <div className="mt-0.5 text-[11px] text-neutral-500 leading-relaxed">{f.d}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-[28px] border border-neutral-100 shadow-sm p-10 flex flex-col items-center justify-center gap-3">
            <span className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-indigo-500 animate-spin" />
            <div className="font-extrabold text-sm text-neutral-800">Reading your on-chain history…</div>
            <p className="text-xs text-neutral-400">Scanning PaymentSettled logs for {addr ? shortAddr(addr) : "this wallet"} on Base Sepolia.</p>
          </div>
        ) : tab === "Overview" ? (
          <div className="space-y-5">
            <TopMetrics
              balance={balanceNum}
              address={addr}
              demo={DEMO}
              today={stats.today}
              yesterday={stats.yesterday}
              growth={stats.growth}
              days={days}
              range={range}
              onRangeChange={setRange}
              onViewAll={() => setTab("Transactions")}
            />

            <AnalyticsCards
              today={stats.today}
              todayCount={stats.todayCount}
              avgTicket={avgTicket}
              total={stats.total}
              settledCount={stats.settledCount}
              usdcShare={stats.usdcShare}
              ethShare={stats.ethShare}
              rows={rows}
              days={days}
              onNewCharge={() => setChargeOpen(true)}
              onSelectRow={setSelected}
              onViewAll={() => setTab("Transactions")}
            />

            <RecentTransactionsTable
              rows={rows}
              onSelectRow={setSelected}
              onViewAll={() => setTab("Transactions")}
            />

            <p className="text-[11px] text-neutral-400 px-2">
              Totals come from <span className="font-mono">PaymentSettled</span> logs in the last ~500k blocks (≈ 11.5 days).
              {DEMO ? " Sample rows are shown because of ?demo=1." : " Live sales stream in without a refresh."}
            </p>
          </div>
        ) : tab === "Transactions" ? (
          <TransactionsView
            rows={rows}
            charges={charges}
            now={now}
            loading={false}
            onSelectRow={setSelected}
            onNewCharge={() => setChargeOpen(true)}
          />
        ) : tab === "Customers" ? (
          <CustomersView rows={rows} />
        ) : (
          <SettingsView
            address={addr}
            ensName={ensName}
            balance={balanceNum}
            sandbox={SANDBOX}
            demo={DEMO}
            onConnect={() => void connect()}
          />
        )}

        <footer className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>
              BasePOS · Base Sepolia (84532) · USDC settled by <span className="font-mono">PaymentSettlement</span>
            </span>
          </div>
          <div className="flex items-center gap-4 font-medium">
            <span className="tabular-nums">
              {DEMO ? "sample data" : `${fmtUsd(stats.total, stats.total < 1000)} in scanned window`}
            </span>
            <a href="/" className="inline-flex items-center gap-1 hover:text-neutral-800 font-bold text-indigo-600">
              <Smartphone className="w-3 h-3" /> Customer pay-side
            </a>
          </div>
        </footer>
      </main>

      <NewChargeModal
        open={chargeOpen}
        onClose={() => setChargeOpen(false)}
        address={addr}
        defaultEns={ensName}
        sandbox={SANDBOX}
        charges={charges}
        onEnsureWallet={() => wallet.connect()}
        onChargeCreated={onChargeCreated}
      />

      <TransactionDetailModal
        row={selected}
        now={now}
        onClose={() => setSelected(null)}
        onNewCharge={() => { setSelected(null); setChargeOpen(true); }}
      />
    </div>
  );
}
