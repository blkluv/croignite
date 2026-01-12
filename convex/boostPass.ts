import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAddress, isAddress } from "viem";
import { resolveActivityChainId, upsertActivityEvent } from "./lib/activity";

const normalizeWallets = (wallets: string[]) => {
  const deduped = new Set<string>();
  for (const wallet of wallets) {
    if (!isAddress(wallet)) {
      throw new Error("Invalid wallet address in eligibility list.");
    }
    deduped.add(getAddress(wallet));
  }
  return Array.from(deduped);
};

export const getLatestEpoch = query({
  handler: async (ctx) => {
    return await ctx.db.query("boostPassEpochs").order("desc").first();
  },
});

export const logEpochPublish = mutation({
  args: {
    epoch: v.number(),
    publishedBy: v.string(),
    txHash: v.string(),
    topWallets: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    if (!Number.isInteger(args.epoch) || args.epoch <= 0) {
      throw new Error("Epoch must be a positive integer.");
    }
    if (!isAddress(args.publishedBy)) {
      throw new Error("Invalid publisher wallet address.");
    }
    if (!args.txHash.startsWith("0x") || args.txHash.length !== 66) {
      throw new Error("Invalid transaction hash.");
    }

    const topWallets = normalizeWallets(args.topWallets);
    const existing = await ctx.db
      .query("boostPassEpochs")
      .withIndex("by_epoch", (q) => q.eq("epoch", args.epoch))
      .first();

    const payload = {
      epoch: args.epoch,
      publishedAt: Date.now(),
      publishedBy: getAddress(args.publishedBy),
      txHash: args.txHash,
      topWallets,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("boostPassEpochs", payload);
  },
});

export const logClaim = mutation({
  args: {
    epoch: v.number(),
    wallet: v.string(),
    txHash: v.string(),
  },
  handler: async (ctx, args) => {
    if (!Number.isInteger(args.epoch) || args.epoch <= 0) {
      throw new Error("Epoch must be a positive integer.");
    }
    if (!isAddress(args.wallet)) {
      throw new Error("Invalid wallet address.");
    }
    if (!args.txHash.startsWith("0x") || args.txHash.length !== 66) {
      throw new Error("Invalid transaction hash.");
    }

    const wallet = getAddress(args.wallet);
    const existing = await ctx.db
      .query("boostPassClaims")
      .withIndex("by_epoch_wallet", (q) =>
        q.eq("epoch", args.epoch).eq("wallet", wallet),
      )
      .first();

    if (existing) {
      await upsertActivityEvent(ctx, {
        wallet,
        chainId: resolveActivityChainId(),
        txHash: existing.txHash,
        kind: "boost_pass_claim",
        status: "confirmed",
        title: "Boost Pass claimed",
        subtitle: `Epoch ${args.epoch}`,
        href: "/perks/boost-pass",
      });
      return existing._id;
    }

    const claimId = await ctx.db.insert("boostPassClaims", {
      epoch: args.epoch,
      wallet,
      txHash: args.txHash,
      claimedAt: Date.now(),
    });

    await upsertActivityEvent(ctx, {
      wallet,
      chainId: resolveActivityChainId(),
      txHash: args.txHash,
      kind: "boost_pass_claim",
      status: "confirmed",
      title: "Boost Pass claimed",
      subtitle: `Epoch ${args.epoch}`,
      href: "/perks/boost-pass",
    });

    return claimId;
  },
});
