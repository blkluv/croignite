import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const byPost = query({
  args: { postId: v.string() },
  handler: async (ctx, args) => {
    const postId = ctx.db.normalizeId("posts", args.postId);
    if (!postId) return [];
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .order("desc")
      .collect();

    const wallets = Array.from(new Set(comments.map((comment) => comment.userId)));
    const profiles = await Promise.all(
      wallets.map(async (wallet) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
          .unique();
        return [wallet, profile] as const;
      }),
    );
    const profileMap = new Map(profiles);

    return comments.map((comment) => {
      const profile = profileMap.get(comment.userId);
      return {
        id: comment._id,
        user_id: comment.userId,
        post_id: comment.postId,
        text: comment.text,
        created_at: new Date(comment.createdAt).toISOString(),
        profile: {
          user_id: comment.userId,
          name: profile?.name ?? `${comment.userId.slice(0, 6)}...${comment.userId.slice(-4)}`,
          username: profile?.username ?? `user-${comment.userId.slice(2, 10).toLowerCase()}`,
          image: profile?.image ?? "/images/placeholder-user.jpg",
        },
      };
    });
  },
});

export const create = mutation({
  args: {
    postId: v.id("posts"),
    userId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("comments", {
      postId: args.postId,
      userId: args.userId,
      text: args.text,
      createdAt: now,
    });
  },
});

export const remove = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.commentId);
    return true;
  },
});
