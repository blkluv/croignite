import type { MutationCtx } from "../_generated/server";
import { getAddress, isAddress } from "viem";
import { getEnv } from "../env";
import { cronos } from "../../src/lib/web3/cronosConstants";

export type ActivityKind =
  | "boost_deposit"
  | "sponsor_deposit"
  | "yield_deposit"
  | "yield_withdraw"
  | "boost_pass_claim";

export type ActivityStatus = "pending" | "confirmed" | "failed";

export function resolveActivityChainId() {
  const raw =
    getEnv("NEXT_PUBLIC_CRONOS_CHAIN_ID") ??
    getEnv("CRONOS_CHAIN_ID") ??
    String(cronos.testnet.chainId);
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) {
    throw new Error("Missing or invalid chain ID for activity events.");
  }
  return parsed;
}

export async function upsertActivityEvent(
  ctx: MutationCtx,
  args: {
    wallet: string;
    chainId: number;
    txHash: string;
    kind: ActivityKind;
    status: ActivityStatus;
    title: string;
    subtitle?: string;
    href: string;
    amount?: string;
    assetSymbol?: string;
  },
) {
  if (!isAddress(args.wallet)) {
    throw new Error("Invalid wallet address for activity event.");
  }
  if (!args.txHash.startsWith("0x") || args.txHash.length !== 66) {
    throw new Error("Invalid transaction hash for activity event.");
  }

  const normalizedWallet = getAddress(args.wallet);
  const existing = await ctx.db
    .query("activityEvents")
    .withIndex("by_txHash", (q) => q.eq("txHash", args.txHash))
    .unique();

  const payload = {
    wallet: normalizedWallet,
    chainId: args.chainId,
    txHash: args.txHash,
    kind: args.kind,
    status: args.status,
    title: args.title,
    subtitle: args.subtitle,
    href: args.href,
    amount: args.amount,
    assetSymbol: args.assetSymbol,
  };

  if (existing) {
    await ctx.db.patch(existing._id, payload);
    return existing._id;
  }

  return await ctx.db.insert("activityEvents", payload);
}

export async function setActivityStatusByTxHash(
  ctx: MutationCtx,
  args: { txHash: string; status: ActivityStatus },
) {
  if (!args.txHash.startsWith("0x") || args.txHash.length !== 66) {
    return null;
  }

  const existing = await ctx.db
    .query("activityEvents")
    .withIndex("by_txHash", (q) => q.eq("txHash", args.txHash))
    .unique();

  if (!existing) return null;

  await ctx.db.patch(existing._id, { status: args.status });
  return existing._id;
}
