import React, { useEffect, useRef, useState } from "react";
import {
  PlusCircle, Menu, X, ExternalLink, ChevronDown, Copy, Check,
  FlaskConical, Wallet, Smartphone, ArrowUpRight,
} from "lucide-react";
import { basescanAddress, shortAddr } from "../format";

export type TabType = "Overview" | "Transactions" | "Customers" | "Settings";

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (t: TabType) => void;
  address: string | null;
  ensName: string;
  onConnect: () => void;
  onNewCharge: () => void;
  sandbox: boolean;
  demo: boolean;
}

const TABS: TabType[] = ["Overview", "Transactions", "Customers", "Settings"];

export const Header: React.FC<HeaderProps> = ({
  activeTab, setActiveTab, address, ensName, onConnect, onNewCharge, sandbox, demo,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const copyAddress = () => {
    if (!address) return;
    void navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <header className="w-full relative z-30">
      {sandbox && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between text-xs text-amber-800 font-medium gap-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              <strong>Sandbox · Base Sepolia:</strong> the settlement contract isn't deployed yet — charges sign
              and verify, but payments stop at the contract check.
            </span>
          </div>
          <a
            href="/"
            className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:text-indigo-900 bg-white/80 px-2 py-0.5 rounded-md border border-indigo-200 text-[11px]"
          >
            <Smartphone className="w-3 h-3 text-indigo-600" />
            <span>Customer pay-side</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      )}

      {demo && (
        <div className="bg-orange-500/10 border-b border-orange-500/20 px-3 sm:px-4 py-1.5 text-xs text-orange-800 font-medium">
          <strong>Design preview</strong> — these numbers are sample data (<span className="font-mono">?demo=1</span>).
          Connect MetaMask to replace them with your real on-chain history.
        </div>
      )}

      <div className="flex items-center justify-between py-3.5 px-2 sm:px-4 gap-2">
        {/* brand */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            onClick={() => setActiveTab("Overview")}
            className="flex items-center gap-2 cursor-pointer group"
            title="BasePOS merchant dashboard"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-400 p-0.5 shadow-sm flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-indigo-600 transition-transform group-hover:scale-110"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M16 3h5v5" />
                  <path d="M4 20L21 3" />
                  <path d="M21 16v5h-5" />
                  <path d="M15 15l6 6" />
                  <path d="M4 4l5 5" />
                </svg>
              </div>
            </div>
            <div className="leading-none text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-neutral-900">BasePOS</span>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded">
                  POS
                </span>
              </div>
              <div className="text-[10px] font-semibold text-neutral-400 mt-1 hidden sm:block">
                {ensName || "USDC point of sale · Base Sepolia"}
              </div>
            </div>
          </button>
        </div>

        {/* nav */}
        <nav className="hidden lg:flex items-center bg-[#f0eee9]/80 p-1 rounded-full border border-black/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === tab
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-black/[0.04]"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            onClick={onNewCharge}
            className="inline-flex items-center gap-1 sm:gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full transition-all shadow-xs cursor-pointer shrink-0"
            title="Sign a new payment request and show its QR"
          >
            <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">New charge</span>
            <span className="sm:hidden">Charge</span>
          </button>

          <a
            href="/"
            className="hidden md:inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 px-2 py-1.5 rounded-full hover:bg-black/5"
            title="Open the customer pay-side portal"
          >
            Pay-side <ArrowUpRight className="w-3 h-3" />
          </a>

          {address ? (
            <div className="relative shrink-0" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 py-0.5 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
                aria-label="Merchant wallet menu"
                aria-expanded={profileOpen}
              >
                <div className="relative">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-400 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white shadow-xs">
                    {address.slice(2, 4).toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                </div>
                <div className="hidden xl:block text-left leading-tight">
                  <div className="font-bold text-xs text-neutral-900 flex items-center gap-1">
                    <span className="font-mono">{shortAddr(address)}</span>
                    <ChevronDown className="w-3 h-3 text-neutral-400" />
                  </div>
                  <div className="text-[11px] text-neutral-500 truncate max-w-[120px]">{ensName || "merchant"}</div>
                </div>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-neutral-100 p-3 z-50">
                  <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-400 text-white text-xs font-black flex items-center justify-center ring-2 ring-indigo-50">
                      {address.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-neutral-900 font-mono truncate">{shortAddr(address)}</div>
                      <div className="text-[11px] text-neutral-500 truncate">{ensName || "No ENS set"}</div>
                    </div>
                  </div>

                  <div className="py-2 space-y-1.5 text-xs text-neutral-600">
                    <div className="flex items-center justify-between px-2 py-1 bg-neutral-50 rounded-lg">
                      <span className="text-neutral-400">Network</span>
                      <span className="font-semibold text-neutral-800">Base Sepolia</span>
                    </div>
                    <div className="flex items-center justify-between px-2 py-1 bg-neutral-50 rounded-lg">
                      <span className="text-neutral-400">Chain ID</span>
                      <span className="font-mono font-bold text-neutral-800">84532</span>
                    </div>
                    <div className="flex items-center justify-between px-2 py-1 bg-neutral-50 rounded-lg">
                      <span className="text-neutral-400">Mode</span>
                      <span className="font-bold text-amber-700">Testnet</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 space-y-1">
                    <button
                      onClick={copyAddress}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-100 flex items-center justify-between cursor-pointer"
                    >
                      <span>{copied ? "Copied" : "Copy wallet address"}</span>
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-neutral-500" />}
                    </button>
                    <a
                      href={basescanAddress(address)}
                      target="_blank" rel="noreferrer"
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-100 flex items-center justify-between"
                    >
                      <span>View on BaseScan</span>
                      <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
                    </a>
                    <a
                      href="/"
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-100 flex items-center justify-between"
                    >
                      <span>Customer pay-side</span>
                      <Smartphone className="w-3.5 h-3.5 text-neutral-500" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onConnect}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 sm:py-2 rounded-full transition-colors cursor-pointer shrink-0"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Connect</span>
            </button>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 sm:p-2 rounded-xl text-neutral-700 hover:bg-neutral-100 cursor-pointer shrink-0"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-neutral-200 py-3 px-3 flex flex-col gap-1 bg-white rounded-2xl mb-3 shadow-lg border border-neutral-100">
          <div className="flex items-center justify-between pb-2 mb-1 border-b border-neutral-100 px-1">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Navigation</span>
            <span className="text-xs font-semibold text-neutral-600">{ensName || "Base Sepolia"}</span>
          </div>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setMobileMenuOpen(false); }}
              className={`text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === tab ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              {tab}
            </button>
          ))}
          <div className="pt-2 mt-1 border-t border-neutral-100 flex flex-col gap-2">
            <button
              onClick={() => { onNewCharge(); setMobileMenuOpen(false); }}
              className="w-full text-center py-2 px-3 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200/80 cursor-pointer"
            >
              + New charge (sign & QR)
            </button>
            <a href="/" className="w-full text-center py-2 px-3 rounded-xl bg-neutral-100 text-neutral-800 font-bold text-xs">
              Open customer pay-side
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
