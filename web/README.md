# BasePOS web portals

Two pages, one dev server. The merchant signs, the customer pays — both through **their own wallet**
(MetaMask injects `window.ethereum`; the app never touches private keys).

The `/merchant` dashboard is a port of the PayFlux visual design (AI Studio reference lives in
`../payflux-merchant-dashboard/`) rebranded to BasePOS/USDC and wired to real chain data. Styling is
Tailwind v4 (`@tailwindcss/vite`), with the dashboard components under `src/dash/`. The pay side keeps the
original hand-written CSS in `src/index.css`.

## Run

```bash
npm install
npm run dev        # → http://localhost:5173  (host is on, so LAN devices can use http://<pc-ip>:5173)
```

## Pages

| URL | Role |
| --- | --- |
| `/merchant` | **merchant dashboard**: connect wallet → live USDC balance, today's revenue, 14-day volume bars, payment mix, recent activity; tabs for **Transactions** (all `PaymentSettled` events, filters + CSV), **Customers** (wallets grouped from settled events) and **Settings** (network/contract facts). **New charge** in the header signs an EIP-712 request with MetaMask and shows the QR/link with a 2-minute countdown; signed links are kept in `localStorage` for 24h and live under Transactions → Charge links. |
| `/` | **pay-side**: opened by scanning that QR — decodes the request, runs the 7 verification checks (shows each pass/fail), then `Confirm & pay` via USDC (optionally ETH, which swaps exact USDC and refunds the rest) |
| `/sim` | legacy two-phone simulation (fallback visuals, not the real flow) |

`?demo=1` on `/merchant` renders clearly labelled sample rows/balance for design previews and stage
rehearsal; connecting MetaMask or dropping the flag uses real chain data. A `?tab=transactions|customers|settings`
query opens a given tab directly.

## Data

- History: `PaymentSettled` logs filtered by merchant, scanned in 250k-block chunks over the last 500k blocks
  (≈ 11.5 days on Base Sepolia's 2s blocks). New sales stream in through `watchContractEvent`.
- Balance: `balanceOf` on Base Sepolia USDC.
- Transaction timestamps are resolved from block headers after the log scan (rows show the block number until
  then).
- Charge links are public payloads (request + signature), never keys.

## Demo notes

- Scan the merchant QR **with the MetaMask app** — it opens `/pay?req=…` inside MetaMask's browser so the
  payment can be signed. On phones without MetaMask installed, the pay page offers a deep link
  (`metamask.app.link/dapp/…`).
- The settlement address lives in `packages/shared/src/config.ts → SETTLEMENT`. While it's the zero address,
  both portals show a sandbox banner and payments stop at the contract check.
- Typecheck: `npx tsc --noEmit -p tsconfig.json` · build: `npm run build`.

## Styling gotcha

Tailwind v4 emits utilities inside cascade layers. `src/index.css` must not set unlayered global margins/
padding (it currently only sets `* { box-sizing: border-box; }`), or utilities like `mx-auto`, `space-y-*`
and `py-*` silently lose. Import order in `src/main.tsx`: `dash.css` (Tailwind entry) first, then `index.css`.
