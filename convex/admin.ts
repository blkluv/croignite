import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getEnv } from "./env";

const TABLES = [
  "posts",
  "comments",
  "likes",
  "profiles",
  "projects",
  "creatorVaults",
  "sponsorCampaigns",
  "campaignReceipts",
  "x402CampaignReceipts",
  "vaultTx",
  "activityEvents",
  "leaderboardSnapshots",
  "boostPassEpochs",
  "boostPassClaims",
] as const;

export const truncateAll = mutation({
  args: {
    secret: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const expected = getEnv("CONVEX_RESET_TOKEN");
    if (expected && args.secret !== expected) {
      throw new Error("Invalid reset token provided.");
    }

    const batchSize = Math.min(Math.max(args.batchSize ?? 200, 1), 500);
    const summary: Record<string, number> = {};

    for (const table of TABLES) {
      let deleted = 0;
      while (true) {
        const rows = await ctx.db.query(table).take(batchSize);
        if (!rows.length) break;

        for (const row of rows) {
          if ("videoStorageId" in row) {
            await ctx.storage.delete(row.videoStorageId);
          }
          await ctx.db.delete(row._id);
        }
        deleted += rows.length;
      }
      summary[table] = deleted;
    }

    return summary;
  },
});
