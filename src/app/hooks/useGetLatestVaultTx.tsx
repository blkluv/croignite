import { convexClient } from "@/lib/convex/client";
import { getLatestVaultTx } from "@/lib/convex/functions";
import type { VaultTx, VaultTxKind } from "@/app/types";

type LatestVaultTxInput = {
  wallet: string;
  kind?: VaultTxKind;
  creatorId?: string;
};

const useGetLatestVaultTx = async (
  input: LatestVaultTxInput,
): Promise<VaultTx | null> => {
  if (!input.wallet) return null;
  return (await convexClient.query(getLatestVaultTx, input)) as
    | VaultTx
    | null;
};

export default useGetLatestVaultTx;
