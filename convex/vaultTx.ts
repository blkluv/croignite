import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { getAddress, isAddress } from "viem";
import { setActivityStatusByTxHash, upsertActivityEvent } from "./lib/activity";

type VaultTxKind = "boostDeposit" | "sponsorDeposit" | "yieldDeposit";

const activityKindByVaultTx: Record<
  VaultTxKind,
  "boost_deposit" | "sponsor_deposit" | "yield_deposit"
> = {
  boostDeposit: "boost_deposit",
  sponsorDeposit: "sponsor_deposit",
  yieldDeposit: "yield_deposit",
};

function activityTitle(kind: VaultTxKind) {
  switch (kind) {
    case "boostDeposit":
      return "Boosted a creator";
    case "sponsorDeposit":
      return "Sponsored a clip";
    case "yieldDeposit":
      return "Deposited into the yield vault";
  }
}

function activitySubtitle(kind: VaultTxKind) {
  switch (kind) {
    case "boostDeposit":
      return "Boost vault deposit";
    case "sponsorDeposit":
      return "Sponsored vault deposit";
    case "yieldDeposit":
      return "Yield vault deposit";
  }
}

async function resolveActivityMeta(
  ctx: { db: MutationCtx["db"] },
  args: { kind: VaultTxKind; creatorId?: string; postId?: string; txHash: string },
) {
  const subtitle = activitySubtitle(args.kind);

  if (args.kind === "boostDeposit" && args.creatorId) {
    return { href: `/boost/${args.creatorId}`, subtitle };
  }

  if (args.kind === "sponsorDeposit") {
    const campaign = await ctx.db
      .query("campaignReceipts")
      .withIndex("by_txHash", (q) => q.eq("txHash", args.txHash))
      .first();
    if (campaign) {
      return { href: `/campaign/${campaign._id}`, subtitle: campaign.sponsorName };
    }
    if (args.postId) {
      return { href: `/sponsor/${args.postId}`, subtitle };
    }
  }

  return { href: "/yield", subtitle };
}

export const create = mutation({
  args: {
    kind: v.union(
      v.literal("boostDeposit"),
      v.literal("sponsorDeposit"),
      v.literal("yieldDeposit"),
    ),
    wallet: v.string(),
    creatorId: v.optional(v.string()),
    postId: v.optional(v.id("posts")),
    assetsWei: v.string(),
    txHash: v.string(),
    chainId: v.number(),
  },
  handler: async (ctx, args) => {
    if (!isAddress(args.wallet)) {
      throw new Error("Invalid wallet address.");
    }
    if (args.creatorId && !isAddress(args.creatorId)) {
      throw new Error("Invalid creator address.");
    }
    const assets = BigInt(args.assetsWei);
    if (assets <= 0n) {
      throw new Error("Assets must be greater than zero.");
    }
    if (!args.txHash.startsWith("0x") || args.txHash.length !== 66) {
      throw new Error("Invalid transaction hash.");
    }

    const id = await ctx.db.insert("vaultTx", {
      kind: args.kind,
      wallet: getAddress(args.wallet),
      creatorId: args.creatorId ? getAddress(args.creatorId) : undefined,
      postId: args.postId,
      assetsWei: assets.toString(),
      txHash: args.txHash,
      chainId: args.chainId,
      status: "pending",
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.chain.confirmVaultTx.confirmVaultTx, {
      vaultTxId: id,
    });

    const { href, subtitle } = await resolveActivityMeta(ctx, {
      kind: args.kind,
      creatorId: args.creatorId ? getAddress(args.creatorId) : undefined,
      postId: args.postId ? args.postId.toString() : undefined,
      txHash: args.txHash,
    });

    await upsertActivityEvent(ctx, {
      wallet: args.wallet,
      chainId: args.chainId,
      txHash: args.txHash,
      kind: activityKindByVaultTx[args.kind],
      status: "pending",
      title: activityTitle(args.kind),
      subtitle,
      href,
      amount: assets.toString(),
      assetSymbol: "devUSDC.e",
    });

    return id;
  },
});

export const getByTxHash = query({
  args: { txHash: v.string() },
  handler: async (ctx, { txHash }) => {
    if (!txHash.startsWith("0x") || txHash.length !== 66) {
      return null;
    }
    return await ctx.db
      .query("vaultTx")
      .withIndex("by_txHash", (q) => q.eq("txHash", txHash))
      .first();
  },
});

export const getLatestForWallet = query({
  args: {
    wallet: v.string(),
    kind: v.optional(
      v.union(
        v.literal("boostDeposit"),
        v.literal("sponsorDeposit"),
        v.literal("yieldDeposit"),
      ),
    ),
    creatorId: v.optional(v.string()),
  },
  handler: async (ctx, { wallet, kind, creatorId }) => {
    if (!isAddress(wallet)) {
      throw new Error("Invalid wallet address.");
    }
    const normalizedWallet = getAddress(wallet);

    let queryBuilder = kind
      ? ctx.db
          .query("vaultTx")
          .withIndex("by_wallet_kind", (q) =>
            q.eq("wallet", normalizedWallet).eq("kind", kind),
          )
      : ctx.db
          .query("vaultTx")
          .withIndex("by_wallet", (q) => q.eq("wallet", normalizedWallet));

    if (creatorId) {
      if (!isAddress(creatorId)) {
        throw new Error("Invalid creator address.");
      }
      const normalizedCreator = getAddress(creatorId);
      queryBuilder = queryBuilder.filter((q) =>
        q.eq(q.field("creatorId"), normalizedCreator),
      );
    }

    return await queryBuilder.order("desc").first();
  },
});

export const getInternal = internalQuery({
  args: { vaultTxId: v.id("vaultTx") },
  handler: async (ctx, { vaultTxId }) => {
    return await ctx.db.get(vaultTxId);
  },
});

export const markStatusInternal = internalMutation({
  args: {
    vaultTxId: v.id("vaultTx"),
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
    { vaultTxId, status, confirmedAt, l2BlockNumber, l2TimestampIso },
  ) => {
    const vaultTx = await ctx.db.get(vaultTxId);
    if (!vaultTx) return;

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

    await ctx.db.patch(vaultTxId, update);
    await setActivityStatusByTxHash(ctx, { txHash: vaultTx.txHash, status });
  },
});

export const retryPending = internalMutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const batchSize = Math.min(Math.max(limit ?? 25, 1), 100);
    const pending = await ctx.db
      .query("vaultTx")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(batchSize);

    for (const tx of pending) {
      await ctx.scheduler.runAfter(0, internal.chain.confirmVaultTx.confirmVaultTx, {
        vaultTxId: tx._id,
      });
    }

    return pending.length;
  },
});
