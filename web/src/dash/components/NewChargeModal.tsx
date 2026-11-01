import React, { useEffect, useRef, useState } from "react";
import {
  X, Copy, Check, ExternalLink, QrCode, Clock, ShieldCheck, Sparkles,
  AlertCircle, Smartphone, CheckCircle2, RefreshCw, FlaskConical,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { EXPIRY_SECONDS, USDC, domain, types, randomNonce, encode, type PaymentRequest } from "@pos/shared";
import type { Address } from "viem";
import { parseUnits } from "viem";
import { walletClientFor } from "../../lib/wallet";
import { payUrl, metamaskLink, basescanTx } from "../../lib/links";
import type { Charge } from "../types";
import { fmtLeft, fmtUsd } from "../format";

interface NewChargeModalProps {
  open: boolean;
  onClose: () => void;
  address: string | null;
  defaultEns: string;
  sandbox: boolean;
  charges: Charge[];
  onEnsureWallet: () => Promise<string | null>;
  onChargeCreated: (c: Charge) => void;
}

const QUICK = [5, 10, 25, 50];

export const NewChargeModal: React.FC<NewChargeModalProps> = ({
  open, onClose, address, defaultEns, sandbox, charges, onEnsureWallet, onChargeCreated,
}) => {
  const [amount, setAmount] = useState("");
  const [ensName, setEnsName] = useState("");
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string>();
  const [charge, setCharge] = useState<Charge | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [copied, setCopied] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const wasOpen = useRef(false);

  const stored = charge ? charges.find((c) => c.nonce === charge.nonce) : null;
  const tx = stored?.tx;

  const view: "form" | "signing" | "waiting" | "expired" | "paid" =
    !charge ? (signing ? "signing" : "form")
      : tx ? "paid"
      : now >= charge.expiry ? "expired"
      : "waiting";

  /* Reopening the "New charge" button starts fresh unless a request is still live. */
  useEffect(() => {
    if (open && !wasOpen.current) {
      const stillLive = charge && !tx && Math.floor(Date.now() / 1000) < charge.expiry;
      if (!stillLive) {
        setCharge(null);
        setAmount("");
        setError(undefined);
        setCopied(false);
      }
    }
    wasOpen.current = open;
  }, [open, charge, tx]);

  useEffect(() => {
    if (!open) return;
    setNow(Math.floor(Date.now() / 1000));
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setEnsName((v) => v || defaultEns);
    setError(undefined);
    const t = setTimeout(() => amountRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open, defaultEns]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const copyLink = () => {
    if (!charge) return;
    void navigator.clipboard.writeText(charge.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const startAnother = () => {
    setCharge(null);
    setAmount("");
    setError(undefined);
    setCopied(false);
    setTimeout(() => amountRef.current?.focus(), 40);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);

    const clean = amount.trim();
    if (!/^\d+(\.\d{1,6})?$/.test(clean) || Number(clean) <= 0) {
      setError("Enter a USDC amount with up to 6 decimals, like 14.50.");
      return;
    }
    if (!ensName.trim()) {
      setError("Add the ENS name the customer will verify, like bluebottle.eth.");
      return;
    }

    setSigning(true);
    try {
      const merchant = (address ?? (await onEnsureWallet())) as Address | null;
      if (!merchant) {
        setError("Connect MetaMask first — the request must be signed by the wallet that receives the USDC.");
        setSigning(false);
        return;
      }

      const amountUnits = parseUnits(clean, 6);
      const req: PaymentRequest = {
        merchant,
        token: USDC,
        amount: amountUnits,
        nonce: randomNonce(),
        expiry: BigInt(Math.floor(Date.now() / 1000) + EXPIRY_SECONDS),
        ensName: ensName.trim(),
      };
      const wc = walletClientFor(merchant);
      const sig = await wc.signTypedData({
        domain: domain(), types, primaryType: "PaymentRequest" as const, message: req, account: merchant,
      });

      const url = payUrl(encode({ req, sig }));
      const created: Charge = {
        nonce: req.nonce,
        amount: Number(clean),
        ensName: req.ensName,
        createdAt: Math.floor(Date.now() / 1000),
        expiry: Number(req.expiry),
        url,
      };
      setCharge(created);
      onChargeCreated(created);
    } catch (err: any) {
      setError(
        err?.code === 4001 || /user rejected|denied/i.test(err?.message ?? "")
          ? "You declined to sign the request."
          : (err?.shortMessage ?? err?.message ?? "Signing failed — try again."),
      );
    } finally {
      setSigning(false);
    }
  };

  const countdown = charge ? fmtLeft(charge.expiry, now) : "2:00";
  const progress = charge ? Math.max(0, Math.min(100, ((charge.expiry - now) / EXPIRY_SECONDS) * 100)) : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-neutral-100 overflow-hidden my-4"
        role="dialog" aria-modal="true" aria-labelledby="charge-title"
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-neutral-900" id="charge-title">
                {view === "paid" ? "Payment settled" : view === "expired" ? "Request expired" : view === "waiting" ? "Awaiting payment" : "New charge"}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {view === "paid" ? "The USDC is in your wallet"
                  : view === "expired" ? "Nothing was charged — the signature can no longer be used"
                  : view === "waiting" ? "The customer scans and verifies before paying"
                  : "Sign an EIP-712 payment request with MetaMask"}
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

        {/* form */}
        {(view === "form" || view === "signing") && (
          <form onSubmit={submit} className="p-5 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="charge-amount" className="block text-xs font-bold text-neutral-700 mb-1">
                Amount <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-neutral-500 text-sm">$</span>
                <input
                  id="charge-amount"
                  ref={amountRef}
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={signing}
                  className="w-full bg-neutral-50 pl-8 pr-16 py-2.5 rounded-xl text-base font-black text-neutral-900 border border-neutral-200 focus:outline-none focus:border-neutral-900 focus:bg-white tabular-nums placeholder:text-neutral-400 placeholder:font-semibold"
                  placeholder="14.50"
                  autoComplete="off"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-neutral-400">USDC</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {QUICK.map((v) => (
                  <button
                    key={v}
                    type="button"
                    disabled={signing}
                    onClick={() => setAmount(String(v))}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                      amount === String(v)
                        ? "bg-neutral-900 border-neutral-900 text-white"
                        : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    ${v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="charge-ens" className="block text-xs font-bold text-neutral-700 mb-1">
                Customer pays to <span className="text-rose-500">*</span>
              </label>
              <input
                id="charge-ens"
                value={ensName}
                onChange={(e) => setEnsName(e.target.value)}
                disabled={signing}
                className="w-full bg-neutral-50 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-neutral-900 border border-neutral-200 focus:outline-none focus:border-neutral-900 focus:bg-white placeholder:text-neutral-400 placeholder:font-medium"
                placeholder="bluebottle.eth"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                The customer checks this name resolves to <span className="font-mono">{address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "your wallet"}</span>{" "}
                on Ethereum Sepolia before letting them pay.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 text-[11px] text-neutral-500 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-neutral-700">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> What signing does
              </div>
              <p>
                MetaMask signs a typed request — it moves no funds and costs no gas. The request is valid for{" "}
                <strong className="text-neutral-700">{EXPIRY_SECONDS} seconds</strong> and can settle only once, straight
                into your wallet.
              </p>
            </div>

            {sandbox && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                <FlaskConical className="w-4 h-4 shrink-0 mt-px" />
                <span>
                  <strong>Sandbox:</strong> the settlement contract isn't deployed, so the customer's verify step will
                  stop at the contract check. Signing and the QR still work.
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-neutral-500 hover:text-neutral-800 cursor-pointer">
                Cancel
              </button>
              <button
                type="submit"
                disabled={signing}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-wait text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                {signing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-400" />}
                <span>{signing ? "Waiting for MetaMask…" : "Sign & show QR"}</span>
              </button>
            </div>
          </form>
        )}

        {/* waiting */}
        {(view === "waiting" || view === "expired") && charge && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className={`rounded-2xl p-4 border ${
              view === "expired" ? "bg-stone-50 border-stone-200" : "bg-amber-50/70 border-amber-200"
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-2xl font-black text-neutral-900 tabular-nums">{fmtUsd(charge.amount)}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    to <span className="font-semibold text-neutral-700">{charge.ensName}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                    view === "expired" ? "bg-stone-200 text-stone-600" : "bg-white text-amber-700 border border-amber-200"
                  }`}>
                    {view === "expired" ? <Clock className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                    {view === "expired" ? "Expired" : "Awaiting payment"}
                  </div>
                  <div className={`text-lg font-extrabold tabular-nums mt-1 ${view === "expired" ? "text-stone-400" : "text-neutral-900"}`}>
                    {view === "expired" ? "0:00" : countdown}
                  </div>
                </div>
              </div>
              {view === "waiting" && (
                <div className="mt-3 h-1.5 w-full bg-amber-200/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>

            {view === "waiting" ? (
              <>
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-2xs">
                    <QRCodeSVG value={charge.url} size={188} level="M" fgColor="#18181b" bgColor="#ffffff" />
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-neutral-50 rounded-2xl border border-neutral-200">
                  <span className="text-[11px] font-mono text-neutral-700 truncate flex-1 select-all">{charge.url}</span>
                  <button
                    onClick={copyLink}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-200 text-xs font-bold text-neutral-800 flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={metamaskLink(charge.url)}
                    target="_blank" rel="noreferrer"
                    className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5"
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Open in MetaMask
                  </a>
                  <a
                    href={charge.url}
                    target="_blank" rel="noreferrer"
                    className="py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open pay page
                  </a>
                </div>

                <p className="text-[11px] text-neutral-400 text-center leading-relaxed">
                  This page updates itself the moment the <span className="font-mono">PaymentSettled</span> event lands.
                  You can close the dialog — the request stays under Transactions → Charge links.
                </p>
              </>
            ) : (
              <>
                <div className="py-4 flex flex-col items-center text-center gap-1.5">
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="font-extrabold text-sm text-neutral-800">The 2-minute window closed</div>
                  <p className="text-xs text-neutral-500 max-w-sm">
                    No payment arrived, so the signed request can't be used anymore. Sign a fresh one when the customer is ready.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={startAnother}
                    className="flex-1 py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-indigo-400" /> New charge
                  </button>
                  <button
                    onClick={onClose}
                    className="py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* paid */}
        {view === "paid" && charge && tx && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="py-5 flex flex-col items-center text-center gap-2">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Paid in USDC</div>
              <div className="text-3xl font-black text-neutral-900 tabular-nums">{fmtUsd(charge.amount)}</div>
              <div className="text-xs text-neutral-500">
                to <span className="font-semibold text-neutral-700">{charge.ensName}</span>
              </div>
            </div>

            <div className="p-4 bg-neutral-50 rounded-2xl space-y-2 text-xs border border-neutral-100">
              <div className="flex justify-between gap-3">
                <span className="text-neutral-500">Receipt</span>
                <a
                  href={basescanTx(tx)}
                  target="_blank" rel="noreferrer"
                  className="font-mono font-bold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1"
                >
                  {tx.slice(0, 12)}… <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-neutral-500">Merchant</span>
                <span className="font-mono font-semibold text-neutral-800">{charge.ensName}</span>
              </div>
              <div className="flex justify-between gap-3 pt-1 border-t border-neutral-200/60">
                <span className="text-neutral-500">Status</span>
                <span className="font-bold text-emerald-700">Settled on-chain</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={startAnother}
                className="flex-1 py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-indigo-400" /> Next charge
              </button>
              <button
                onClick={onClose}
                className="py-2.5 px-5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl font-bold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
