import React, { useEffect, useState } from "react";
import type { Address } from "viem";
import { connectInjected, hasInjected, watchAccounts } from "./lib/wallet";
import PayPage from "./pages/PayPage";
import MerchantPage from "./pages/MerchantPage";
import SimPage from "./pages/SimPage";
import "./sim.css";

export interface WalletApi { address: Address | null; connect: () => Promise<Address | null> }

/* Path routing, no router dependency:
   /           pay-side  (customer portal; /pay works too)
   /merchant   till-side (merchant portal)
   /sim        legacy two-phone simulation (fallback demo) */

const isMobile = () => /android|iphone|ipad/i.test(navigator.userAgent);

export default function App() {
  const [address, setAddress] = useState<Address | null>(null);
  const path = window.location.pathname;

  useEffect(() => watchAccounts((a) => setAddress(a)), []);

  const connect = async (): Promise<Address | null> => {
    if (!hasInjected()) {
      // No injected provider — on a phone, hand off to the MetaMask in-app browser.
      if (isMobile()) {
        location.href = `https://metamask.app.link/dapp/${location.host}${location.pathname}${location.search}`;
      }
      return null;
    }
    try { const a = await connectInjected(); setAddress(a); return a; } catch { return null; }
  };

  const wallet: WalletApi = { address, connect };

  if (path.endsWith("/sim")) return <SimPage />;

  if (path.endsWith("/merchant")) return <MerchantPage wallet={wallet} />;

  return (
    <div className="shell">
      <header className="head">
        <a className="wordmark" href="/">Base<b>POS</b></a>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a className="wallet-chip" style={{ textDecoration: "none" }} href="/merchant">
            till-side view
          </a>
          <button
            className={"wallet-chip" + (address ? " is-live" : "")}
            type="button"
            onClick={wallet.connect}
            disabled={!hasInjected() && !isMobile()}
            title={address ? "" : hasInjected() ? "Connect your wallet" : "Open this page in the MetaMask app"}
          >
            {address
              ? `${address.slice(0, 6)}…${address.slice(-4)}`
              : (hasInjected() ? "Connect wallet" : "Wallet: use MetaMask app")}
          </button>
        </div>
      </header>

      <PayPage wallet={wallet} />

      <footer className="notes" style={{ marginTop: 28, color: "var(--ink-45)", fontSize: 12 }}>
        Base Sepolia (84532) · USDC settled by the PaymentSettlement contract · requests expire in 2 minutes.
        The earlier two-phone simulation is still at <span className="mono">/sim</span>.
      </footer>
    </div>
  );
}
