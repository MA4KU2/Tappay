import React, { useState } from "react";
import {
  Wallet, ShieldCheck, Copy, Check, ExternalLink, Network, FileCode2,
  Smartphone, AlertTriangle, CheckCircle2, Globe,
} from "lucide-react";
import { SETTLEMENT, USDC, BASE_RPC, ENS_RPC, CHAIN, ENS_CHAIN, EXPIRY_SECONDS } from "@pos/shared";
import { basescanAddress, fmtUsd, shortAddr } from "../format";
import { Avatar } from "./bits";

interface SettingsViewProps {
  address: string | null;
  ensName: string;
  balance: number | null;
  sandbox: boolean;
  demo?: boolean;
  onConnect?: () => void;
}

const CopyRow: React.FC<{ label: string; value: string; href?: string }> = ({ label, value, href }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="p-3 bg-neutral-50 rounded-xl min-w-0">
      <span className="text-neutral-400 block font-medium text-[11px]">{label}</span>
      <div className="flex items-center gap-2 mt-0.5 min-w-0">
        <span className="text-neutral-900 font-mono font-bold text-[11px] truncate flex-1" title={value}>{value}</span>
        <button onClick={copy} title={`Copy ${label}`} className="text-neutral-400 hover:text-neutral-800 cursor-pointer p-1">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        {href && (
          <a href={href} target="_blank" rel="noreferrer" title="Open explorer" className="text-neutral-400 hover:text-neutral-800 p-1">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
};

export const SettingsView: React.FC<SettingsViewProps> = ({ address, ensName, balance, sandbox, demo = false, onConnect }) => {
  return (
    <div className="space-y-5 max-w-4xl mx-auto pt-1">
      {/* wallet identity */}
      <div className="bg-white rounded-[28px] p-6 border border-neutral-100 shadow-2xs">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-base text-neutral-900">Merchant wallet</h3>
              <p className="text-xs text-neutral-400">Your keys stay in MetaMask — this page only asks it to sign requests</p>
            </div>
          </div>
          <span className={`text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full border whitespace-nowrap shrink-0 ${
            address ? "text-emerald-700 bg-emerald-50 border-emerald-200"
              : demo ? "text-orange-700 bg-orange-50 border-orange-200"
              : "text-neutral-500 bg-neutral-100 border-neutral-200"
          }`}>
            {address ? "Connected" : demo ? "Design preview" : "Not connected"}
          </span>
        </div>

        {address ? (
          <>
            <div className="flex items-center gap-4 mt-5">
              <Avatar address={address} size={52} />
              <div className="min-w-0">
                <div className="font-mono font-bold text-sm text-neutral-900 break-all">{address}</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {ensName ? <span className="font-semibold text-indigo-600">{ensName}</span> : "No ENS name imported yet"}
                  {" · "}
                  <span className="tabular-nums font-semibold text-neutral-800">{balance === null ? "—" : fmtUsd(balance)} USDC</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              <CopyRow label="Wallet address" value={address} href={basescanAddress(address)} />
              <div className="p-3 bg-neutral-50 rounded-xl">
                <span className="text-neutral-400 block font-medium text-[11px]">ENS name used on charges</span>
                <span className="text-neutral-900 font-semibold text-xs">{ensName || "— set one when creating a charge"}</span>
              </div>
            </div>
          </>
        ) : demo ? (
          <div className="mt-5 p-4 rounded-2xl bg-orange-50/60 border border-orange-200">
            <div className="text-xs font-bold text-orange-900">You're looking at sample data</div>
            <p className="text-[11px] text-orange-800/90 mt-1 max-w-xl leading-relaxed">
              The balance shown here ({balance === null ? "—" : fmtUsd(balance)} USDC) is a placeholder for screenshots.
              Open the live dashboard and connect MetaMask to read your real wallet.
            </p>
            <a
              href="/merchant"
              className="mt-3 inline-flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-bold px-3 py-2 rounded-full"
            >
              Open the live dashboard <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <div className="mt-5 p-4 rounded-2xl bg-neutral-50 border border-dashed border-neutral-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-neutral-800">Connect the merchant wallet</div>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Balance, history and charge signing all use the wallet you connect — no keys are stored here.
              </p>
            </div>
            {onConnect && (
              <button
                onClick={onConnect}
                className="inline-flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-bold px-3.5 py-2 rounded-full cursor-pointer shrink-0"
              >
                <Wallet className="w-3.5 h-3.5 text-indigo-300" /> Connect MetaMask
              </button>
            )}
          </div>
        )}
      </div>

      {/* network + contracts */}
      <div className="bg-white rounded-[28px] p-6 border border-neutral-100 shadow-2xs">
        <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-neutral-900">Network &amp; contracts</h3>
            <p className="text-xs text-neutral-400">Everything is testnet — Base Sepolia for payments, Ethereum Sepolia for ENS</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div className="p-3 bg-neutral-50 rounded-xl">
            <span className="text-neutral-400 block font-medium text-[11px]">Payment chain</span>
            <span className="text-neutral-900 font-bold text-sm">Base Sepolia</span>
            <span className="text-neutral-400 font-mono text-[11px] ml-2">chain {CHAIN.id}</span>
          </div>
          <div className="p-3 bg-neutral-50 rounded-xl">
            <span className="text-neutral-400 block font-medium text-[11px]">ENS chain (L1)</span>
            <span className="text-neutral-900 font-bold text-sm">{ENS_CHAIN.name}</span>
            <span className="text-neutral-400 font-mono text-[11px] ml-2">chain {ENS_CHAIN.id}</span>
          </div>
          <CopyRow label="USDC token" value={USDC} href={`https://sepolia.basescan.org/token/${USDC}`} />
          <CopyRow
            label="PaymentSettlement"
            value={SETTLEMENT}
            href={sandbox ? undefined : basescanAddress(SETTLEMENT)}
          />
        </div>

        <div className={`mt-4 p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
          sandbox ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
        }`}>
          {sandbox ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
          <div>
            <div className="font-bold">{sandbox ? "Sandbox — contract not deployed yet" : "Contract deployed on Base Sepolia"}</div>
            <div className="mt-0.5 text-[11px] opacity-90">
              {sandbox
                ? "Charges sign and verify, but customer payments stop at the contract check until SETTLEMENT is set in packages/shared/src/config.ts."
                : "Customer payments route through this contract; settled events fill this dashboard live."}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <CopyRow label="Base RPC" value={BASE_RPC} />
          <CopyRow label="ENS RPC" value={ENS_RPC} />
        </div>
      </div>

      {/* protocol */}
      <div className="bg-white rounded-[28px] p-6 border border-neutral-100 shadow-2xs">
        <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
          <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <FileCode2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-neutral-900">Payment protocol</h3>
            <p className="text-xs text-neutral-400">The customer verifies seven things before the Confirm button unlocks</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs">
          <div className="p-3 bg-neutral-50 rounded-xl">
            <span className="text-neutral-400 block font-medium text-[11px]">EIP-712 domain</span>
            <span className="text-neutral-900 font-bold font-mono">BasePOS · v1</span>
          </div>
          <div className="p-3 bg-neutral-50 rounded-xl">
            <span className="text-neutral-400 block font-medium text-[11px]">Request lifetime</span>
            <span className="text-neutral-900 font-bold">{EXPIRY_SECONDS} seconds</span>
          </div>
        </div>

        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[11px] text-neutral-600">
          {[
            "EIP-712 signature recovers to the merchant",
            "ENS forward record matches the merchant wallet",
            "ENS reverse primary name matches the request",
            "Request has not expired",
            "Chain ID is Base Sepolia (84532)",
            "Settlement contract address matches",
            "Token address is Base Sepolia USDC",
          ].map((c) => (
            <li key={c} className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-px" />
              <span>{c}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 p-3 bg-neutral-50 rounded-xl text-[11px] text-neutral-500">
          Customer rail choice: <strong className="text-neutral-800">pay in USDC</strong> (one approval + one
          <span className="font-mono"> pay()</span>) or <strong className="text-neutral-800">pay with ETH</strong> — the
          contract swaps exactly the requested USDC and refunds the leftover ETH on-chain.
        </div>
      </div>

      {/* links */}
      <div className="bg-white rounded-[28px] p-6 border border-neutral-100 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-700 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-neutral-900">Portals</h3>
              <p className="text-xs text-neutral-400">Till-side (this page) and the customer pay-side</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 px-3 py-2 rounded-full">
              <Smartphone className="w-3.5 h-3.5" /> Pay-side <ExternalLink className="w-3 h-3" />
            </a>
            {address && (
              <a
                href={basescanAddress(address)}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-full"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> BaseScan <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
        <p className="mt-4 text-[11px] text-neutral-400">
          {demo && !address
            ? "Design preview — connect MetaMask on the live dashboard to sign real charges and read your own balance."
            : `Signed in as ${address ? shortAddr(address) : "—"}. Nothing on this page is persisted to a server: history is read from the chain, and the wallet stays the only key holder.`}
        </p>
      </div>
    </div>
  );
};
