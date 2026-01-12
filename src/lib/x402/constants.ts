import { cronosConfig } from "@/lib/web3/cronosConfig";

export const X402_VERSION = 1 as const;
export const X402_SCHEME = "exact" as const;
export const X402_NETWORK = "cronos-testnet" as const;
export const X402_NETWORKS = {
  testnet: "cronos-testnet",
  mainnet: "cronos-mainnet",
} as const;

export const CRONOS_TESTNET_CHAIN_ID = cronosConfig.chainId;
export const CRONOS_TESTNET_RPC_URL = cronosConfig.rpcUrl;
export const CRONOS_MAINNET_CHAIN_ID = 25 as const;

export const DEV_USDCE_TESTNET_ADDRESS = cronosConfig.usdceAddress;
export const USDCE_MAINNET_ADDRESS =
  "0xf951eC28187D9E5Ca673Da8FE6757E6f0Be5F77C" as const;
export const USDCE_DECIMALS = 6 as const;

export const USDCE_EIP712_DOMAIN = {
  name: "Bridged USDC (Stargate)",
  version: "1",
} as const;

export const X402_FACILITATOR_BASE_URL =
  "https://facilitator.cronoslabs.org" as const;
