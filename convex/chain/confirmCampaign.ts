import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { createCronosPublicClient } from "../cronos";

export const confirmCampaignTx = internalAction({
  args: { campaignId: v.id("campaignReceipts") },
  handler: async (ctx, { campaignId }) => {
    const campaign = await ctx.runQuery(internal.campaignReceipts.getInternal, {
      campaignId,
    });

    if (!campaign) return;
    if (campaign.status === "confirmed" || campaign.status === "failed") return;

    if (!campaign.txHash.startsWith("0x") || campaign.txHash.length !== 66) {
      await ctx.runMutation(internal.campaignReceipts.markStatusInternal, {
        campaignId,
        status: "failed",
        confirmedAt: Date.now(),
      });
      return;
    }

    const { publicClient } = createCronosPublicClient();

    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: campaign.txHash as `0x${string}`,
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
          "Failed to fetch L2 block timestamp for campaign tx",
          campaign.txHash,
          blockError,
        );
      }

      const status = receipt.status === "success" ? "confirmed" : "failed";
      await ctx.runMutation(internal.campaignReceipts.markStatusInternal, {
        campaignId,
        status,
        confirmedAt: Date.now(),
        l2BlockNumber,
        l2TimestampIso,
      });
    } catch (error) {
      console.error("Failed to confirm campaign tx", campaign.txHash, error);
      await ctx.runMutation(internal.campaignReceipts.markStatusInternal, {
        campaignId,
        status: "failed",
        confirmedAt: Date.now(),
      });
    }
  },
});
