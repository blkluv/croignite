import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isAddress } from "viem";

export const create = mutation({
  args: {
    postId: v.id("posts"),
    clipHash: v.string(),
    creatorId: v.string(),
    vaultAddress: v.string(),
    sponsorAddress: v.string(),
    assets: v.string(),
    protocolFeeWei: v.string(),
    campaignId: v.string(),
    receiptTokenId: v.string(),
    invoiceReceiptAddress: v.string(),
    txHash: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isAddress(args.invoiceReceiptAddress)) {
      throw new Error("Invalid invoice receipt address.");
    }
    if (!args.campaignId.startsWith("0x") || args.campaignId.length !== 66) {
      throw new Error("Invalid campaign id.");
    }
    let receiptTokenId: bigint;
    let protocolFee: bigint;
    try {
      receiptTokenId = BigInt(args.receiptTokenId);
      protocolFee = BigInt(args.protocolFeeWei);
    } catch {
      throw new Error("Invalid receipt token or protocol fee value.");
    }
    if (receiptTokenId <= 0n) {
      throw new Error("Receipt token id must be greater than zero.");
    }
    if (protocolFee < 0n) {
      throw new Error("Protocol fee must be zero or greater.");
    }

    return await ctx.db.insert("sponsorCampaigns", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const byPostId = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    return await ctx.db
      .query("sponsorCampaigns")
      .withIndex("by_postId", (q) => q.eq("postId", postId))
      .order("desc")
      .first();
  },
});
