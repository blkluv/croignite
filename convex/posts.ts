import { mutation, query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { Doc } from "./_generated/dataModel";

type ProfileSummary = {
  user_id: string;
  name: string;
  username?: string;
  image: string;
};

type PostShape = {
  id: string;
  user_id: string;
  video_url: string;
  text: string;
  created_at: string;
  profile: ProfileSummary;
};

const toSummary = (
  wallet: string,
  profile:
    | {
        wallet: string;
        name: string;
        username?: string;
        image: string;
      }
    | null,
): ProfileSummary => {
  if (profile) {
    return {
      user_id: profile.wallet,
      name: profile.name,
      username: profile.username,
      image: profile.image,
    };
  }

  return {
    user_id: wallet,
    name: `${wallet.slice(0, 6)}...${wallet.slice(-4)}`,
    username: `user-${wallet.slice(2, 10).toLowerCase()}`,
    image: "/images/placeholder-user.jpg",
  };
};

async function attachProfiles(
  ctx: QueryCtx,
  posts: Array<Doc<"posts">>,
): Promise<PostShape[]> {
  const wallets = Array.from(new Set(posts.map((post) => post.userId)));
  const profileEntries = await Promise.all(
    wallets.map(async (wallet) => {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
        .unique();
      return [wallet, profile] as const;
    }),
  );

  const profileMap = new Map(profileEntries);

  const urlEntries = await Promise.all(
    posts.map(async (post) => {
      const url = await ctx.storage.getUrl(post.videoStorageId);
      return [post._id, url] as const;
    }),
  );
  const urlMap = new Map(urlEntries);

  return posts.map((post) => {
    const profile = profileMap.get(post.userId) ?? null;
    const videoUrl = urlMap.get(post._id) ?? "";
    return {
      id: post._id,
      user_id: post.userId,
      video_url: videoUrl,
      text: post.text,
      created_at: new Date(post.createdAt).toISOString(),
      profile: toSummary(post.userId, profile),
    };
  });
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").order("desc").collect();
    return await attachProfiles(ctx, posts);
  },
});

export const listPaginated = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("posts")
      .order("desc")
      .paginate(args.paginationOpts);
    const page = await attachProfiles(ctx, result.page);
    return { ...result, page };
  },
});

export const byFollowing = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.wallet))
      .collect();

    if (following.length === 0) return [];

    const postBuckets = await Promise.all(
      following.map((record) =>
        ctx.db
          .query("posts")
          .withIndex("by_user", (q) => q.eq("userId", record.followingId))
          .order("desc")
          .collect(),
      ),
    );

    const posts = postBuckets.flat();
    posts.sort((a, b) => b.createdAt - a.createdAt);
    return await attachProfiles(ctx, posts);
  },
});

export const byFollowingPaginated = query({
  args: { wallet: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.wallet))
      .collect();

    if (following.length === 0) {
      return { page: [], isDone: true, continueCursor: null };
    }

    const followingIds = following.map((record) => record.followingId);
    const baseQuery = ctx.db.query("posts").order("desc");
    const filteredQuery =
      followingIds.length === 1
        ? baseQuery.filter((q) =>
            q.eq(q.field("userId"), followingIds[0]),
          )
        : baseQuery.filter((q) =>
            q.or(
              ...followingIds.map((id) => q.eq(q.field("userId"), id)),
            ),
          );

    const result = await filteredQuery.paginate(args.paginationOpts);
    const page = await attachProfiles(ctx, result.page);
    return { ...result, page };
  },
});

export const byUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    return await attachProfiles(ctx, posts);
  },
});

export const likedByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    if (likes.length === 0) return [];

    const likedPosts = await Promise.all(
      likes.map((like) => ctx.db.get(like.postId)),
    );
    const posts = likedPosts.filter(
      (post): post is Doc<"posts"> => Boolean(post),
    );
    return await attachProfiles(ctx, posts);
  },
});

export const get = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return null;
    const [result] = await attachProfiles(ctx, [post]);
    return result ?? null;
  },
});

export const create = mutation({
  args: {
    userId: v.string(),
    storageId: v.id("_storage"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("posts", {
      userId: args.userId,
      videoStorageId: args.storageId,
      text: args.text,
      createdAt: now,
    });
    return id;
  },
});

export const remove = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found.");
    }

    const likes = await ctx.db
      .query("likes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    await Promise.all(likes.map((like) => ctx.db.delete(like._id)));

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    await Promise.all(comments.map((comment) => ctx.db.delete(comment._id)));

    await ctx.storage.delete(post.videoStorageId);
    await ctx.db.delete(args.postId);
    return true;
  },
});
