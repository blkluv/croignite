import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    wallet: v.string(),
    localId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_localId", (q) => q.eq("localId", args.localId))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("projects", {
      wallet: args.wallet,
      localId: args.localId,
      title: args.title,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listByWallet = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_wallet", (q) => q.eq("wallet", args.wallet))
      .order("desc")
      .collect();
  },
});

export const getByLocalId = query({
  args: { localId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_localId", (q) => q.eq("localId", args.localId))
      .unique();
  },
});
