"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useBalance,
  useChainId,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { Address, formatUnits, getAddress, parseUnits } from "viem";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { VaultTxReceiptCard } from "@/components/data-display/VaultTxReceiptCard";
import WalletGateSkeleton from "@/components/feedback/WalletGateSkeleton";
import createVaultTx from "@/app/hooks/useCreateVaultTx";
import getLatestVaultTx from "@/app/hooks/useGetLatestVaultTx";
import getVaultTxByHash from "@/app/hooks/useGetVaultTxByHash";
import type { VaultTxKind } from "@/app/types";
import { cn, formatShortHash } from "@/lib/utils";
import { cronosTestnetContracts } from "@/lib/contracts/addresses";
import vaultAbi from "@/lib/contracts/abi/ClipYieldVault.json";
import { erc20Abi } from "@/lib/web3/erc20";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/web3/cronosConfig";
import Link from "next/link";

type ActionId = "approve" | "deposit" | "withdraw";

type YieldPanelProps = {
  vaultAddress?: Address;
  title?: string;
  description?: string;
  receiptKind?: VaultTxKind;
  receiptCreatorId?: string;
  receiptTitle?: string;
  receiptDescription?: string;
  yieldSourceCopy?: string;
  recordDeposit?: boolean;
  onDeposit?: (payload: {
    txHash: string;
    assetsWei: string;
    wallet: string;
    vault: Address;
  }) => void | Promise<void>;
};

