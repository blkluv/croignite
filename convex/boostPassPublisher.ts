import { internalAction } from "./_generated/server";
import { anyApi } from "convex/server";
import { getAddress, isAddress, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getEnv } from "./env";
import { createCronosClients } from "./cronos";
import boostPassAbi from "../src/lib/contracts/abi/ClipYieldBoostPass.json";

const normalizePrivateKey = (value: string) =>
  value.startsWith("0x") ? value : `0x${value}`;

const resolveBoostPassAddress = (): Address => {
  const address =
    getEnv("BOOST_PASS_ADDRESS") ?? getEnv("NEXT_PUBLIC_BOOST_PASS_ADDRESS");

  if (!address || !isAddress(address)) {
    throw new Error("Missing or invalid Boost Pass contract address.");
  }

  return getAddress(address);
};

const resolvePublisherKey = () => getEnv("BOOST_PASS_MANAGER_PRIVATE_KEY");

const resolveEpochIntervalMs = () => {
  const raw =
    getEnv("BOOST_PASS_EPOCH_INTERVAL_HOURS") ??
    getEnv("NEXT_PUBLIC_BOOST_PASS_EPOCH_INTERVAL_HOURS");
  const parsed = raw ? Number(raw) : 24;
  const hours = Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
  return hours * 60 * 60 * 1000;
};

export const autoPublishEpoch = internalAction({
  args: {},
  handler: async (ctx) => {
    const snapshot = (await ctx.runQuery(anyApi.leaderboards.getLatest, {})) as
      | { topBoosters: { wallet: string }[] }
      | null;

    if (!snapshot || !snapshot.topBoosters.length) {
      return { ok: false, reason: "no_snapshot" };
    }

    const latestEpoch = await ctx.runQuery(anyApi.boostPass.getLatestEpoch, {});
    const intervalMs = resolveEpochIntervalMs();

    if (latestEpoch && Date.now() - latestEpoch.publishedAt < intervalMs) {
      return {
        ok: false,
        reason: "interval_not_elapsed",
        nextPublishAt: latestEpoch.publishedAt + intervalMs,
      };
    }

    const publisherKey = resolvePublisherKey();
    if (!publisherKey) {
      throw new Error("Missing BOOST_PASS_MANAGER_PRIVATE_KEY.");
    }

    const privateKey = normalizePrivateKey(publisherKey) as `0x${string}`;
    const account = privateKeyToAccount(privateKey);
    const { publicClient, walletClient } = createCronosClients(privateKey);
    const boostPassAddress = resolveBoostPassAddress();

    const currentEpoch = (await publicClient.readContract({
      address: boostPassAddress,
      abi: boostPassAbi,
      functionName: "currentEpoch",
    })) as bigint;

    const onchainEpoch = Number(currentEpoch ?? 0n);

    if (!latestEpoch && onchainEpoch > 0) {
      return { ok: false, reason: "missing_log" };
    }

    if (latestEpoch && latestEpoch.epoch > onchainEpoch) {
      return { ok: false, reason: "onchain_pending" };
    }

    const nextEpoch = onchainEpoch + 1;

    if (latestEpoch && latestEpoch.epoch >= nextEpoch) {
      return { ok: false, reason: "already_published" };
    }

    const topWallets = snapshot.topBoosters
      .map((entry) => entry.wallet)
      .filter((wallet): wallet is string => isAddress(wallet))
      .map((wallet) => getAddress(wallet));

    if (!topWallets.length) {
      return { ok: false, reason: "no_wallets" };
    }

    const txHash = await walletClient.writeContract({
      address: boostPassAddress,
      abi: boostPassAbi,
      functionName: "publishEpoch",
      args: [BigInt(nextEpoch), topWallets],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    await ctx.runMutation(anyApi.boostPass.logEpochPublish, {
      epoch: nextEpoch,
      publishedBy: account.address,
      txHash,
      topWallets,
    });

    return { ok: true, epoch: nextEpoch, txHash, topWallets: topWallets.length };
  },
});
