import { getAddress } from "viem";

export const cronos = {
  mainnet: {
    chainId: 25,
    rpcUrl: "https://evm.cronos.org",
    explorerBaseUrl: "https://explorer.cronos.org",
    usdce: getAddress("0xf951eC28187D9E5Ca673Da8FE6757E6f0Be5F77C"),
  },
  testnet: {
    chainId: 338,
    rpcUrl: "https://evm-t3.cronos.org",
    explorerBaseUrl: "https://explorer.cronos.org/testnet",
    faucetUrl: "https://cronos.org/faucet",
    usdceFaucetUrl: "https://faucet.cronos.org",
    usdce: getAddress("0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0"),
  },
} as const;
