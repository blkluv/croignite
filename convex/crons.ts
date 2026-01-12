import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "recompute leaderboards",
  { minutes: 1 },
  internal.leaderboards.recompute,
  {},
);
crons.interval(
  "retry pending vault tx",
  { minutes: 1 },
  internal.vaultTx.retryPending,
  {},
);
crons.interval(
  "retry pending campaign receipts",
  { minutes: 1 },
  internal.campaignReceipts.retryPending,
  {},
);
crons.interval(
  "auto publish boost pass epoch",
  { minutes: 30 },
  internal.boostPassPublisher.autoPublishEpoch,
  {},
);

export default crons;
