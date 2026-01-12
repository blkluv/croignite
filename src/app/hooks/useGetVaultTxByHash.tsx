import { convexClient } from "@/lib/convex/client";
import { getVaultTxByHash } from "@/lib/convex/functions";
import type { VaultTx } from "@/app/types";

const useGetVaultTxByHash = async (txHash: string): Promise<VaultTx | null> => {
  if (!txHash) return null;
  return (await convexClient.query(getVaultTxByHash, { txHash })) as
    | VaultTx
    | null;
};

export default useGetVaultTxByHash;
