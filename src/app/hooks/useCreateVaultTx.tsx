import { convexClient } from "@/lib/convex/client";
import { createVaultTx } from "@/lib/convex/functions";
import type { VaultTxKind } from "@/app/types";

type VaultTxInput = {
  kind: VaultTxKind;
  wallet: string;
  creatorId?: string;
  postId?: string;
  assetsWei: string;
  txHash: string;
  chainId: number;
};

const useCreateVaultTx = async (input: VaultTxInput) => {
  return await convexClient.mutation(createVaultTx, input);
};

export default useCreateVaultTx;
