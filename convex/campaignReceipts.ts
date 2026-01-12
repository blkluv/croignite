import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getAddress, isAddress } from "viem";
import {
  resolveActivityChainId,
  setActivityStatusByTxHash,
  upsertActivityEvent,
} from "./lib/activity";

export const create = mutation({
  args: {
    postId: v.id("posts"),
    clipHash: v.string(),
    creatorId: v.string(),
    sponsorAddress: v.string(),
    boostVault: v.string(),
    assetsWei: v.string(),
    protocolFeeWei: v.string(),
    campaignId: v.string(),
    receiptTokenId: v.string(),
    invoiceReceiptAddress: v.string(),
    termsHash: v.string(),
    txHash: v.string(),
    sponsorName: v.string(),
    objective: v.string(),
    deliverables: v.array(v.string()),
    startDateIso: v.string(),
    endDateIso: v.string(),
    disclosure: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isAddress(args.creatorId)) {
      throw new Error("Invalid creator address.");
    }
    if (!isAddress(args.sponsorAddress)) {
      throw new Error("Invalid sponsor address.");
    }
    if (!isAddress(args.boostVault)) {
      throw new Error("Invalid boost vault address.");
    }
    if (!isAddress(args.invoiceReceiptAddress)) {
      throw new Error("Invalid invoice receipt address.");
    }
    if (!args.campaignId.startsWith("0x") || args.campaignId.length !== 66) {
      throw new Error("Invalid campaign id.");
    }
    const sponsorName = args.sponsorName.trim();
    const objective = args.objective.trim();
    const deliverables = args.deliverables.map((item) => item.trim()).filter(Boolean);
    const disclosure = args.disclosure.trim() || "Sponsored";

    if (!sponsorName) {
      throw new Error("Sponsor name is required.");
    }
    if (!objective) {
      throw new Error("Campaign objective is required.");
    }
    if (deliverables.length === 0) {
      throw new Error("At least one deliverable is required.");
    }
    const startMs = Date.parse(args.startDateIso);
    const endMs = Date.parse(args.endDateIso);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      throw new Error("Invalid campaign dates.");
    }
    if (startMs > endMs) {
      throw new Error("Campaign end date must be after start date.");
    }
    if (!args.txHash.startsWith("0x") || args.txHash.length !== 66) {
      throw new Error("Invalid transaction hash.");
    }
    if (!args.termsHash.startsWith("0x") || args.termsHash.length !== 66) {
      throw new Error("Invalid terms hash.");
    }

    const assets = BigInt(args.assetsWei);
    if (assets <= 0n) {
      throw new Error("Assets must be greater than zero.");
    }
    let protocolFee: bigint;
    let receiptTokenId: bigint;
    try {
      protocolFee = BigInt(args.protocolFeeWei);
      receiptTokenId = BigInt(args.receiptTokenId);
    } catch {
      throw new Error("Invalid protocol fee or receipt token id.");
    }
    if (protocolFee < 0n) {
      throw new Error("Protocol fee must be zero or greater.");
    }
    if (receiptTokenId <= 0n) {
      throw new Error("Receipt token id must be greater than zero.");
    }

    const id = await ctx.db.insert("campaignReceipts", {
      postId: args.postId,
      clipHash: args.clipHash,
      creatorId: getAddress(args.creatorId),
      sponsorAddress: getAddress(args.sponsorAddress),
      boostVault: getAddress(args.boostVault),
      assetsWei: assets.toString(),
      protocolFeeWei: protocolFee.toString(),
      campaignId: args.campaignId,
      receiptTokenId: receiptTokenId.toString(),
      invoiceReceiptAddress: getAddress(args.invoiceReceiptAddress),
      termsHash: args.termsHash,
      txHash: args.txHash,
      sponsorName,
      objective,
      deliverables,
      startDateIso: args.startDateIso,
      endDateIso: args.endDateIso,
      disclosure,
      status: "pending",
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.chain.confirmCampaign.confirmCampaignTx, {
      campaignId: id,
    });

    await upsertActivityEvent(ctx, {
      wallet: args.sponsorAddress,
      chainId: resolveActivityChainId(),
      txHash: args.txHash,
      kind: "sponsor_deposit",
      status: "pending",
      title: "Sponsored a clip",
      subtitle: sponsorName,
      href: `/campaign/${id}`,
      amount: assets.toString(),
      assetSymbol: "devUSDC.e",
    });

    return id;
  },
});

export const get = query({
  args: { campaignId: v.id("campaignReceipts") },
  handler: async (ctx, { campaignId }) => {
    return await ctx.db.get(campaignId);
  },
});

export const getInternal = internalQuery({
  args: { campaignId: v.id("campaignReceipts") },
  handler: async (ctx, { campaignId }) => {
    return await ctx.db.get(campaignId);
  },
});

export const markStatusInternal = internalMutation({
  args: {
    campaignId: v.id("campaignReceipts"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("failed"),
    ),
    confirmedAt: v.optional(v.number()),
    l2BlockNumber: v.optional(v.number()),
    l2TimestampIso: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { campaignId, status, confirmedAt, l2BlockNumber, l2TimestampIso },
  ) => {
    const campaign = await ctx.db.get(campaignId);
    if (!campaign) return;

    const update: {
      status: typeof status;
      confirmedAt?: number;
      l2BlockNumber?: number;
      l2TimestampIso?: string;
    } = { status };
    if (typeof confirmedAt === "number") {
      update.confirmedAt = confirmedAt;
    }
    if (typeof l2BlockNumber === "number") {
      update.l2BlockNumber = l2BlockNumber;
    }
    if (typeof l2TimestampIso === "string") {
      update.l2TimestampIso = l2TimestampIso;
    }

    await ctx.db.patch(campaignId, update);
    await setActivityStatusByTxHash(ctx, { txHash: campaign.txHash, status });
  },
});

export const retryPending = internalMutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const batchSize = Math.min(Math.max(limit ?? 25, 1), 100);
    const pending = await ctx.db
      .query("campaignReceipts")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(batchSize);

    for (const campaign of pending) {
      await ctx.scheduler.runAfter(0, internal.chain.confirmCampaign.confirmCampaignTx, {
        campaignId: campaign._id,
      });
    }

    return pending.length;
  },
});
