import { internalMutation, query } from "./_generated/server";

function sumMap<K>(map: Map<K, bigint>, key: K, delta: bigint) {
  const current = map.get(key) ?? 0n;
  map.set(key, current + delta);
}

function compareBigIntDesc(a: bigint, b: bigint) {
  if (a === b) return 0;
  return a > b ? -1 : 1;
}

export const recompute = internalMutation({
  handler: async (ctx) => {
    const confirmedCampaigns = await ctx.db
      .query("campaignReceipts")
      .withIndex("by_status", (q) => q.eq("status", "confirmed"))
      .collect();

    const confirmedX402Campaigns = await ctx.db
      .query("x402CampaignReceipts")
      .withIndex("by_status", (q) => q.eq("status", "confirmed"))
      .collect();

    const confirmedBoosts = await ctx.db
      .query("vaultTx")
      .withIndex("by_kind_status", (q) =>
        q.eq("kind", "boostDeposit").eq("status", "confirmed"),
      )
      .collect();

    const confirmedAllBoosters = await ctx.db
      .query("vaultTx")
      .withIndex("by_status", (q) => q.eq("status", "confirmed"))
      .collect();

    const creatorTotals = new Map<string, { sponsored: bigint; boost: bigint }>();
    const boosterTotals = new Map<string, bigint>();

    for (const campaign of confirmedCampaigns) {
      const assets = BigInt(campaign.assetsWei);
      const current = creatorTotals.get(campaign.creatorId) ?? {
        sponsored: 0n,
        boost: 0n,
      };
      creatorTotals.set(campaign.creatorId, {
        sponsored: current.sponsored + assets,
        boost: current.boost,
      });
    }

    for (const campaign of confirmedX402Campaigns) {
      const assets = BigInt(campaign.assetsWei);
      const current = creatorTotals.get(campaign.creatorId) ?? {
        sponsored: 0n,
        boost: 0n,
      };
      creatorTotals.set(campaign.creatorId, {
        sponsored: current.sponsored + assets,
        boost: current.boost,
      });
      sumMap(boosterTotals, campaign.sponsorAddress, assets);
    }

    for (const boost of confirmedBoosts) {
      if (!boost.creatorId) continue;
      const assets = BigInt(boost.assetsWei);
      const current = creatorTotals.get(boost.creatorId) ?? {
        sponsored: 0n,
        boost: 0n,
      };
      creatorTotals.set(boost.creatorId, {
        sponsored: current.sponsored,
        boost: current.boost + assets,
      });
    }

    for (const boost of confirmedAllBoosters) {
      if (boost.kind !== "boostDeposit" && boost.kind !== "sponsorDeposit") continue;
      sumMap(boosterTotals, boost.wallet, BigInt(boost.assetsWei));
    }

    const topCreators = Array.from(creatorTotals.entries())
      .map(([creatorId, totals]) => ({
        creatorId,
        sponsoredWei: totals.sponsored.toString(),
        boostWei: totals.boost.toString(),
        totalWei: (totals.sponsored + totals.boost).toString(),
      }))
      .sort((a, b) =>
        compareBigIntDesc(BigInt(a.totalWei), BigInt(b.totalWei)),
      )
      .slice(0, 10)
      .map(({ creatorId, sponsoredWei, boostWei }) => ({
        creatorId,
        sponsoredWei,
        boostWei,
      }));

    const topBoosters = Array.from(boosterTotals.entries())
      .map(([wallet, boostWei]) => ({
        wallet,
        boostWei: boostWei.toString(),
      }))
      .sort((a, b) =>
        compareBigIntDesc(BigInt(a.boostWei), BigInt(b.boostWei)),
      )
      .slice(0, 10);

    await ctx.db.insert("leaderboardSnapshots", {
      ts: Date.now(),
      topCreators,
      topBoosters,
    });
  },
});

export const getLatest = query({
  handler: async (ctx) => {
    return await ctx.db.query("leaderboardSnapshots").order("desc").first();
  },
});
