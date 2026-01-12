import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const defaultName = (wallet: string) =>
  `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
const defaultUsername = (wallet: string) =>
  `user-${wallet.slice(2, 10).toLowerCase()}`;
const normalizeUsername = (value?: string) =>
  value ? value.trim().toLowerCase().replace(/[^a-z0-9._]/g, "") : "";

export const getByWallet = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_wallet", (q) => q.eq("wallet", args.wallet))
      .unique();
  },
});

export const listRandom = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const profiles = await ctx.db.query("profiles").collect();
    const shuffled = profiles.sort(() => 0.5 - Math.random());
    const limit = Math.min(args.limit ?? 6, shuffled.length);
    return shuffled.slice(0, limit).map((profile) => ({
      id: profile.wallet,
      name: profile.name,
      username: profile.username,
      image: profile.image,
    }));
  },
});

export const searchByName = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.query.trim().toLowerCase().replace(/^@/, "");
    if (!normalized) return [];

    const profiles = await ctx.db.query("profiles").collect();
    return profiles
      .filter((profile) => {
        const nameMatch = profile.name.toLowerCase().includes(normalized);
        const usernameMatch = profile.username
          ? profile.username.toLowerCase().includes(normalized)
          : false;
        const walletMatch = profile.wallet.toLowerCase().includes(normalized);
        return nameMatch || usernameMatch || walletMatch;
      })
      .slice(0, 10)
      .map((profile) => ({
        id: profile.wallet,
        name: profile.name,
        username: profile.username,
        image: profile.image,
      }));
  },
});

export const ensure = mutation({
  args: {
    wallet: v.string(),
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_wallet", (q) => q.eq("wallet", args.wallet))
      .unique();

    const now = Date.now();
    if (existing) {
      if (!existing.username) {
        const normalized = normalizeUsername(args.username);
        await ctx.db.patch(existing._id, {
          username: normalized || defaultUsername(args.wallet),
          updatedAt: now,
        });
      }
      return existing._id;
    }

    return await ctx.db.insert("profiles", {
      wallet: args.wallet,
      name: args.name?.trim() || defaultName(args.wallet),
      username: normalizeUsername(args.username) || defaultUsername(args.wallet),
      bio: "",
      image: args.image ?? "/images/placeholder-user.jpg",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    wallet: v.string(),
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_wallet", (q) => q.eq("wallet", args.wallet))
      .unique();

    if (!existing) {
      throw new Error("Profile not found.");
    }

    const updatedAt = Date.now();
    let nextUsername = existing.username || defaultUsername(existing.wallet);
    if (args.username !== undefined) {
      const normalized = normalizeUsername(args.username);
      if (!normalized) {
        throw new Error("Username is invalid.");
      }
      nextUsername = normalized;
    }
    await ctx.db.patch(existing._id, {
      name: args.name ?? existing.name,
      username: nextUsername,
      bio: args.bio ?? existing.bio,
      image: args.image ?? existing.image,
      updatedAt,
    });

    return updatedAt;
  },
});
