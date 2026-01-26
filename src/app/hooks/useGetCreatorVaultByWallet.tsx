import type { CreatorVaultRecord } from "@/app/types";
import { getAddress, isAddress } from "viem";

export type CreatorVaultResolution = {
  record: CreatorVaultRecord | null;
  reason?: string;
  txHash?: string | null;
};

const useGetCreatorVaultByWallet = async (
  wallet: string,
  options: { provision?: boolean } = {},
): Promise<CreatorVaultResolution> => {
  if (!wallet) return { record: null, reason: "Missing wallet address." };

  const res = await fetch("/api/creator-vault/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, provision: options.provision ?? false }),
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
    return { record: null, reason: payload?.reason, txHash: payload?.txHash };
  }

  if (!isAddress(payload.vault) || !isAddress(payload.walletAddress)) {
    throw new Error("Received an invalid vault address from the server.");
  }

  return {
    record: {
      wallet: getAddress(payload.walletAddress),
      vault: getAddress(payload.vault),
      txHash: payload.txHash ?? undefined,
      createdAt: Date.now(),
    },
    txHash: payload.txHash ?? null,
  };
};

export default useGetCreatorVaultByWallet;
