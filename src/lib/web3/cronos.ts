import { defineChain } from "viem";
import { cronosConfig } from "@/lib/web3/cronosConfig";

export const cronosTestnet = defineChain({
  id: cronosConfig.chainId,
  name: "Cronos Testnet",
  nativeCurrency: { name: "Test CRO", symbol: "tCRO", decimals: 18 },
  rpcUrls: {
    default: {
      http: [cronosConfig.rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: "Cronos Explorer",
      url: cronosConfig.explorerBase,
    },
  },
  testnet: true,
});
