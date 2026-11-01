# AGENTS.md

TapPay / BasePOS: two-phone USDC point of sale on **Base Sepolia** (chain 84532). Merchant phone signs an
EIP-712 payment request and emits it over NFC (HCE) or QR; customer phone verifies (7 checks, all required —
signature, ENS forward + reverse, expiry, chain, contract, token) then settles through `PaymentSettlement`
(`pay()` with USDC approval, or `payWithEth()` which swaps exact USDC out and refunds excess ETH).

`README.md` (root) is the real documentation. `contracts/README.md` is untouched Foundry template boilerplate
(it references `Counter.s.sol`, which does not exist) — ignore it.

## Layout

Four independent packages, **no root package.json / no workspaces** — install and run each separately.

- `packages/shared/` (`@pos/shared`) — protocol core: EIP-712 domain/types, wire JSON `encode()/decode()`,
  `verifyRequest()`, settlement calls, payment state machine (`state.ts`). No build step; consumed as raw TS.
- `apps/mobile/` — Expo Android dev build. Imports `@pos/shared` via `file:../../packages/shared`.
- `web/` — **the real portals** (vite + React): `/merchant` (merchant dashboard ported from the PayFlux AI Studio
  design — live USDC balance, 14-day volume, payment mix, and transactions/customers/settings tabs from real
  `PaymentSettled` logs; header **New charge** modal signs an EIP-712 request with MetaMask and shows QR/link +
  2-minute countdown; `?demo=1` shows labelled sample data) and `/` (pay-side: decode, 7-check verify, pay
  USDC/ETH). Dashboard components live in `src/dash/` and use Tailwind v4 (`@tailwindcss/vite`, entry
  `src/dash/dash.css`); the pay side keeps `src/index.css`.
  `src/lib/wallet.ts` drives the wallet via `window.ethereum` (no wagmi/WalletConnect); the QR payload is a URL
  whose query carries the base64url'd shared `encode()` output. `/sim` keeps the earlier simulation demo
  (`crypto-sim.ts` — fake keys/settlement, don't touch it).
- `contracts/` — Foundry: `src/PaymentSettlement.sol`, `script/Deploy.s.sol`, 5 tests in `test/`.
- `test-e2e/` — end-to-end test against the real contract on a local Hardhat chain.

## Commands

- Contract tests: `cd contracts && forge test` (5 tests; forge lives at `~/.config/.foundry/bin` on this machine).
- Deploy (Base Sepolia): `cd contracts && export PK=0x… && forge script script/Deploy.s.sol:Deploy
  --rpc-url https://sepolia.base.org --broadcast`, then paste the printed address into `SETTLEMENT` in
  `packages/shared/src/config.ts`. The script pins Base Sepolia USDC/WETH/SwapRouter02 + `POOL_FEE 3000`.
- Typecheck shared: `cd packages/shared && npm install && npx tsc --noEmit -p tsconfig.json` (strict; no lockfile).
- Web: `cd web && npm run build` (vite). Typecheck via the web `tsconfig.json`:
  `npx tsc --noEmit -p tsconfig.json` (strict; alias maps `@pos/shared` to raw TS sources).
- E2E: `cd test-e2e && npm i && npm test` — 13 assertions, all passing. The script rebuilds `artifacts.json`,
  starts its own `hardhat node` (needs port 8545 free, ~1 min total), then kills it. Needs no external chain.
- Mobile: `cd apps/mobile && npm i && npx expo prebuild && npx expo run:android` (two phones; NFC + QR paths,
  or `--variant release` for a standalone demo APK).

## Gotchas

- **ENS is on Ethereum Sepolia (L1), not Base.** `packages/shared/src/config.ts` has `ENS_CHAIN`/`ENS_RPC`
  separate from payment `CHAIN`/`BASE_RPC`. Verification requires the merchant ENS name's owner == address
  record == primary name == request signer (use Merchant screen → "Use my own wallet" to import that key).
- **Pending deploy step:** `SETTLEMENT` in `packages/shared/src/config.ts` is the zero address; until you
  deploy and paste the real address there, customer requests stop at the contract check (the UI shows a
  sandbox banner on both portals).
- **No `forge install`:** both `forge-std` and OpenZeppelin v5.1.0 are vendored/committed under
  `contracts/lib/`, with fixed remappings in `foundry.toml` (solc 0.8.24, `evm_version = cancun`).
- Root `lib/openzeppelin-contracts` is a **stale gitlink** (empty dir, no `.gitmodules` entry); the real OZ
  source lives at `contracts/lib/openzeppelin-contracts`. `git submodule status` chokes on the root entry.
- **ABI duplication is intentional but hand-kept:** `packages/shared/src/abi.ts` mirrors
  `PaymentSettlement.sol`. EIP-712 domain is fixed: name `"BasePOS"`, version `"1"`; `PaymentRequest` field
  order matters for hashing. Changing the contract requires touching `abi.ts` + `request.ts` types.
- ETH path details: customer sends quote + 2% (`SLIPPAGE_BPS` 200); the contract's `payWithEth` refunds the
  difference on-chain and must hold 0 ETH after. Pool is 0.3% WETH/USDC (`POOL_FEE` 3000) — needs liquidity on
  Sepolia, else swaps revert (`SwapShort`).
- **Metro quirks:** `apps/mobile/metro.config.js` adds `packages/shared` to `watchFolders` and
  `unstable_enablePackageExports` (needed for viem subpath imports like `viem/ens`, `viem/chains`) — don't
  remove either.
- `apps/mobile/index.js` imports `react-native-get-random-values` (viem randomness / signing) — keep it
  the first import.
- `web` and `packages/shared` each install their own `viem` copy → two type universes under tsc. The web
  `tsconfig.json` maps `@pos/shared` (raw TS) and `src/lib/wallet.ts` casts `CHAIN`/clients to `any` at that
  one glue boundary; don't re-strictify it without unifying viem versions (runtime is fine — vite
  resolves shared's own copy).
- **Tailwind v4 layering:** dashboard utilities live in cascade layers. Keep `web/src/index.css` free of
  unlayered global resets (it only sets `* { box-sizing: border-box; }`) or utilities like `mx-auto`,
  `space-y-*` and `py-*` silently lose. `web/src/main.tsx` imports `./dash/dash.css` before `./index.css`.
- `apps/mobile/src/nfc.ts` `react-native-hce` calls were written from memory, not verified against the
  installed 0.3.x API (per root README); treat NFC as unproven and QR as the working fallback.
- Expo app is a **dev build** (`expo run:android` after prebuild), not Expo Go, because of native NFC modules;
  Android-only so far (`dev.basepos.app`, NFC + CAMERA permissions in `app.json`).
- E2E compiles Solidity with `solc` from npm (`build.js` → `artifacts.json`), not forge, and the local Hardhat
  node uses chainId 84532 (cancun) so signatures stay domain-consistent. `e2e.ts` imports shared code via the
  relative path `../packages/shared/src/index` — moving files breaks it.
- State machine (`state.ts`): submit is only reachable after `VERIFY_OK`; customer UI must gate the Confirm
  button on `verifyRequest().ok === true`.
- Everything is testnet-only; keys are generated on-device (`expo-secure-store`) or per page load (web). Do not
  mainnet-ify without rethinking key storage.
