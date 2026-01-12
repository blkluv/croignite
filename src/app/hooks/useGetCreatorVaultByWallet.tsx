import type { CreatorVaultRecord } from "@/app/types";
import { getAddress, isAddress } from "viem";

const useGetCreatorVaultByWallet = async (
  wallet: string,
): Promise<CreatorVaultRecord | null> => {
  if (!wallet) return null;

  const res = await fetch("/api/creator-vault/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet }),
  });

  const payload = (await res.json().catch(() => null)) as {
    ok?: boolean;
    walletAddress?: string;
    vault?: string | null;
    txHash?: string | null;
    reason?: string;
  } | null;

  if (!res.ok || !payload?.ok) {
    throw new Error(payload?.reason ?? "Unable to resolve creator vault.");
  }

  if (!payload.vault || !payload.walletAddress) {
    throw new Error("Creator vault not provisioned yet.");
  }

  if (!isAddress(payload.vault) || !isAddress(payload.walletAddress)) {
    throw new Error("Received an invalid vault address from the server.");
  }

  return {
    wallet: getAddress(payload.walletAddress),
    vault: getAddress(payload.vault),
    txHash: payload.txHash ?? undefined,
    createdAt: Date.now(),
  };
};

export default useGetCreatorVaultByWallet;