export default function YieldPanel({
  vaultAddress,
  title,
  description,
  receiptKind = "yieldDeposit",
  receiptCreatorId,
  receiptTitle,
  receiptDescription,
  yieldSourceCopy,
  recordDeposit = true,
  onDeposit,
}: YieldPanelProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [vaultAmount, setVaultAmount] = useState("0.05");
  const [pendingAction, setPendingAction] = useState<ActionId | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<{ action: ActionId; hash: string } | null>(null);
  const [lastDepositTxHash, setLastDepositTxHash] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastConfirmedHash, setLastConfirmedHash] = useState<string | null>(null);

  const user = address as Address | undefined;
  const isOnCronos = chainId === cronosTestnetContracts.chainId;
  const isVerified = true;

  const usdce = getAddress(cronosTestnetContracts.usdce as Address);
  const vault = getAddress(
    (vaultAddress ?? cronosTestnetContracts.croigniteVault) as Address,
  );

  const { data: vaultAsset } = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: "asset",
    query: { enabled: isOnCronos },
  });

  const assetToken = useMemo(
    () => (vaultAsset ? getAddress(vaultAsset as Address) : usdce),
    [vaultAsset, usdce],
  );
  const assetLabel = "devUSDC.e";

  useEffect(() => {
    setLastDepositTxHash(null);
    setReceiptError(null);
  }, [user, vault, receiptKind, receiptCreatorId]);

  const { data: vaultSymbol } = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: "symbol",
    query: { enabled: isOnCronos },
  });

  const { data: vaultName } = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: "name",
    query: { enabled: isOnCronos },
  });

  const { data: vaultDecimals } = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: "decimals",
    query: { enabled: isOnCronos },
  });

  const { data: assetDecimals } = useReadContract({
    address: assetToken,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: isOnCronos },
  });

  const { data: totalAssets, refetch: refetchTotalAssets } = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: "totalAssets",
    query: { enabled: isOnCronos },
  });

  const { data: totalSupply, refetch: refetchTotalSupply } = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: "totalSupply",
    query: { enabled: isOnCronos },
  });

  const shareDecimalsValue = typeof vaultDecimals === "number" ? vaultDecimals : 18;
  const shareUnit = useMemo(
    () => 10n ** BigInt(shareDecimalsValue),
    [shareDecimalsValue],
  );

  const { data: assetsPerShare } = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: "convertToAssets",
    args: [shareUnit],
    query: { enabled: isOnCronos },
  });

  const { data: shareBalance, refetch: refetchShareBalance } = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: "balanceOf",
    args: user ? [user] : undefined,
    query: { enabled: Boolean(user) && isOnCronos },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: assetToken,
    abi: erc20Abi,
    functionName: "allowance",
    args: user ? [user, vault] : undefined,
    query: { enabled: Boolean(user) && isOnCronos },
  });

  const parsedVaultAmount = useMemo(() => {
    const decimals = typeof assetDecimals === "number" ? assetDecimals : 18;
    if (!vaultAmount) return 0n;
    try {
      return parseUnits(vaultAmount, decimals);
    } catch {
      return 0n;
    }
  }, [assetDecimals, vaultAmount]);

  const { data: previewShares, refetch: refetchPreviewShares } = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: "convertToShares",
    args: parsedVaultAmount > 0n ? [parsedVaultAmount] : undefined,
    query: { enabled: parsedVaultAmount > 0n && isOnCronos },
  });

  const {
    data: previewAssetsFromShares,
    refetch: refetchPreviewAssetsFromShares,
  } = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: "convertToAssets",
    args: shareBalance ? [shareBalance] : undefined,
    query: { enabled: Boolean(shareBalance) && isOnCronos },
  });

  const { data: nativeBalance, refetch: refetchNativeBalance } = useBalance({
    address: user,
    chainId: cronosTestnetContracts.chainId,
    query: { enabled: Boolean(user) && isOnCronos, refetchInterval: 10_000 },
  });

  const {
    data: assetBalanceRaw,
    isLoading: isAssetBalanceLoading,
    isError: isAssetBalanceError,
    refetch: refetchAssetBalance,
  } = useReadContract({
    address: assetToken,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: user ? [user] : undefined,
    chainId: cronosTestnetContracts.chainId,
    query: { enabled: Boolean(user), refetchInterval: 10_000 },
  });

  const assetDecimalsValue =
    typeof assetDecimals === "number" ? assetDecimals : 18;
  const allowanceValue = typeof allowance === "bigint" ? allowance : 0n;
  const assetBalanceValue =
    typeof assetBalanceRaw === "bigint" ? assetBalanceRaw : 0n;
  const shareBalanceValue = typeof shareBalance === "bigint" ? shareBalance : 0n;
  const maxWithdrawValue =
    typeof previewAssetsFromShares === "bigint" ? previewAssetsFromShares : 0n;

  const needsApproval =
    parsedVaultAmount > 0n && allowanceValue < parsedVaultAmount;
  const hasAssetForVault = assetBalanceValue >= parsedVaultAmount;
  const canApprove =
    isConnected &&
    isOnCronos &&
    parsedVaultAmount > 0n &&
    hasAssetForVault &&
    needsApproval;
  const canDeposit =
    isConnected &&
    isOnCronos &&
    parsedVaultAmount > 0n &&
    isVerified &&
    hasAssetForVault &&
    !needsApproval;
  const canWithdraw =
    isConnected &&
    isOnCronos &&
    parsedVaultAmount > 0n &&
    isVerified &&
    shareBalanceValue > 0n &&
    maxWithdrawValue >= parsedVaultAmount;

  const walletReady = isConnected && isOnCronos;
  const totalAssetsValue = typeof totalAssets === "bigint" ? totalAssets : null;
  const totalSupplyValue = typeof totalSupply === "bigint" ? totalSupply : null;
  const assetsPerShareValue =
    typeof assetsPerShare === "bigint" ? assetsPerShare : null;
  const previewSharesValue =
    typeof previewShares === "bigint" ? previewShares : null;
  const vaultNameLabel =
    typeof vaultName === "string" && vaultName ? vaultName : "CroIgnite Vault";
  const vaultSymbolLabel =
    typeof vaultSymbol === "string" && vaultSymbol ? vaultSymbol : "cySHARE";

  const formattedTotalAssets =
    totalAssetsValue !== null
      ? formatUnits(totalAssetsValue, assetDecimalsValue)
      : "0";
  const formattedTotalSupply =
    totalSupplyValue !== null
      ? formatUnits(totalSupplyValue, shareDecimalsValue)
      : "0";
  const formattedSharePrice =
    assetsPerShareValue !== null
      ? formatUnits(assetsPerShareValue, assetDecimalsValue)
      : "—";
  const formattedShareBalance = walletReady
    ? formatUnits(shareBalanceValue, shareDecimalsValue)
    : "—";
  const formattedVaultClaim = walletReady
    ? formatUnits(maxWithdrawValue, assetDecimalsValue)
    : "—";
  const formattedPreviewShares =
    previewSharesValue !== null
      ? formatUnits(previewSharesValue, shareDecimalsValue)
      : "0";
  const formattedNativeBalance = walletReady ? nativeBalance?.formatted ?? "0" : "—";
  const formattedAssetBalance = !walletReady
    ? "—"
    : isAssetBalanceLoading
      ? "Loading..."
      : isAssetBalanceError
        ? "Unavailable"
        : formatUnits(assetBalanceValue, assetDecimalsValue);
  const yieldSourceLabel =
    yieldSourceCopy ??
    "Sponsorship invoice fees are donated into the vault, increasing share value.";

  const {
    data: vaultReceipt,
    isLoading: receiptLoading,
    error: receiptLoadError,
    refetch: refetchVaultReceipt,
  } = useQuery({
    queryKey: [
      "vault-receipt",
      user,
      receiptKind,
      receiptCreatorId ?? null,
      lastDepositTxHash ?? null,
    ],
    queryFn: async () => {
      if (!user) return null;
      if (lastDepositTxHash) {
        const receipt = await getVaultTxByHash(lastDepositTxHash);
        if (receipt) return receipt;
      }
      return await getLatestVaultTx({
        wallet: user,
        kind: receiptKind,
        creatorId: receiptCreatorId,
      });
    },
    enabled: Boolean(user && isOnCronos),
    staleTime: 10_000,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && status !== "confirmed" ? 8_000 : false;
    },
    retry: 1,
  });

  const {
    isSuccess: isTxConfirmed,
    isLoading: isTxConfirming,
  } = useWaitForTransactionReceipt({
    chainId: cronosTestnetContracts.chainId,
    hash: lastTx?.hash as `0x${string}` | undefined,
    query: { enabled: Boolean(lastTx?.hash) },
  });

  const handleRefresh = useCallback(async () => {
    if (!walletReady) return;
    setIsRefreshing(true);
    const tasks: Promise<unknown>[] = [
      refetchNativeBalance(),
      refetchAssetBalance(),
      refetchAllowance(),
      refetchShareBalance(),
      refetchTotalAssets(),
      refetchTotalSupply(),
      refetchVaultReceipt(),
    ];
    if (parsedVaultAmount > 0n) {
      tasks.push(refetchPreviewShares());
    }
    if (shareBalanceValue > 0n) {
      tasks.push(refetchPreviewAssetsFromShares());
    }
    await Promise.allSettled(tasks);
    setIsRefreshing(false);
  }, [
    parsedVaultAmount,
    refetchAllowance,
    refetchNativeBalance,
    refetchPreviewAssetsFromShares,
    refetchPreviewShares,
    refetchShareBalance,
    refetchTotalAssets,
    refetchTotalSupply,
    refetchVaultReceipt,
    refetchAssetBalance,
    shareBalanceValue,
    walletReady,
  ]);

  useEffect(() => {
    if (!lastTx?.hash || !isTxConfirmed) return;
    if (lastConfirmedHash === lastTx.hash) return;
    setLastConfirmedHash(lastTx.hash);
    void handleRefresh();
  }, [handleRefresh, isTxConfirmed, lastConfirmedHash, lastTx?.hash]);

  type WriteRequest = Omit<Parameters<typeof writeContractAsync>[0], "value"> & {
    value?: bigint;
  };

  const runTx = async (action: ActionId, request: WriteRequest) => {
    setPendingAction(action);
    setActionError(null);
    try {
      const hash = await writeContractAsync(
        request as Parameters<typeof writeContractAsync>[0],
      );
      setLastTx({ action, hash });
      return hash;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Transaction failed.");
      return null;
    } finally {
      setPendingAction(null);
    }
  };

  const handleSwitchChain = async () => {
    if (!switchChainAsync) return;
    await switchChainAsync({ chainId: cronosTestnetContracts.chainId });
  };

  const handleDeposit = async () => {
    if (!user) return;
    const txHash = await runTx("deposit", {
      address: vault,
      abi: vaultAbi,
      functionName: "deposit",
      args: [parsedVaultAmount, user as Address],
    });

    if (!txHash) return;

    setLastDepositTxHash(txHash);
    setReceiptError(null);

    if (recordDeposit) {
      try {
        await createVaultTx({
          kind: receiptKind,
          wallet: user,
          creatorId: receiptCreatorId,
          assetsWei: parsedVaultAmount.toString(),
          txHash,
          chainId: cronosTestnetContracts.chainId,
        });
      } catch (error) {
        console.error("Failed to record vault deposit", error);
        setReceiptError(
          error instanceof Error
            ? error.message
            : "Failed to record vault receipt.",
        );
      }
    }

    if (onDeposit) {
      await onDeposit({
        txHash,
        assetsWei: parsedVaultAmount.toString(),
        wallet: user,
        vault,
      });
    }
  };

  const showWalletGate = !isConnected;

  return (
    <div className="space-y-6">
      {showWalletGate ? (
        <WalletGateSkeleton cards={3} />
      ) : (
        <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{title ?? "CroIgnite Vault"}</h1>
        <p className="text-sm text-muted-foreground">
          {description ??
            "ERC-4626 vault on Cronos Testnet powered by sponsorship inflows and simulated yield."}
        </p>
      </div>

      {isConnected && !isOnCronos && (
        <Alert variant="warning">
          <AlertTitle>Wrong network</AlertTitle>
          <AlertDescription>Switch to Cronos Testnet to continue.</AlertDescription>
          <div className="mt-3">
            <Button onClick={handleSwitchChain}>Switch network</Button>
          </div>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
          <CardTitle>Vault overview</CardTitle>
          <CardDescription>{vaultNameLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">TVL ({assetLabel})</span>
              <span>{formattedTotalAssets}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Share supply (cySHARE)</span>
              <span>
                {formattedTotalSupply} {vaultSymbolLabel}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Share price</span>
              <span>
                {formattedSharePrice} {assetLabel}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Network</span>
              <span>Cronos Testnet</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Wallet status</CardTitle>
              <CardDescription>
                {user ? formatShortHash(user) : "Not connected"}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleRefresh()}
              disabled={!walletReady || isRefreshing}
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  isRefreshing || isTxConfirming ? "animate-spin" : "",
                )}
              />
              {isRefreshing ? "Refreshing" : "Refresh"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">tCRO balance</span>
              <span>{formattedNativeBalance}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Asset balance ({assetLabel})
              </span>
              <span>{formattedAssetBalance}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Asset contract</span>
              <Link
                className="font-mono text-xs underline underline-offset-2"
                href={explorerAddressUrl(assetToken)}
                target="_blank"
                rel="noreferrer"
              >
                {formatShortHash(assetToken)}
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Vault shares (cySHARE)</span>
              <span>
                {formattedShareBalance} {vaultSymbolLabel}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Vault claim ({assetLabel})
              </span>
              <span>{formattedVaultClaim}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How the vault works</CardTitle>
          <CardDescription>
            A quick guide to the terms and mechanics on this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <p className="font-semibold">TVL ({assetLabel})</p>
              <p className="text-xs text-muted-foreground">
                Total assets locked in the vault. Deposits increase TVL and yield grows it over time.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <p className="font-semibold">cySHARE</p>
              <p className="text-xs text-muted-foreground">
                Vault share tokens minted to depositors. Your cySHARE balance tracks your claim on assets + yield.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <p className="font-semibold">Share supply</p>
              <p className="text-xs text-muted-foreground">
                The total cySHARE outstanding across all depositors in the vault.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <p className="font-semibold">Yield source</p>
              <p className="text-xs text-muted-foreground">
                {yieldSourceLabel}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="font-semibold">Why approve devUSDC.e?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Vaults pull ERC-20 assets via allowance. Approve devUSDC.e once to enable
              deposits and withdrawals.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Action center</CardTitle>
            <CardDescription>
              Approve devUSDC.e and move funds in or out of the vault.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleRefresh()}
            disabled={!walletReady || isRefreshing}
          >
            <RefreshCw
              className={cn(
                "h-4 w-4",
                isRefreshing || isTxConfirming ? "animate-spin" : "",
              )}
            />
            {isRefreshing ? "Refreshing" : "Refresh data"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="vault-amount">
                Vault amount ({assetLabel})
              </label>
              <p className="text-xs text-muted-foreground">
                Used for approval, deposit, and withdraw actions.
              </p>
            </div>
            <Input
              id="vault-amount"
              inputMode="decimal"
              value={vaultAmount}
              onChange={(event) => setVaultAmount(event.target.value)}
              placeholder="0.05"
              className="mt-3"
            />
            <div className="mt-2 text-xs text-muted-foreground">
              Estimated shares: {formattedPreviewShares} {vaultSymbolLabel}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Approve + vault actions</h3>
              <p className="text-xs text-muted-foreground">
                Approve devUSDC.e once, then deposit into or withdraw from the vault.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Button
                variant="outline"
                onClick={() =>
                  runTx("approve", {
                    address: usdce,
                    abi: erc20Abi,
                    functionName: "approve",
                    args: [vault, parsedVaultAmount],
                  })
                }
                disabled={!canApprove || pendingAction === "approve"}
              >
                {pendingAction === "approve" ? "Approving..." : "Approve vault"}
              </Button>
              <Button
                onClick={handleDeposit}
                disabled={!canDeposit || pendingAction === "deposit"}
              >
                {pendingAction === "deposit" ? "Depositing..." : "Deposit"}
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  runTx("withdraw", {
                    address: vault,
                    abi: vaultAbi,
                    functionName: "withdraw",
                    args: [parsedVaultAmount, user as Address, user as Address],
                  })
                }
                disabled={!canWithdraw || pendingAction === "withdraw"}
              >
                {pendingAction === "withdraw" ? "Withdrawing..." : "Withdraw"}
              </Button>
            </div>
          </div>

          {actionError && (
            <Alert variant="warning">
              <AlertTitle>Transaction failed</AlertTitle>
              <AlertDescription className="break-all whitespace-pre-wrap">
                {actionError}
              </AlertDescription>
            </Alert>
          )}

          {lastTx && (
            <Alert variant="success">
              <AlertTitle>Transaction submitted</AlertTitle>
              <AlertDescription>
                {lastTx.action.toUpperCase()} TX: {formatShortHash(lastTx.hash)}{" "}
                <a
                  className="underline underline-offset-2"
                  href={explorerTxUrl(lastTx.hash)}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Cronos Explorer
                </a>
              </AlertDescription>
            </Alert>
          )}

          {receiptError && (
            <Alert variant="warning">
              <AlertTitle>Receipt logging failed</AlertTitle>
              <AlertDescription className="break-words whitespace-pre-wrap">
                {receiptError}
              </AlertDescription>
            </Alert>
          )}

          {isConnected && isOnCronos && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Latest receipt</h3>
                <p className="text-xs text-muted-foreground">
                  Every vault transaction is recorded in Convex and confirmed on-chain.
                </p>
              </div>

              {receiptLoadError && (
                <Alert variant="warning">
                  <AlertTitle>Unable to load receipts</AlertTitle>
                  <AlertDescription>
                    {receiptLoadError instanceof Error
                      ? receiptLoadError.message
                      : "Failed to load vault receipts."}
                  </AlertDescription>
                </Alert>
              )}

              {!receiptLoadError && receiptLoading && (
                <Alert variant="info">
                  <AlertTitle>Loading receipts</AlertTitle>
                  <AlertDescription>
                    Checking the latest vault transaction status.
                  </AlertDescription>
                </Alert>
              )}

              {!receiptLoadError && !receiptLoading && !vaultReceipt && (
                <Alert variant="info">
                  <AlertTitle>No receipts yet</AlertTitle>
                  <AlertDescription>
                    Once you deposit, we&apos;ll surface the on-chain receipt here.
                  </AlertDescription>
                </Alert>
              )}

              {vaultReceipt && (
                <VaultTxReceiptCard
                  receipt={vaultReceipt}
                  title={receiptTitle}
                  description={receiptDescription}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
