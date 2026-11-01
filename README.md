# TapPay / BasePOS: two-phone USDC point of sale on Base Sepolia

Merchant phone signs a payment request (EIP-712, nonce + expiry + ENS name) and shows it by NFC/QR.
Customer phone verifies signature + ENS (forward and reverse) before it can confirm, then pays USDC,
or ETH via a Uniswap swap that delivers the exact signed USDC amount and refunds unused ETH.

## Layout
- `contracts/`: `PaymentSettlement.sol`, deploy script, Foundry tests (`test/`)
- `packages/shared/`: signing, wire format, verification, settlement calls, payment state machine (TypeScript)
- `apps/mobile/`: Android app (Expo dev build; merchant + customer screens, NFC via HCE, QR fallback)
- `web/`: the two real portals (`/merchant` till-side, `/` pay-side) driven by MetaMask via `window.ethereum`.
  The merchant dashboard (Tailwind v4, `web/src/dash/`) reads live USDC balance + `PaymentSettled` history, groups
  payers, and signs EIP-712 charges into QR/links with a 2-minute countdown. `?demo=1` previews labelled sample
  data; `/sim` keeps the earlier two-phone browser simulation (fallback demo).
- `test-e2e/`: local end-to-end test (real contract + mock USDC/WETH/router on a local chain)

## Verified so far
- `forge test` in `contracts/`: 5/5 pass (OpenZeppelin v5.1.0 is vendored in `contracts/lib`).
- `test-e2e`: 13/13 pass (`cd test-e2e && npm i && npm test`).
- `packages/shared` and `web` type-check; `web` builds.
NOT run (needs your wallet / network / phones): Base Sepolia deploy, swap-pool liquidity check, Android app, NFC, real ENS lookups.

## Setup
0. Web portals (fastest to try): `cd web && npm i && npm run dev` → open `/merchant` on one device and `/` on
   another (MetaMask on both, same Wi-Fi). Add `?demo=1` to `/merchant` to rehearse the dashboard with labelled
   sample data before the contract is deployed. See `web/README.md`.
1. `cd contracts && forge test` (forge-std and OpenZeppelin are already in `lib/`).
2. Deploy: `export PK=0x...; forge script script/Deploy.s.sol:Deploy --rpc-url https://sepolia.base.org --broadcast`
3. Put the deployed address in `packages/shared/src/config.ts` (`SETTLEMENT`).
4. ENS (on **Ethereum Sepolia**, app.ens.domains): with a wallet that has free Sepolia ETH, register a name, point its address record to that same wallet, and set it as that wallet's primary name. Then on the merchant phone, open the Merchant screen and use "Use my own wallet" to import that wallet's private key (testnet-only wallet!). The merchant signer then equals the ENS owner, so verification passes.
5. Fund the customer wallet with Base Sepolia ETH and test USDC (faucet.circle.com).
6. `cd apps/mobile && npm i && npx expo prebuild && npx expo run:android` on both phones.

## Check before relying on it
- The WETH/USDC 0.3% pool on Base Sepolia needs liquidity for the ETH path (otherwise change `POOL_FEE` and the deploy fee). USDC path is independent.
- `react-native-hce` calls in `apps/mobile/src/nfc.ts` were written from memory; confirm against your installed version. QR always works as fallback.
- Keys are generated on-device, testnet only.
