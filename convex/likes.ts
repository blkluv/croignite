import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const byPost = query({
  args: { postId: v.string() },
  handler: async (ctx, args) => {
    const postId = ctx.db.normalizeId("posts", args.postId);
    if (!postId) return [];
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .collect();

    return likes.map((like) => ({
      id: like._id,
      user_id: like.userId,
      post_id: like.postId,
    }));
  },
});

export const isLiked = query({
  args: { postId: v.id("posts"), userId: v.string() },
  handler: async (ctx, args) => {
    const like = await ctx.db
      .query("likes")
      .withIndex("by_post_and_user", (q) =>
        q.eq("postId", args.postId).eq("userId", args.userId),
      )
      .unique();
    return Boolean(like);
  },
});

export const create = mutation({
  args: { postId: v.id("posts"), userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("likes")
      .withIndex("by_post_and_user", (q) =>
        q.eq("postId", args.postId).eq("userId", args.userId),
      )
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("likes", {
      postId: args.postId,
      userId: args.userId,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { postId: v.id("posts"), userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("likes")
      .withIndex("by_post_and_user", (q) =>
        q.eq("postId", args.postId).eq("userId", args.userId),
      )
      .unique();

    if (!existing) return false;
    await ctx.db.delete(existing._id);
    return true;
  },
});
