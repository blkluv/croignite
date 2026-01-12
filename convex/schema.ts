import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  profiles: defineTable({
    wallet: v.string(),
    name: v.string(),
    username: v.optional(v.string()),
    bio: v.string(),
    image: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_wallet", ["wallet"])
    .index("by_name", ["name"]),

  posts: defineTable({
    userId: v.string(),
    videoStorageId: v.id("_storage"),
    text: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_createdAt", ["createdAt"]),

  comments: defineTable({
    postId: v.id("posts"),
    userId: v.string(),
    text: v.string(),
    createdAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_user", ["userId"]),

  likes: defineTable({
    postId: v.id("posts"),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_user", ["userId"])
    .index("by_post_and_user", ["postId", "userId"]),

  follows: defineTable({
    followerId: v.string(),
    followingId: v.string(),
    createdAt: v.number(),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("by_follower_following", ["followerId", "followingId"]),

  projects: defineTable({
    wallet: v.string(),
    localId: v.string(),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_wallet", ["wallet"])
    .index("by_localId", ["localId"]),

  creatorVaults: defineTable({
    wallet: v.string(),
    vault: v.string(),
    txHash: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_wallet", ["wallet"]),

  sponsorCampaigns: defineTable({
    postId: v.id("posts"),
    clipHash: v.string(),
    creatorId: v.string(),
    vaultAddress: v.string(),
    sponsorAddress: v.string(),
    assets: v.string(),
    protocolFeeWei: v.string(),
    campaignId: v.string(),
    receiptTokenId: v.string(),
    invoiceReceiptAddress: v.string(),
    txHash: v.string(),
    createdAt: v.number(),
  })
    .index("by_postId", ["postId"])
    .index("by_creatorId", ["creatorId"])
    .index("by_sponsorAddress", ["sponsorAddress"]),

  campaignReceipts: defineTable({
    postId: v.id("posts"),
    clipHash: v.string(),
    creatorId: v.string(),
    sponsorAddress: v.string(),
    boostVault: v.string(),
    assetsWei: v.string(),
    protocolFeeWei: v.string(),
    campaignId: v.string(),
    receiptTokenId: v.string(),
    invoiceReceiptAddress: v.string(),
    termsHash: v.string(),
    txHash: v.string(),
    sponsorName: v.string(),
    objective: v.string(),
    deliverables: v.array(v.string()),
    startDateIso: v.string(),
    endDateIso: v.string(),
    disclosure: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("failed"),
    ),
    confirmedAt: v.optional(v.number()),
    l2BlockNumber: v.optional(v.number()),
    l2TimestampIso: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_txHash", ["txHash"])
    .index("by_creatorId", ["creatorId"])
    .index("by_postId", ["postId"])
    .index("by_status", ["status"]),

  x402CampaignReceipts: defineTable({
    postId: v.id("posts"),
    creatorId: v.string(),
    sponsorAddress: v.string(),
    payTo: v.string(),
    assetsWei: v.string(),
    asset: v.string(),
    network: v.string(),
    nonce: v.string(),
    validBefore: v.number(),
    txHash: v.string(),
    blockNumber: v.optional(v.number()),
    timestampIso: v.string(),
    sponsorName: v.string(),
    objective: v.string(),
    deliverables: v.array(v.string()),
    startDateIso: v.string(),
    endDateIso: v.string(),
    disclosure: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("failed"),
    ),
    confirmedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_txHash", ["txHash"])
    .index("by_sponsor_nonce", ["sponsorAddress", "nonce"])
    .index("by_creatorId", ["creatorId"])
    .index("by_postId", ["postId"])
    .index("by_status", ["status"]),

  vaultTx: defineTable({
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
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("failed"),
    ),
    confirmedAt: v.optional(v.number()),
    l2BlockNumber: v.optional(v.number()),
    l2TimestampIso: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_wallet", ["wallet"])
    .index("by_wallet_kind", ["wallet", "kind"])
    .index("by_creatorId", ["creatorId"])
    .index("by_txHash", ["txHash"])
    .index("by_status", ["status"])
    .index("by_kind_status", ["kind", "status"]),

  activityEvents: defineTable({
    wallet: v.string(),
    chainId: v.number(),
    txHash: v.string(),
    kind: v.union(
      v.literal("boost_deposit"),
      v.literal("sponsor_deposit"),
      v.literal("yield_deposit"),
      v.literal("yield_withdraw"),
      v.literal("boost_pass_claim"),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("failed"),
    ),
    title: v.string(),
    subtitle: v.optional(v.string()),
    href: v.string(),
    amount: v.optional(v.string()),
    assetSymbol: v.optional(v.string()),
  })
    .index("by_wallet", ["wallet"])
    .index("by_wallet_kind", ["wallet", "kind"])
    .index("by_txHash", ["txHash"]),

  boostPassEpochs: defineTable({
    epoch: v.number(),
    publishedAt: v.number(),
    publishedBy: v.string(),
    txHash: v.optional(v.string()),
    topWallets: v.array(v.string()),
  }).index("by_epoch", ["epoch"]),

  boostPassClaims: defineTable({
    epoch: v.number(),
    wallet: v.string(),
    txHash: v.string(),
    claimedAt: v.number(),
  }).index("by_epoch_wallet", ["epoch", "wallet"]),

  leaderboardSnapshots: defineTable({
    ts: v.number(),
    topCreators: v.array(
      v.object({
        creatorId: v.string(),
        sponsoredWei: v.string(),
        boostWei: v.string(),
      }),
    ),
    topBoosters: v.array(
      v.object({
        wallet: v.string(),
        boostWei: v.string(),
      }),
    ),
  }),
});
