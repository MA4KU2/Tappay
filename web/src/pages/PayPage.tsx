import React, { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { formatUnits } from "viem";
import {
  SETTLEMENT,
  decode, verifyRequest, payEth, payUsdc, quoteEthIn, reduce,
  type SignedRequest, type Verification,
} from "@pos/shared";
import { walletClientFor, publicClient } from "../lib/wallet";
import { b64urlDecode, metamaskLink } from "../lib/links";
import type { WalletApi } from "../App";

const CHECK_COPY: Record<keyof Verification["checks"], string> = {
  chain: "right chain (Base Sepolia)",
  contract: "known settlement contract",
  token: "pays USDC and amount > 0",
  notExpired: "request still fresh",
  signature: "signed by the merchant",
  ensForward: "ens name points to merchant",
  ensReverse: "merchant's primary name matches",
};

const pc = publicClient();

type PayPayload = ReturnType<typeof decode>; // SignedRequest + chainId + settlement

export default function PayPage({ wallet }: { wallet: WalletApi }) {
  const [request, setRequest] = useState<PayPayload | null>(null);
  const [badLink, setBadLink] = useState(false);
  const [checks, setChecks] = useState<Verification | null>(null);
  const [modes, dispatch] = useReducer(reduce, { s: "idle" });
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [payMode, setPayMode] = useState<"usdc" | "eth">("usdc");
  const [busy, setBusy] = useState(false);

  /* decode the request out of the QR link */
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("req");
    if (!raw) return;
    try {
      setRequest(decode(b64urlDecode(raw)));
      dispatch({ t: "SCAN" });
    } catch {
      setBadLink(true);
    }
  }, []);

  /* verify as soon as a request arrives (ENS lookups need a second) */
  const doVerify = useCallback(async (r: PayPayload) => {
    dispatch({ t: "VERIFY_START" });
    const v = await verifyRequest(r); // payload chainId + settlement checked against config inside
    setChecks(v);
    dispatch(v.ok ? { t: "VERIFY_OK" } : { t: "VERIFY_FAIL", reason: v.error ?? "checks failed" });
  }, []);

  useEffect(() => {
    if (request) void doVerify(request);
  }, [request, doVerify]);

  /* ticking clock: countdown + expiry */
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const pay = useCallback(async () => {
    if (!request || !checks?.ok || busy) return;
    const address = wallet.address ?? await wallet.connect();
    if (!address) return;
    setBusy(true);
    try {
      const wc = walletClientFor(address);
      const receipt = payMode === "eth"
        ? await payEth(pc, wc, request, (m) => dispatch({ t: "SUBMIT", step: m }))
        : await payUsdc(pc, wc, request, (m) => dispatch({ t: "SUBMIT", step: m }));
      dispatch({ t: "CONFIRMED", tx: receipt.transactionHash });
    } catch (e: any) {
      const refused = e?.code === 4001 || /user rejected|denied/i.test(e?.message ?? "");
      dispatch({ t: "FAILED", error: refused
        ? "You declined the payment — nothing was sent."
        : (e?.shortMessage ?? e?.message ?? "The payment failed on-chain.") });
    } finally {
      setBusy(false);
    }
  }, [request, checks, busy, payMode, wallet]);

  const secondsLeft = useMemo(
    () => (request ? Math.max(0, Number(request.req.expiry) - now) : 0), [request, now]);
  const expired = secondsLeft <= 5;
  const stampOk = checks?.ok === true && !expired;

  /* no request linked: how do you get one? */
  if (!request) {
    return (
      <section className="pay-grid" style={{ marginTop: 12 }}>
        <h2 style={{ fontWeight: 800, fontStretch: "116%", fontSize: 24, lineHeight: 1.15 }}>
          Waiting for a payment request
        </h2>
        <p className="notes">
          Scan the till's QR code with the <strong>MetaMask app</strong> — the code opens this page with
          the request inside the link. Or paste the address <span className="mono">{location.host}</span> into
          MetaMask's browser.
        </p>
        <a className="cta" style={{ textAlign: "center", textDecoration: "none" }}
           href={metamaskLink(location.origin + location.pathname)}>Open in MetaMask</a>
        {!wallet.address && (
          <p className="notes" style={{ fontSize: 12.5, color: "var(--ink-45)" }}>
            On this screen your wallet pays. Its keys stay in MetaMask — this page only asks it to sign.
          </p>
        )}
      </section>
    );
  }

  if (badLink) return null; // unreachable: decode throws before request is set, kept for exhaustiveness

  const { req } = request;

  return (
    <section className="pay-grid" style={{ marginTop: 12 }}>
      <div className="ticket" style={{ display: "grid", gap: 14 }}>
        {SETTLEMENT.startsWith("0x00000000") && (
          <div className="sandbox-banner">
            Sandbox: the settlement contract isn't deployed yet. Requests can still be signed and
            checked, but payments stop at the contract check.
          </div>
        )}

        {/* the engraved value box */}
        <div className="value-box">
          <div className="small-label">Paying</div>
          <div className="value-amount">
            {formatUnits(req.amount, 6)}<span className="unit"> USDC</span>
          </div>
          <div className="value-meta">
            to <strong>{req.ensName || "merchant"}</strong> · expires in {secondsLeft}s
          </div>
        </div>

        {stampOk && <div className="verified-pill">✓ All checks passed — safe to pay</div>}

        {/* security band: the seven checks as printed strip */}
        <div className="security-band" aria-live="polite">
          {(Object.keys(CHECK_COPY) as Array<keyof Verification["checks"]>).map((k) => {
            const state = checks == null ? "wait" : checks.checks[k] ? "ok" : "bad";
            const glyph = state === "ok" ? "✓" : state === "bad" ? "✕" : "…";
            return <span key={k} className={state}>{glyph} {CHECK_COPY[k]}</span>;
          })}
          {checks && !checks.ok && !expired && (
            <span className="band-note">
              {checks.error
                ? `Verification stopped: ${checks.error}`
                : "A red line blocks the Pay button — nothing is sent until every line is green."}
              <button type="button" className="cta-ghost" style={{ padding: "2px 8px", marginLeft: 8, fontSize: 12 }}
                      onClick={() => void doVerify(request)}>
                Re-run checks
              </button>
            </span>
          )}
          {expired && <span className="band-note">Request expired. Ask the till to issue a fresh one.</span>}
        </div>

        <div>
          <div className="kv"><span className="k">Merchant</span><span className="v mono">{short(req.merchant)}</span></div>
          <div className="kv"><span className="k">Nonce (single use)</span><span className="v mono">{short(req.nonce)}</span></div>
        </div>

        {stampOk && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button type="button" className={payMode === "usdc" ? "cta" : "cta-ghost"}
                      onClick={() => setPayMode("usdc")} disabled={busy}>Pay USDC</button>
              <button type="button" className={payMode === "eth" ? "cta" : "cta-ghost"}
                      onClick={() => setPayMode("eth")} disabled={busy}>Pay with ETH</button>
            </div>
            <p className="notes" style={{ fontSize: 12.5 }}>
              {payMode === "eth"
                ? `ETH is swapped for exactly ${formatUnits(req.amount, 6)} USDC on-chain; unspent ETH comes back to you in the same transaction.`
                : "If your USDC allowance doesn't cover the amount yet, an Approve prompt comes first, then the payment — two wallet popups."}
            </p>
            <button type="button" className="cta" onClick={pay} disabled={busy}>
              {modes.s === "submitting"
                ? `${modes.step}…`
                : `Confirm & pay ${formatUnits(req.amount, 6)} USDC`}
            </button>
            {modes.s === "submitting" && (
              <div style={{ display: "grid", gap: 6 }}>
                {payMode === "usdc"
                  ? <>
                      <Ledger label="USDC approved" state={/Approv/i.test(modes.step) ? "active" : "done"} />
                      <Ledger label="Merchant paid" state={/Submit|Paying/i.test(modes.step) ? "active" : "wait"} />
                    </>
                  : <>
                      <Ledger label="ETH cost quoted" state={/Quot/i.test(modes.step) ? "active" : "done"} />
                      <Ledger label="Swapped + merchant paid" state={/Swapp|Submit|Paying/i.test(modes.step) ? "active" : "wait"} />
                    </>}
              </div>
            )}
          </>
        )}

        {modes.s === "confirmed" && (
          <div className="verified-pill" style={{ justifyContent: "center" }}>
            ✓ Paid ·
            <a className="mono" href={`https://sepolia.basescan.org/tx/${modes.tx}`}
               target="_blank" rel="noreferrer" style={{ color: "var(--stamp)" }}>
              {modes.tx.slice(0, 10)}…
            </a>
          </div>
        )}

        {modes.s === "failed" && (
          <div className="danger-banner" role="alert">
            {modes.error}
            <button type="button" className="cta-ghost"
                    style={{ padding: "6px 10px", marginLeft: 8 }}
                    onClick={() => { dispatch({ t: "RESET" }); void doVerify(request); }}>
              Back
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

const short = (a: string) => (a.length > 13 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a);

function Ledger({ label, state }: { label: string; state: "done" | "active" | "wait" }) {
  const cls = state === "done" ? "is-done" : state === "active" ? "is-active" : "";
  return <div className={"ledger-step " + cls}><span className="dot" /> {label}</div>;
}
