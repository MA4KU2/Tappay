// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {PaymentSettlement} from "../src/PaymentSettlement.sol";

/// Deploys PaymentSettlement wired to Base Sepolia's USDC / WETH / SwapRouter02.
///
///   export PK=0x...
///   forge script script/Deploy.s.sol:Deploy --rpc-url https://sepolia.base.org --broadcast
///
/// Fund `PK`'s address with Base Sepolia ETH first (faucets: sepolia.base.org's
/// own faucet, or QuickNode / Coinbase faucet aggregators).
///
/// After broadcasting, copy the printed "PaymentSettlement deployed at" address
/// into packages/shared/src/config.ts -> SETTLEMENT (both portals read it).
contract Deploy is Script {
    // Base Sepolia (84532). USDC is Circle's testnet token; WETH + router are predeploys.
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant SWAP_ROUTER_02 = 0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4;
    uint24 constant POOL_FEE = 3000; // 0.3% WETH/USDC pool

    function run() external returns (address) {
        vm.startBroadcast();
        PaymentSettlement settlement = new PaymentSettlement(USDC, WETH, SWAP_ROUTER_02, POOL_FEE);
        vm.stopBroadcast();
        console2.log("PaymentSettlement deployed at", address(settlement));
        console2.log("Paste into packages/shared/src/config.ts -> SETTLEMENT");
        return address(settlement);
    }
}
