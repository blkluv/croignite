"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, useChainId, useSwitchChain, useWaitForTransactionReceipt } from "wagmi";
import { getAddress, isAddress } from "viem";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import WalletGateSkeleton from "@/components/feedback/WalletGateSkeleton";
import { cronosTestnetContracts } from "@/lib/contracts/addresses";
import { formatShortHash } from "@/lib/utils";
import { explorerTxUrl } from "@/lib/web3/cronosConfig";
import type { BoostPassEpoch, LeaderboardSnapshot } from "@/app/types";
import { useBoostPass } from "@/features/boost-pass/hooks/useBoostPass";
import logBoostPassClaim from "@/app/hooks/useLogBoostPassClaim";

type BoostPassClaimCardProps = {
  snapshot: LeaderboardSnapshot | null;
  latestEpoch: BoostPassEpoch | null;
};

const resolvePublishIntervalHours = () => {
  const raw = process.env.NEXT_PUBLIC_BOOST_PASS_EPOCH_INTERVAL_HOURS;
  const parsed = raw ? Number(raw) : 24;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
};

export default function BoostPassClaimCard({
  snapshot,
  latestEpoch,
}: BoostPassClaimCardProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const {
    currentEpoch,
    eligible,
    claimed,
    hasPass,
    claim,
    isClaimPending,
    isOnCronos,
  } = useBoostPass();

  const [actionError, setActionError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [claimEpoch, setClaimEpoch] = useState<number | null>(null);
  const [loggedTx, setLoggedTx] = useState<string | null>(null);

  const isOnNetwork = chainId === cronosTestnetContracts.chainId;

  const epochNumber = currentEpoch !== null ? Number(currentEpoch) : null;
  const epochPublished = typeof epochNumber === "number" && epochNumber > 0;
  const publishIntervalHours = resolvePublishIntervalHours();

  const inSnapshot = useMemo(() => {
    if (!snapshot?.topBoosters?.length || !address || !isAddress(address)) return false;
    const normalized = getAddress(address);
    return snapshot.topBoosters.some(
      (entry) => isAddress(entry.wallet) && getAddress(entry.wallet) === normalized,
    );
  }, [snapshot, address]);

  const receipt = useWaitForTransactionReceipt({
    chainId: cronosTestnetContracts.chainId,
    hash: txHash ?? undefined,
    query: { enabled: Boolean(txHash) },
  });

  useEffect(() => {
    if (!receipt.isSuccess || !txHash || !address || !claimEpoch) return;
    if (loggedTx === txHash) return;
    setLoggedTx(txHash);

    void logBoostPassClaim({
      epoch: claimEpoch,
      wallet: address,
      txHash,
    }).catch((err) => {
      console.error("Failed to log boost pass claim", err);
    });
  }, [receipt.isSuccess, txHash, address, claimEpoch, loggedTx]);

  const handleSwitchChain = async () => {
    if (!switchChainAsync) return;
    setActionError(null);
    await switchChainAsync({ chainId: cronosTestnetContracts.chainId });
  };

  const handleClaim = async () => {
    if (!currentEpoch) {
      setActionError("No active epoch has been published yet.");
      return;
    }
    setActionError(null);
    try {
      const hash = await claim(currentEpoch);
      setTxHash(hash);
      setClaimEpoch(Number(currentEpoch));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Claim failed.");
    }
  };

  if (!isConnected) {
    return <WalletGateSkeleton cards={1} />;
  }

  const statusLabel = hasPass
    ? "Boost Pass active"
    : eligible
      ? "Eligible to claim"
      : inSnapshot
        ? "Pending publish"
        : "Not eligible";

  const statusVariant: "success" | "warning" | "outline" =
    hasPass || eligible ? "success" : inSnapshot ? "warning" : "outline";

  const lastPublishedAt = latestEpoch?.publishedAt
    ? new Date(latestEpoch.publishedAt)
    : null;

  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle>Boost Pass claim</CardTitle>
            <CardDescription>
              A non-transferable badge for top boosters. Claiming unlocks exclusive remix packs.
            </CardDescription>
          </div>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
        <CardDescription>
          Epochs publish automatically. Claim opens after the latest leaderboard snapshot is
          anchored on-chain.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current epoch</span>
            <span>{epochNumber !== null ? epochNumber : "Loading..."}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Publish cadence</span>
            <span>Every {publishIntervalHours}h</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Last publish</span>
            <span>
              {lastPublishedAt ? lastPublishedAt.toLocaleString() : "Not published yet"}
            </span>
          </div>
        </div>

        {isConnected && !isOnCronos && (
          <Alert variant="warning">
            <AlertTitle>Wrong network</AlertTitle>
            <AlertDescription>Switch to Cronos Testnet to claim.</AlertDescription>
            <div className="mt-3">
              <Button variant="outline" onClick={handleSwitchChain}>
                Switch network
              </Button>
            </div>
          </Alert>
        )}

        {isConnected && isOnCronos && !eligible && inSnapshot && (
          <Alert variant="info">
            <AlertTitle>Eligibility pending publish</AlertTitle>
            <AlertDescription>
              You&apos;re on the latest top boosters list. The claim unlocks after the next
              epoch publish.
            </AlertDescription>
          </Alert>
        )}

        {isConnected && isOnCronos && eligible && hasPass && (
          <Alert variant="success">
            <AlertTitle>Boost Pass active</AlertTitle>
            <AlertDescription>
              You hold the current Boost Pass. Unlock perks in{" "}
              <Link className="underline underline-offset-2" href="/perks/boost-pass">
                Boost Pass perks
              </Link>
              .
            </AlertDescription>
          </Alert>
        )}

        {actionError && (
          <Alert variant="destructive">
            <AlertTitle>Claim blocked</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Claim status
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Leaderboard snapshot</span>
              <Badge variant={snapshot ? "success" : "outline"}>
                {snapshot ? "Ready" : "Waiting"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Epoch published</span>
              <Badge variant={epochPublished ? "success" : "warning"}>
                {epochPublished ? "Published" : "Publishing soon"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Eligibility</span>
              <Badge variant={eligible ? "success" : inSnapshot ? "warning" : "outline"}>
                {eligible ? "Eligible" : inSnapshot ? "Queued" : "Not eligible"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Network</span>
              <Badge variant={isOnCronos ? "success" : "warning"}>
                {isOnCronos ? "Cronos Testnet" : "Wrong network"}
              </Badge>
            </div>
          </div>
        </div>

        {isConnected && isOnCronos && eligible && !claimed && !hasPass && (
          <Button onClick={handleClaim} disabled={isClaimPending}>
            {isClaimPending ? "Claiming..." : "Claim Boost Pass"}
          </Button>
        )}

        {txHash && (
          <Alert variant="success">
            <AlertTitle>Transaction submitted</AlertTitle>
            <AlertDescription>
              {formatShortHash(txHash)}{" "}
              <a
                className="underline underline-offset-2"
                href={explorerTxUrl(txHash)}
                target="_blank"
                rel="noreferrer"
              >
                View on Cronos Explorer
              </a>
            </AlertDescription>
          </Alert>
        )}

        {receipt.isLoading && (
          <Alert variant="info">
            <AlertTitle>Waiting for confirmation</AlertTitle>
            <AlertDescription>Claim will finalize after confirmation.</AlertDescription>
          </Alert>
        )}

        {receipt.isSuccess && (
          <Alert variant="success">
            <AlertTitle>Boost Pass claimed</AlertTitle>
            <AlertDescription>
              Head to{" "}
              <Link className="underline underline-offset-2" href="/perks/boost-pass">
                Boost Pass perks
              </Link>{" "}
              to download the remix pack.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
