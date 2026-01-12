"use client";

import { useState } from "react";
import {
  getDefaultConfig,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "wagmi";
import { cronosTestnet } from "@/lib/web3/cronos";
import { cronosConfig } from "@/lib/web3/cronosConfig";
import { requirePublicEnv } from "@/lib/env/public";

const projectId = requirePublicEnv(
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID",
);

const wagmiConfig = getDefaultConfig({
  appName: "CroIgnite",
  projectId,
  chains: [cronosTestnet],
  ssr: true,
  transports: {
    [cronosTestnet.id]: http(cronosConfig.rpcUrl),
  },
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={cronosTestnet}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
