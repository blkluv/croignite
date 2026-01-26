"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { formatUnits, getAddress, type Address } from "viem";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cronosTestnetContracts } from "@/lib/contracts/addresses";
import streamerAbi from "@/lib/contracts/abi/SimulatedYieldStreamer.json";
import vaultAbi from "@/lib/contracts/abi/ClipYieldVault.json";
import { erc20Abi } from "@/lib/web3/erc20";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/web3/cronosConfig";
import { cn, formatShortHash } from "@/lib/utils";

type YieldStreamingPanelProps = {
  vaultAddress?: Address;
};

export default function YieldStreamingPanel({ vaultAddress }: YieldStreamingPanelProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [now, setNow] = useState(Date.now());
  const [syncHash, setSyncHash] = useState<`0x${string}` | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const isOnCronos = chainId === cronosTestnetContracts.chainId;
  const streamer = getAddress(cronosTestnetContracts.yieldStreamer);
  const usdce = getAddress(cronosTestnetContracts.usdce);
  const vault = getAddress(
    (vaultAddress ?? cronosTestnetContracts.croigniteVault) as Address,
  );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: pendingYield, refetch: refetchPendingYield } = useReadContract({
    address: streamer,
    abi: streamerAbi,
    functionName: "pendingYield",
    chainId: cronosTestnetContracts.chainId,
    query: { enabled: isOnCronos, refetchInterval: 12_000 },
  });

  const { data: ratePerSecond, refetch: refetchRate } = useReadContract({
    address: streamer,
    abi: streamerAbi,
    functionName: "ratePerSecond",
    chainId: cronosTestnetContracts.chainId,
    query: { enabled: isOnCronos, refetchInterval: 20_000 },
  });

  const { data: lastDrip, refetch: refetchLastDrip } = useReadContract({
    address: streamer,
    abi: streamerAbi,
    functionName: "lastDrip",
    chainId: cronosTestnetContracts.chainId,
    query: { enabled: isOnCronos, refetchInterval: 20_000 },
  });

  const { data: bufferBalance, refetch: refetchBuffer } = useReadContract({
    address: usdce,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [streamer],
    chainId: cronosTestnetContracts.chainId,
    query: { enabled: isOnCronos, refetchInterval: 12_000 },
  });

  const { data: totalSupply } = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: "totalSupply",
    chainId: cronosTestnetContracts.chainId,
    query: { enabled: isOnCronos, refetchInterval: 20_000 },
  });

  const { data: shareBalance } = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: cronosTestnetContracts.chainId,
    query: { enabled: Boolean(address && isOnCronos), refetchInterval: 20_000 },
  });

  const pendingYieldValue = typeof pendingYield === "bigint" ? pendingYield : 0n;
  const ratePerSecondValue = typeof ratePerSecond === "bigint" ? ratePerSecond : 0n;
  const lastDripValue = typeof lastDrip === "bigint" ? lastDrip : 0n;
  const bufferValue = typeof bufferBalance === "bigint" ? bufferBalance : 0n;
  const totalSupplyValue = typeof totalSupply === "bigint" ? totalSupply : 0n;
  const shareBalanceValue = typeof shareBalance === "bigint" ? shareBalance : 0n;

  const estimatedPending = useMemo(() => {
    if (ratePerSecondValue === 0n || lastDripValue === 0n) return 0n;
    const nowSeconds = Math.floor(now / 1000);
    const elapsed = Math.max(0, nowSeconds - Number(lastDripValue));
    if (!Number.isFinite(elapsed)) return 0n;
    const estimated = ratePerSecondValue * BigInt(elapsed);
    return estimated > bufferValue ? bufferValue : estimated;
  }, [bufferValue, lastDripValue, now, ratePerSecondValue]);

  const userEstimatedShare = useMemo(() => {
    if (totalSupplyValue === 0n || shareBalanceValue === 0n) return 0n;
    return (estimatedPending * shareBalanceValue) / totalSupplyValue;
  }, [estimatedPending, shareBalanceValue, totalSupplyValue]);

  const formattedPendingYield = formatUnits(pendingYieldValue, 6);
  const formattedEstimatedPending = formatUnits(estimatedPending, 6);
  const formattedRatePerHour = formatUnits(ratePerSecondValue * 3600n, 6);
  const formattedBuffer = formatUnits(bufferValue, 6);
  const formattedUserShare = formatUnits(userEstimatedShare, 6);

  const lastDripLabel = lastDripValue
    ? new Date(Number(lastDripValue) * 1000).toLocaleString()
    : "—";

  const canSync = Boolean(isOnCronos && bufferValue > 0n);

  const receipt = useWaitForTransactionReceipt({
    chainId: cronosTestnetContracts.chainId,
    hash: syncHash ?? undefined,
    query: { enabled: Boolean(syncHash) },
  });

  useEffect(() => {
    if (!receipt.isSuccess) return;
    void refetchPendingYield();
    void refetchRate();
    void refetchLastDrip();
    void refetchBuffer();
  }, [receipt.isSuccess, refetchBuffer, refetchLastDrip, refetchPendingYield, refetchRate]);

  const handleSync = async () => {
    if (!writeContractAsync || !canSync) return;
    setSyncError(null);
    setIsSyncing(true);
    try {
      let gas: bigint | undefined;
      try {
        gas = await publicClient?.estimateContractGas({
          address: streamer,
          abi: streamerAbi,
          functionName: "drip",
          account: address ?? undefined,
        });
        if (typeof gas === "bigint") {
          const buffered = (gas * 13n) / 10n;
          gas = buffered < 150_000n ? 150_000n : buffered;
        }
      } catch {
        gas = 150_000n;
      }

      const hash = await writeContractAsync({
        address: streamer,
        abi: streamerAbi,
        functionName: "drip",
        gas,
      });
      setSyncHash(hash);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Sync failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Yield engine</CardTitle>
          <CardDescription>
            Testnet simulation streams devUSDC.e into the vault so yield is visible in real time.
          </CardDescription>
        </div>
        <Badge variant="warning">Testnet only</Badge>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Streamer contract</span>
              <a
                className="font-mono underline underline-offset-2"
                href={explorerAddressUrl(streamer)}
                target="_blank"
                rel="noreferrer"
              >
                {formatShortHash(streamer)}
              </a>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Streaming now (est.)</span>
                <span className="font-mono">{formattedEstimatedPending} devUSDC.e</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">On-chain pending</span>
                <span className="font-mono">{formattedPendingYield} devUSDC.e</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Your share (est.)</span>
                <span className="font-mono">{formattedUserShare} devUSDC.e</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Rate / hour</span>
                <span className="font-mono">{formattedRatePerHour} devUSDC.e</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Yield buffer</span>
                <span className="font-mono">{formattedBuffer} devUSDC.e</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last synced</span>
                <span className="font-mono">{lastDripLabel}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
            <div className="text-sm font-semibold">Production strategy</div>
            <p className="text-xs text-muted-foreground">
              The simulator is replaced in production by audited strategy adapters that
              deploy devUSDC.e into real yield sources:
            </p>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>1) Lending or liquid staking on Cronos-native DeFi markets.</li>
              <li>2) RWA cash-flow adapters (invoice financing or tokenized T-bills).</li>
              <li>3) Protocol fees from sponsorship invoices donated into the vault.</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              The UI stays the same: stream → sync → share price increases.
            </p>
          </div>
        </div>

        {bufferValue === 0n && (
          <Alert variant="warning">
            <AlertTitle>Yield buffer empty</AlertTitle>
            <AlertDescription>
              Send devUSDC.e to{" "}
              <a
                className="font-mono underline underline-offset-2"
                href={explorerAddressUrl(streamer)}
                target="_blank"
                rel="noreferrer"
              >
                {formatShortHash(streamer)}
              </a>{" "}
              to fund the streaming yield for demos.
            </AlertDescription>
          </Alert>
        )}

        {syncError && (
          <Alert variant="warning">
            <AlertTitle>Sync failed</AlertTitle>
            <AlertDescription className="break-all whitespace-pre-wrap">
              {syncError}
            </AlertDescription>
          </Alert>
        )}

        {syncHash && (
          <Alert variant="success">
            <AlertTitle>Yield sync submitted</AlertTitle>
            <AlertDescription>
              TX: {formatShortHash(syncHash)}{" "}
              <a
                className="underline underline-offset-2"
                href={explorerTxUrl(syncHash)}
                target="_blank"
                rel="noreferrer"
              >
                View on Cronos Explorer
              </a>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => void handleSync()}
            disabled={!canSync || isSyncing}
            className={cn(isSyncing ? "opacity-80" : "")}
          >
            {isSyncing ? "Syncing..." : "Sync yield on-chain"}
          </Button>
          <Button asChild variant="outline">
            <a
              href={explorerAddressUrl(vault)}
              target="_blank"
              rel="noreferrer"
            >
              View vault on Cronos Explorer
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
