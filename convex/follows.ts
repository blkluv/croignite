import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const isFollowing = query({
  args: { followerId: v.string(), followingId: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("follows")
      .withIndex("by_follower_following", (q) =>
        q.eq("followerId", args.followerId).eq("followingId", args.followingId),
      )
      .unique();
    return Boolean(record);
  },
});

export const countFollowers = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", args.wallet))
      .collect();
    return followers.length;
  },
});

export const countFollowing = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.wallet))
      .collect();
    return following.length;
  },
});

export const listFollowing = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.wallet))
      .collect();
    return following.map((record) => record.followingId);
  },
});

export const listFollowingProfiles = query({
  args: { wallet: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.wallet))
      .collect();

    if (following.length === 0) return [];

    const profiles = await Promise.all(
      following.map((record) =>
        ctx.db
          .query("profiles")
          .withIndex("by_wallet", (q) => q.eq("wallet", record.followingId))
          .unique(),
      ),
    );

    const normalized = profiles
      .filter((profile) => Boolean(profile))
      .map((profile) => ({
        id: profile!.wallet,
        name: profile!.name,
        username: profile!.username,
        image: profile!.image,
      }));

    if (args.limit) {
      return normalized.slice(0, args.limit);
    }
    return normalized;
  },
});

export const toggle = mutation({
  args: { followerId: v.string(), followingId: v.string() },
  handler: async (ctx, args) => {
    if (args.followerId === args.followingId) {
      throw new Error("You cannot follow yourself.");
    }

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_following", (q) =>
        q.eq("followerId", args.followerId).eq("followingId", args.followingId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }

    await ctx.db.insert("follows", {
      followerId: args.followerId,
      followingId: args.followingId,
      createdAt: Date.now(),
    });
    return true;
  },
});
