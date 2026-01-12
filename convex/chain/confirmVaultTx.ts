import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { createCronosPublicClient } from "../cronos";

export const confirmVaultTx = internalAction({
  args: { vaultTxId: v.id("vaultTx") },
  handler: async (ctx, { vaultTxId }) => {
    const vaultTx = await ctx.runQuery(internal.vaultTx.getInternal, {
      vaultTxId,
    });

    if (!vaultTx) return;
    if (vaultTx.status === "confirmed" || vaultTx.status === "failed") return;

    if (!vaultTx.txHash.startsWith("0x") || vaultTx.txHash.length !== 66) {
      await ctx.runMutation(internal.vaultTx.markStatusInternal, {
        vaultTxId,
        status: "failed",
        confirmedAt: Date.now(),
      });
      return;
    }

    const { publicClient } = createCronosPublicClient();

    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: vaultTx.txHash as `0x${string}`,
        timeout: 120_000,
      });

      const parsedBlockNumber = Number(receipt.blockNumber);
      const l2BlockNumber = Number.isFinite(parsedBlockNumber)
        ? parsedBlockNumber
        : undefined;
      let l2TimestampIso: string | undefined;

      try {
        const block = await publicClient.getBlock({
          blockNumber: receipt.blockNumber,
        });
        l2TimestampIso = new Date(
          Number(block.timestamp) * 1000,
        ).toISOString();
      } catch (blockError) {
        console.warn(
          "Failed to fetch L2 block timestamp for vault tx",
          vaultTx.txHash,
          blockError,
        );
      }

      const status = receipt.status === "success" ? "confirmed" : "failed";
      await ctx.runMutation(internal.vaultTx.markStatusInternal, {
        vaultTxId,
        status,
        confirmedAt: Date.now(),
        l2BlockNumber,
        l2TimestampIso,
      });
    } catch (error) {
      console.error("Failed to confirm vault tx", vaultTx.txHash, error);
      await ctx.runMutation(internal.vaultTx.markStatusInternal, {
        vaultTxId,
        status: "failed",
        confirmedAt: Date.now(),
      });
    }
  },
});
