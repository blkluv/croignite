import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query } from "./_generated/server";
import { getAddress, isAddress } from "viem";

const kindValidator = v.union(
  v.literal("boost_deposit"),
  v.literal("sponsor_deposit"),
  v.literal("yield_deposit"),
  v.literal("yield_withdraw"),
  v.literal("boost_pass_claim"),
);

export const listByWallet = query({
  args: {
    wallet: v.string(),
    kind: v.optional(kindValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    if (!isAddress(args.wallet)) {
      throw new Error("Invalid wallet address.");
    }

    const wallet = getAddress(args.wallet);
    const baseQuery = args.kind
      ? ctx.db
          .query("activityEvents")
          .withIndex("by_wallet_kind", (q) =>
            q.eq("wallet", wallet).eq("kind", args.kind!),
          )
      : ctx.db
          .query("activityEvents")
          .withIndex("by_wallet", (q) => q.eq("wallet", wallet));

    return await baseQuery.order("desc").paginate(args.paginationOpts);
  },
});
