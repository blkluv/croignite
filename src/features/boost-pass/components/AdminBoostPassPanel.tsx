"use client";

import { useEffect, useMemo, useState } from "react";
import { isAddress, getAddress, type Address } from "viem";
import {
  useAccount,
  useChainId,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { WalletConnectButton } from "@/components/ui/WalletConnectButton";
import WalletGateSkeleton from "@/components/feedback/WalletGateSkeleton";
import { cronosTestnetContracts } from "@/lib/contracts/addresses";
import boostPassAbi from "@/lib/contracts/abi/ClipYieldBoostPass.json";
import { formatShortHash } from "@/lib/utils";
import { explorerTxUrl } from "@/lib/web3/cronosConfig";
import getLatestLeaderboard from "@/app/hooks/useGetLatestLeaderboard";
import logBoostPassEpoch from "@/app/hooks/useLogBoostPassEpoch";
import type { LeaderboardSnapshot } from "@/app/types";

const boostPassAddress = cronosTestnetContracts.boostPass as Address;
const publishIntervalHoursRaw =
  process.env.NEXT_PUBLIC_BOOST_PASS_EPOCH_INTERVAL_HOURS ?? "24";
const publishIntervalHours = Number.isFinite(Number(publishIntervalHoursRaw))
  ? Number(publishIntervalHoursRaw)
  : 24;

export default function AdminBoostPassPanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending } = useWriteContract();
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [epochInput, setEpochInput] = useState("");
  const [epochTouched, setEpochTouched] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [publishedEpoch, setPublishedEpoch] = useState<number | null>(null);
  const [loggedTxHash, setLoggedTxHash] = useState<string | null>(null);

  const isOnCronos = chainId === cronosTestnetContracts.chainId;

  useEffect(() => {
    let isMounted = true;
    setStatus("loading");
    setError(null);

    (async () => {
      try {
        const result = await getLatestLeaderboard();
        if (!isMounted) return;
        setSnapshot(result);
        setStatus("ready");
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load leaderboard.");
        setStatus("error");
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const topWallets = useMemo(() => {
    if (!snapshot?.topBoosters?.length) return [];
    return snapshot.topBoosters
      .map((entry) => entry.wallet)
      .filter((wallet) => isAddress(wallet))
      .map((wallet) => getAddress(wallet));
  }, [snapshot]);

  const { data: currentEpoch } = useReadContract({
    address: boostPassAddress,
    abi: boostPassAbi,
    functionName: "currentEpoch",
    query: { enabled: isConnected && isOnCronos },
  });

  const currentEpochValue =
    typeof currentEpoch === "bigint" ? Number(currentEpoch) : null;

  useEffect(() => {
    if (epochTouched) return;
    if (typeof currentEpochValue === "number") {
      setEpochInput(String(currentEpochValue + 1));
    }
  }, [currentEpochValue, epochTouched]);

  const { data: managerRole } = useReadContract({
    address: boostPassAddress,
    abi: boostPassAbi,
    functionName: "MANAGER_ROLE",
    query: { enabled: isConnected && isOnCronos },
  });

  const { data: isManager } = useReadContract({
    address: boostPassAddress,
    abi: boostPassAbi,
    functionName: "hasRole",
    args:
      managerRole && address
        ? [managerRole as `0x${string}`, address]
        : undefined,
    query: { enabled: Boolean(managerRole && address && isOnCronos) },
  });
  const hasManagerRole = Boolean(isManager);

  const receipt = useWaitForTransactionReceipt({
    chainId: cronosTestnetContracts.chainId,
    hash: txHash ?? undefined,
    query: { enabled: Boolean(txHash) },
  });

  useEffect(() => {
    if (!receipt.isSuccess || !txHash || !address || !publishedEpoch) return;
    if (loggedTxHash === txHash) return;

    setLoggedTxHash(txHash);
    void logBoostPassEpoch({
      epoch: publishedEpoch,
      publishedBy: address,
      txHash,
      topWallets,
    }).catch((err) => {
      console.error("Failed to log boost pass epoch", err);
    });
  }, [receipt.isSuccess, txHash, address, publishedEpoch, topWallets, loggedTxHash]);

  const handleSwitchChain = async () => {
    if (!switchChainAsync) return;
    setSubmitError(null);
    await switchChainAsync({ chainId: cronosTestnetContracts.chainId });
  };

  const handlePublish = async () => {
    if (!isConnected) {
      setSubmitError("Connect the admin wallet to continue.");
      return;
    }
    if (!isOnCronos) {
      setSubmitError("Switch to Cronos Testnet to continue.");
      return;
    }
    if (!hasManagerRole) {
      setSubmitError("Connected wallet is not authorized to publish epochs.");
      return;
    }

    const epoch = Number.parseInt(epochInput, 10);
    if (!Number.isInteger(epoch) || epoch <= 0) {
      setSubmitError("Enter a valid epoch number.");
      return;
    }
    if (!topWallets.length) {
      setSubmitError("No top boosters found to publish.");
      return;
    }

    setSubmitError(null);
    try {
      const hash = await writeContractAsync({
        address: boostPassAddress,
        abi: boostPassAbi,
        functionName: "publishEpoch",
        args: [BigInt(epoch), topWallets],
      });
      setTxHash(hash);
      setPublishedEpoch(epoch);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Transaction failed.");
    }
  };

  const canPublish =
    isConnected && isOnCronos && hasManagerRole && topWallets.length > 0 && !isPending;

  if (!isConnected) {
    return <WalletGateSkeleton cards={2} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">Boost Pass Admin</CardTitle>
            <CardDescription>
              Epochs auto-publish every {publishIntervalHours} hours. Use this panel for
              manual overrides.
            </CardDescription>
          </div>
          <WalletConnectButton />
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Contract</span>
              <span className="font-mono text-xs">{formatShortHash(boostPassAddress)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current epoch</span>
              <span>{currentEpochValue ?? "Loading..."}</span>
            </div>
          </div>
          <Separator />
          {isConnected && !isOnCronos && (
            <Alert variant="warning">
              <AlertTitle>Wrong network</AlertTitle>
              <AlertDescription>Switch to Cronos Testnet to continue.</AlertDescription>
              <div className="mt-3">
                <Button variant="outline" onClick={handleSwitchChain}>
                  Switch network
                </Button>
              </div>
            </Alert>
          )}
          {isConnected && isOnCronos && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Role status</span>
              <Badge variant={hasManagerRole ? "success" : "warning"}>
                {hasManagerRole ? "Epoch manager" : "Not authorized"}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Publish epoch</CardTitle>
          <CardDescription>
            Pulls the latest leaderboard snapshot and assigns Boost Pass eligibility.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "error" && (
            <Alert variant="destructive">
              <AlertTitle>Leaderboard unavailable</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {status === "loading" && (
            <Alert variant="info">
              <AlertTitle>Loading leaderboard</AlertTitle>
              <AlertDescription>Fetching latest top boosters.</AlertDescription>
            </Alert>
          )}

          {status === "ready" && !snapshot && (
            <Alert variant="warning">
              <AlertTitle>No leaderboard yet</AlertTitle>
              <AlertDescription>
                Wait for confirmed boosts before publishing an epoch.
              </AlertDescription>
            </Alert>
          )}

          {submitError && (
            <Alert variant="destructive">
              <AlertTitle>Action blocked</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="epoch">
              Epoch number
            </label>
            <Input
              id="epoch"
              type="number"
              value={epochInput}
              onChange={(event) => {
                setEpochInput(event.target.value);
                setEpochTouched(true);
              }}
              min={1}
            />
          </div>

          <div className="rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Eligible wallets</span>
              <span>{topWallets.length}</span>
            </div>
            <div className="mt-3 space-y-1">
              {topWallets.length ? (
                topWallets.map((wallet) => (
                  <div key={wallet} className="font-mono text-xs">
                    {formatShortHash(wallet)}
                  </div>
                ))
              ) : (
                <span className="text-muted-foreground">No wallets available.</span>
              )}
            </div>
          </div>

          <Button onClick={handlePublish} disabled={!canPublish}>
            {isPending ? "Publishing..." : "Publish epoch on-chain"}
          </Button>

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
              <AlertDescription>
                The epoch will be available once the transaction is confirmed.
              </AlertDescription>
            </Alert>
          )}

          {receipt.isSuccess && (
            <Alert variant="success">
              <AlertTitle>Epoch published</AlertTitle>
              <AlertDescription>
                Top boosters can now claim their Boost Pass on the leaderboard.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
