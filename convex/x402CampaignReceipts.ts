import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAddress, isAddress } from "viem";
import { getEnv } from "./env";
import { resolveActivityChainId, upsertActivityEvent } from "./lib/activity";

export const createReceipt = mutation({
  args: {
    secret: v.optional(v.string()),
    postId: v.id("posts"),
    creatorId: v.string(),
    sponsorAddress: v.string(),
    payTo: v.string(),
    assetsWei: v.string(),
    asset: v.string(),
    network: v.string(),
    nonce: v.string(),
    validBefore: v.number(),
    txHash: v.string(),
    blockNumber: v.optional(v.number()),
    timestampIso: v.string(),
    sponsorName: v.string(),
    objective: v.string(),
    deliverables: v.array(v.string()),
    startDateIso: v.string(),
    endDateIso: v.string(),
    disclosure: v.string(),
  },
  handler: async (ctx, args) => {
    const expected = getEnv("CROIGNITE_INTERNAL_WRITE_SECRET");
    if (expected && args.secret !== expected) {
      throw new Error("Invalid internal write secret.");
    }

    if (!isAddress(args.creatorId)) {
      throw new Error("Invalid creator address.");
    }
    if (!isAddress(args.sponsorAddress)) {
      throw new Error("Invalid sponsor address.");
    }
    if (!isAddress(args.payTo)) {
      throw new Error("Invalid payTo address.");
    }
    if (!isAddress(args.asset)) {
      throw new Error("Invalid asset address.");
    }
    if (!args.txHash.startsWith("0x") || args.txHash.length !== 66) {
      throw new Error("Invalid transaction hash.");
    }
    if (!args.nonce.startsWith("0x") || args.nonce.length !== 66) {
      throw new Error("Invalid payment nonce.");
    }
    if (!Number.isFinite(args.validBefore) || args.validBefore <= 0) {
      throw new Error("Invalid payment deadline.");
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

    let assets: bigint;
    try {
      assets = BigInt(args.assetsWei);
    } catch {
      throw new Error("Invalid assets amount.");
    }
    if (assets <= 0n) {
      throw new Error("Assets must be greater than zero.");
    }

    const settledAt = Date.parse(args.timestampIso);
    if (!Number.isFinite(settledAt)) {
      throw new Error("Invalid settlement timestamp.");
    }

    const existing = await ctx.db
      .query("x402CampaignReceipts")
      .withIndex("by_txHash", (q) => q.eq("txHash", args.txHash))
      .unique();

    if (existing) {
      return existing._id;
    }

    const id = await ctx.db.insert("x402CampaignReceipts", {
      postId: args.postId,
      creatorId: getAddress(args.creatorId),
      sponsorAddress: getAddress(args.sponsorAddress),
      payTo: getAddress(args.payTo),
      assetsWei: assets.toString(),
      asset: getAddress(args.asset),
      network: args.network,
      nonce: args.nonce,
      validBefore: args.validBefore,
      txHash: args.txHash,
      blockNumber: args.blockNumber,
      timestampIso: args.timestampIso,
      sponsorName,
      objective,
      deliverables,
      startDateIso: args.startDateIso,
      endDateIso: args.endDateIso,
      disclosure,
      status: "confirmed",
      confirmedAt: settledAt,
      createdAt: Date.now(),
    });

    await upsertActivityEvent(ctx, {
      wallet: args.sponsorAddress,
      chainId: resolveActivityChainId(),
      txHash: args.txHash,
      kind: "sponsor_deposit",
      status: "confirmed",
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
  args: { receiptId: v.id("x402CampaignReceipts") },
  handler: async (ctx, { receiptId }) => {
    return await ctx.db.get(receiptId);
  },
});

export const getBySponsorAndNonce = query({
  args: {
    sponsorAddress: v.string(),
    nonce: v.string(),
  },
  handler: async (ctx, { sponsorAddress, nonce }) => {
    return await ctx.db
      .query("x402CampaignReceipts")
      .withIndex("by_sponsor_nonce", (q) =>
        q.eq("sponsorAddress", sponsorAddress).eq("nonce", nonce),
      )
      .first();
  },
});
