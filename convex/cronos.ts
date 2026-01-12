import { cronosTestnet } from "viem/chains";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getEnv } from "./env";
import { cronos } from "../src/lib/web3/cronosConstants";

function requireCronosRpcUrl() {
  const rpcUrl =
    getEnv("CRONOS_TESTNET_RPC_URL") ??
    getEnv("NEXT_PUBLIC_CRONOS_RPC_URL") ??
    cronos.testnet.rpcUrl;
  if (!rpcUrl) {
    throw new Error("Missing Cronos RPC URL.");
  }
  return rpcUrl;
}

export function createCronosPublicClient() {
  const rpcUrl = requireCronosRpcUrl();
  const chain = cronosTestnet;
  const transport = http(rpcUrl);

  return { chain, publicClient: createPublicClient({ chain, transport }) };
}

export function createCronosClients(privateKey: string) {
  const rpcUrl = requireCronosRpcUrl();
  const chain = cronosTestnet;

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const transport = http(rpcUrl);

  return {
    chain,
    publicClient: createPublicClient({ chain, transport }),
    walletClient: createWalletClient({ account, chain, transport }),
  };
}
