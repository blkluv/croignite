import { getAddress, isAddress } from "viem";
import { cronos } from "@/lib/web3/cronosConstants";

const network = cronos.testnet;
const explorerBase = (
  process.env.NEXT_PUBLIC_CRONOS_EXPLORER_BASE ?? network.explorerBaseUrl
).replace(/\/$/, "");
const rpcUrl = process.env.NEXT_PUBLIC_CRONOS_TESTNET_RPC_URL ?? network.rpcUrl;
const faucetUrl = process.env.NEXT_PUBLIC_CRONOS_FAUCET_URL ?? network.faucetUrl;
const usdceFaucetUrl =
  process.env.NEXT_PUBLIC_CRONOS_USDCE_FAUCET_URL ?? network.usdceFaucetUrl;
const usdceAddress = isAddress(process.env.NEXT_PUBLIC_CRONOS_USDCE_ADDRESS ?? "")
  ? getAddress(process.env.NEXT_PUBLIC_CRONOS_USDCE_ADDRESS as string)
  : network.usdce;

export const cronosConfig = {
  chainId: network.chainId,
  rpcUrl,
  explorerBase,
  faucetUrl,
  usdceFaucetUrl,
  usdceAddress: usdceAddress as `0x${string}`,
} as const;

export function explorerTxUrl(txHash: string) {
  return `${cronosConfig.explorerBase}/tx/${txHash}`;
}

export function explorerAddressUrl(address: string) {
  return `${cronosConfig.explorerBase}/address/${address}`;
}

export function explorerTokenUrl(address: string, tokenId: string | number | bigint) {
  return `${cronosConfig.explorerBase}/token/${address}?a=${tokenId.toString()}`;
}
