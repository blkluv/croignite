"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import {
  useAccount,
  useBalance,
  useChainId,
  usePublicClient,
  useReadContract,
  useSignTypedData,
  useSignMessage,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import {
  Address,
  decodeEventLog,
  erc20Abi,
  formatUnits,
  getAddress,
  isAddress,
  keccak256,
  parseUnits,
  toHex,
} from "viem";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatShortHash } from "@/lib/utils";
import WalletGateSkeleton from "@/components/feedback/WalletGateSkeleton";
import { cronosTestnetContracts } from "@/lib/contracts/addresses";
import sponsorHubAbi from "@/lib/contracts/abi/ClipYieldSponsorHub.json";
import { explorerTxUrl } from "@/lib/web3/cronosConfig";
import {
  createX402PaymentHeader,
  type X402PaymentRequirements,
} from "@/lib/x402/paymentHeader";
import createSponsorCampaign from "@/app/hooks/useCreateSponsorCampaign";
import createCampaignReceipt from "@/app/hooks/useCreateCampaignReceipt";
import createVaultTx from "@/app/hooks/useCreateVaultTx";
import type { SponsorCampaign } from "@/app/types";
import { buildSponsorPackMessage } from "@/features/sponsor/message";
import { isSponsorCampaignActive } from "@/features/sponsor/utils";
import { hashCampaignTerms, type CampaignTerms } from "@/features/sponsor/services/campaignTerms";

type ActionId = "approve" | "sponsor" | "x402" | "perks";
type TxStatus = "idle" | "pending" | "confirmed" | "failed";
type TxState = {
  status: TxStatus;
  hash?: `0x${string}`;
  error?: string;
};

type SponsorPanelProps = {
  postId: string;
  creatorId: string;
  vaultAddress: Address;
  currentCampaign: SponsorCampaign | null;
  onCampaignCreated?: (campaign: SponsorCampaign) => void;
};

const toIsoDate = (value: string) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

export default function SponsorPanel({
  postId,
  creatorId,
  vaultAddress,
  currentCampaign,
  onCampaignCreated,
}: SponsorPanelProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId: cronosTestnetContracts.chainId });
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { signTypedDataAsync } = useSignTypedData();
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();

  const [amount, setAmount] = useState("0.25");
  const [sponsorName, setSponsorName] = useState("");
  const [objective, setObjective] = useState("");
  const [deliverablesText, setDeliverablesText] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return nextWeek.toISOString().slice(0, 10);
  });
  const [pendingAction, setPendingAction] = useState<ActionId | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [approveTx, setApproveTx] = useState<TxState>({ status: "idle" });
  const [sponsorTx, setSponsorTx] = useState<TxState>({ status: "idle" });
  const [x402Tx, setX402Tx] = useState<TxState>({ status: "idle" });
  const [perkMessage, setPerkMessage] = useState<string | null>(null);
  const [perkError, setPerkError] = useState<string | null>(null);
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [receiptDetails, setReceiptDetails] = useState<{
    campaignId: string;
    receiptTokenId: string;
    protocolFeeWei: string;
  } | null>(null);

  const user = address as Address | undefined;
  const isOnCronos = chainId === cronosTestnetContracts.chainId;

  const usdce = getAddress(cronosTestnetContracts.usdce as Address);
  const sponsorHub = getAddress(cronosTestnetContracts.sponsorHub as Address);
  const invoiceReceipts = getAddress(
    cronosTestnetContracts.invoiceReceipts as Address,
  );
  const yieldVault = getAddress(
    cronosTestnetContracts.croigniteVault as Address,
  );
  const vault = useMemo(() => getAddress(vaultAddress), [vaultAddress]);

  const postIdHash = useMemo(() => {
    return keccak256(toHex(`post:${postId}`));
  }, [postId]);

  const deliverables = useMemo(
    () =>
      deliverablesText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    [deliverablesText],
  );

  const previewTerms = useMemo(() => {
    const sponsorTrimmed = sponsorName.trim();
    const objectiveTrimmed = objective.trim();
    const startIso = toIsoDate(startDate);
    const endIso = toIsoDate(endDate);

    if (
      !sponsorTrimmed ||
      !objectiveTrimmed ||
      deliverables.length === 0 ||
      !startIso ||
      !endIso
    ) {
      return null;
    }

    return {
      sponsorName: sponsorTrimmed,
      objective: objectiveTrimmed,
      deliverables,
      startDateIso: startIso,
      endDateIso: endIso,
      disclosure: "Sponsored",
    } satisfies CampaignTerms;
  }, [deliverables, endDate, objective, sponsorName, startDate]);

  const previewTermsHash = useMemo(
    () => (previewTerms ? hashCampaignTerms(previewTerms) : null),
    [previewTerms],
  );

  const { data: assetDecimals } = useReadContract({
    address: usdce,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: isOnCronos },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdce,
    abi: erc20Abi,
    functionName: "allowance",
    args: user ? [user, sponsorHub] : undefined,
    query: { enabled: Boolean(user) && isOnCronos },
  });

  const { data: protocolFeeBps } = useReadContract({
    address: sponsorHub,
    abi: sponsorHubAbi,
    functionName: "protocolFeeBps",
    query: { enabled: isOnCronos },
  });

  const { data: vaultSymbol } = useReadContract({
    address: vault,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: isOnCronos },
  });

  const { data: vaultDecimals } = useReadContract({
    address: vault,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: isOnCronos },
  });

  const { data: shareBalance, refetch: refetchShareBalance } = useReadContract({
    address: vault,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: user ? [user] : undefined,
    query: { enabled: Boolean(user) && isOnCronos },
  });

  const { data: nativeBalance, refetch: refetchNativeBalance } = useBalance({
    address: user,
    query: { enabled: Boolean(user) && isOnCronos },
  });

  const { data: assetBalance, refetch: refetchAssetBalance } = useBalance({
    address: user,
    token: usdce,
    query: { enabled: Boolean(user) && isOnCronos },
  });

  const assetDecimalsValue =
    typeof assetDecimals === "number" ? assetDecimals : 18;
  const vaultDecimalsValue = typeof vaultDecimals === "number" ? vaultDecimals : 18;
  const parsedAmount = useMemo(() => {
    if (!amount) return 0n;
    try {
      return parseUnits(amount, assetDecimalsValue);
    } catch {
      return 0n;
    }
  }, [amount, assetDecimalsValue]);

  const allowanceValue = typeof allowance === "bigint" ? allowance : 0n;
  const shareBalanceValue = typeof shareBalance === "bigint" ? shareBalance : 0n;
  const protocolFeeBpsValue =
    typeof protocolFeeBps === "bigint" ? Number(protocolFeeBps) : null;
  const protocolFeeWei =
    parsedAmount > 0n && protocolFeeBpsValue !== null
      ? (parsedAmount * BigInt(protocolFeeBpsValue)) / 10_000n
      : null;
  const netAmountWei = protocolFeeWei !== null ? parsedAmount - protocolFeeWei : null;
  const formattedAmount =
    parsedAmount > 0n ? formatUnits(parsedAmount, assetDecimalsValue) : "—";
  const formattedProtocolFee =
    protocolFeeWei !== null ? formatUnits(protocolFeeWei, assetDecimalsValue) : "—";
  const formattedNetAmount =
    netAmountWei !== null ? formatUnits(netAmountWei, assetDecimalsValue) : "—";
  const protocolFeeLabel =
    protocolFeeBpsValue === null
      ? "—"
      : `${(protocolFeeBpsValue / 100).toFixed(
          protocolFeeBpsValue % 100 === 0 ? 0 : 2,
        )}%`;

  const needsApproval = allowanceValue < parsedAmount;
  const canTransact = isConnected && isOnCronos && parsedAmount > 0n;

  const sponsorActive = isSponsorCampaignActive(currentCampaign);
  const hasBoosterShares = shareBalanceValue > 0n;
  const perksEligible = sponsorActive && hasBoosterShares;
  const termsReady = Boolean(previewTerms);

  useEffect(() => {
    setApproveTx({ status: "idle" });
    setSponsorTx({ status: "idle" });
    setX402Tx({ status: "idle" });
    setActionError(null);
    setPerkMessage(null);
    setPerkError(null);
    setReceiptDetails(null);
  }, [postId, user]);

  useEffect(() => {
    let isActive = true;

    if (
      !publicClient ||
      !user ||
      !isOnCronos ||
      parsedAmount <= 0n ||
      needsApproval ||
      !termsReady ||
      !previewTermsHash ||
      !isAddress(creatorId)
    ) {
      setEstimatedFee(null);
      return;
    }

    (async () => {
      try {
        const gas = await publicClient.estimateContractGas({
          address: sponsorHub,
          abi: sponsorHubAbi,
          functionName: "sponsorClip",
          args: [
            getAddress(creatorId),
            vault,
            postIdHash,
            previewTermsHash,
            parsedAmount,
          ],
          account: user,
        });
        const gasPrice = await publicClient.getGasPrice();
        const fee = gas * gasPrice;
        if (isActive) {
          setEstimatedFee(formatUnits(fee, 18));
        }
      } catch {
        if (isActive) {
          setEstimatedFee(null);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [
    creatorId,
    isOnCronos,
    needsApproval,
    parsedAmount,
    postIdHash,
    previewTermsHash,
    publicClient,
    sponsorHub,
    termsReady,
    user,
    vault,
  ]);

  const formattedShares = shareBalanceValue
    ? formatUnits(shareBalanceValue, vaultDecimalsValue)
    : "0";

  if (!isConnected) {
    return <WalletGateSkeleton cards={2} />;
  }

  type WriteRequest = Omit<Parameters<typeof writeContractAsync>[0], "value"> & {
    value?: bigint;
  };

  const runTx = async (
    action: ActionId,
    request: WriteRequest,
    setTxState?: (next: TxState) => void,
  ) => {
    setPendingAction(action);
    setActionError(null);
    setTxState?.({ status: "pending" });
    try {
      const hash = await writeContractAsync(
        request as Parameters<typeof writeContractAsync>[0],
      );
      setTxState?.({ status: "pending", hash });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      setTxState?.({ status: "confirmed", hash });
      return hash;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Transaction failed.";
      setActionError(message);
      setTxState?.({ status: "failed", error: message });
      return null;
    } finally {
      setPendingAction(null);
    }
  };

  const handleSwitchChain = async () => {
    if (!switchChainAsync) return;
    await switchChainAsync({ chainId: cronosTestnetContracts.chainId });
  };

  const buildTerms = (): CampaignTerms | null => {
    const sponsorTrimmed = sponsorName.trim();
    if (!sponsorTrimmed) {
      setActionError("Sponsor name is required.");
      return null;
    }

    const objectiveTrimmed = objective.trim();
    if (!objectiveTrimmed) {
      setActionError("Campaign objective is required.");
      return null;
    }

    if (deliverables.length === 0) {
      setActionError("Add at least one deliverable.");
      return null;
    }

    const startIso = toIsoDate(startDate);
    const endIso = toIsoDate(endDate);

    if (!startIso || !endIso) {
      setActionError("Provide a valid start and end date.");
      return null;
    }

    if (new Date(startIso).getTime() > new Date(endIso).getTime()) {
      setActionError("End date must be on or after the start date.");
      return null;
    }

    return {
      sponsorName: sponsorTrimmed,
      objective: objectiveTrimmed,
      deliverables,
      startDateIso: startIso,
      endDateIso: endIso,
      disclosure: "Sponsored",
    };
  };

  const handleSponsor = async () => {
    if (!user) {
      setActionError("Wallet not connected.");
      return;
    }

    setActionError(null);
    setReceiptDetails(null);
    setSponsorTx({ status: "idle" });

    if (parsedAmount <= 0n) {
      setActionError("Enter a sponsor amount.");
      return;
    }

    if (!isAddress(creatorId)) {
      setActionError("Creator wallet is invalid.");
      return;
    }

    const terms = buildTerms();
    if (!terms) return;

    const termsHash = hashCampaignTerms(terms);

    const txHash = await runTx(
      "sponsor",
      {
        address: sponsorHub,
        abi: sponsorHubAbi,
        functionName: "sponsorClip",
        args: [getAddress(creatorId), vault, postIdHash, termsHash, parsedAmount],
      },
      setSponsorTx,
    );

    if (!txHash) return;

    if (!publicClient) {
      setActionError("Missing chain client for receipt parsing.");
      setSponsorTx({ status: "failed", hash: txHash });
      return;
    }

    let onchainReceipt: {
      campaignId: string;
      receiptTokenId: string;
      protocolFeeWei: string;
    } | null = null;

    try {
      const receipt = await publicClient.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });

      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== sponsorHub.toLowerCase()) continue;
        try {
          const decoded = decodeEventLog({
            abi: sponsorHubAbi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName !== "ClipSponsored") continue;
          const args = decoded.args as unknown as {
            campaignId: `0x${string}`;
            receiptTokenId: bigint;
            protocolFee: bigint;
          };
          onchainReceipt = {
            campaignId: args.campaignId,
            receiptTokenId: args.receiptTokenId.toString(),
            protocolFeeWei: args.protocolFee.toString(),
          };
          break;
        } catch {
          continue;
        }
      }
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to read on-chain receipt logs.",
      );
      setSponsorTx({ status: "failed", hash: txHash });
      return;
    }

    if (!onchainReceipt) {
      setActionError("Unable to locate the invoice receipt event on-chain.");
      setSponsorTx({ status: "failed", hash: txHash });
      return;
    }

    setReceiptDetails(onchainReceipt);

    const campaignInput = {
      postId,
      clipHash: postIdHash,
      creatorId,
      vaultAddress: vault,
      sponsorAddress: user as string,
      assets: parsedAmount.toString(),
      protocolFeeWei: onchainReceipt.protocolFeeWei,
      campaignId: onchainReceipt.campaignId,
      receiptTokenId: onchainReceipt.receiptTokenId,
      invoiceReceiptAddress: invoiceReceipts,
      txHash,
    };

    let receiptId: string | null = null;

    try {
      await createSponsorCampaign(campaignInput);

      receiptId = (await createCampaignReceipt({
        postId,
        clipHash: postIdHash,
        creatorId: getAddress(creatorId),
        sponsorAddress: user,
        boostVault: vault,
        assetsWei: parsedAmount.toString(),
        protocolFeeWei: onchainReceipt.protocolFeeWei,
        campaignId: onchainReceipt.campaignId,
        receiptTokenId: onchainReceipt.receiptTokenId,
        invoiceReceiptAddress: invoiceReceipts,
        termsHash,
        txHash,
        sponsorName: terms.sponsorName,
        objective: terms.objective,
        deliverables: terms.deliverables,
        startDateIso: terms.startDateIso,
        endDateIso: terms.endDateIso,
        disclosure: terms.disclosure,
      })) as string | null;
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to record sponsor campaign.",
      );
      return;
    }

    try {
      await createVaultTx({
        kind: "sponsorDeposit",
        wallet: user,
        creatorId: getAddress(creatorId),
        postId,
        assetsWei: parsedAmount.toString(),
        txHash,
        chainId: cronosTestnetContracts.chainId,
      });
    } catch (error) {
      console.error("Failed to record sponsor vault tx", error);
    }

    const nextCampaign: SponsorCampaign = {
      ...campaignInput,
      createdAt: Date.now(),
    };
    onCampaignCreated?.(nextCampaign);

    await Promise.all([
      refetchShareBalance?.(),
      refetchAllowance?.(),
      refetchAssetBalance?.(),
      refetchNativeBalance?.(),
    ]);

    if (receiptId) {
      router.push(`/campaign/${receiptId}`);
    }
  };

  const handleSponsorX402 = async () => {
    if (!user) {
      setActionError("Wallet not connected.");
      return;
    }

    setActionError(null);
    setX402Tx({ status: "idle" });

    if (parsedAmount <= 0n) {
      setActionError("Enter a sponsor amount.");
      return;
    }

    if (!isOnCronos) {
      setActionError("Switch to Cronos Testnet to continue.");
      return;
    }

    if (!isAddress(creatorId)) {
      setActionError("Creator wallet is invalid.");
      return;
    }

    const terms = buildTerms();
    if (!terms) return;

    setPendingAction("x402");
    setX402Tx({ status: "pending" });

    const body = {
      postId,
      amount: parsedAmount.toString(),
      creatorId: getAddress(creatorId),
      sponsorName: terms.sponsorName,
      objective: terms.objective,
      deliverables: terms.deliverables,
      startDateIso: terms.startDateIso,
      endDateIso: terms.endDateIso,
      disclosure: terms.disclosure,
    };

    try {
      let response = await fetch("/api/x402/sponsor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      let payload = await response.json().catch(() => null);

      if (response.status === 402) {
        const requirements = payload?.paymentRequirements as
          | X402PaymentRequirements
          | undefined;
        if (!requirements) {
          throw new Error("Missing payment requirements.");
        }

        const xPayment = await createX402PaymentHeader({
          from: user,
          requirements,
          signTypedData: (typedData) =>
            signTypedDataAsync(typedData as any),
        });

        response = await fetch("/api/x402/sponsor", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PAYMENT": xPayment,
          },
          body: JSON.stringify(body),
        });

        payload = await response.json().catch(() => null);
      }

      if (!response.ok) {
        const reason = payload?.reason ?? payload?.error ?? "x402 sponsor failed.";
        throw new Error(reason);
      }

      const txHash = payload?.payment?.txHash as `0x${string}` | undefined;
      setX402Tx({ status: "confirmed", hash: txHash });

      if (payload?.campaignId) {
        router.push(`/campaign/${payload.campaignId}`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "x402 sponsor failed.";
      setActionError(message);
      setX402Tx({ status: "failed", error: message });
    } finally {
      setPendingAction(null);
    }
  };

  const handleApprove = async () => {
    if (!canTransact || !needsApproval) return;
    setActionError(null);
    const txHash = await runTx(
      "approve",
      {
        address: usdce,
        abi: erc20Abi,
        functionName: "approve",
        args: [sponsorHub, parsedAmount],
      },
      setApproveTx,
    );

    if (txHash) {
      await Promise.all([refetchAllowance?.(), refetchAssetBalance?.()]);
    }
  };

  const handleDownloadPack = async () => {
    if (!user) {
      setPerkError("Wallet not connected.");
      return;
    }

    if (!isOnCronos) {
      setPerkError("Switch to Cronos Testnet to continue.");
      return;
    }

    setPendingAction("perks");
    setPerkMessage(null);
    setPerkError(null);

    try {
      const message = buildSponsorPackMessage(postId);
      const signature = await signMessageAsync({ message });

      let res = await fetch("/api/sponsor/remix-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, address: user, signature }),
      });

      let payload = await res.json().catch(() => null);

      if (res.status === 402) {
        const requirements = payload?.paymentRequirements as
          | X402PaymentRequirements
          | undefined;
        if (!requirements) {
          throw new Error("Missing payment requirements.");
        }

        const xPayment = await createX402PaymentHeader({
          from: user,
          requirements,
          signTypedData: (typedData) => signTypedDataAsync(typedData as any),
        });

        res = await fetch("/api/sponsor/remix-pack", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PAYMENT": xPayment,
          },
          body: JSON.stringify({ postId, address: user, signature }),
        });

        payload = await res.json().catch(() => null);
      }

      if (!res.ok) {
        const errorText =
          typeof payload === "string" ? payload : JSON.stringify(payload);
        throw new Error(errorText || "Failed to unlock sponsor pack.");
      }

      const blob = new Blob([JSON.stringify(payload.pack, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "croignite-sponsor-pack.json";
      anchor.click();
      URL.revokeObjectURL(url);

      setPerkMessage("Sponsor pack downloaded.");
    } catch (error) {
      setPerkError(error instanceof Error ? error.message : "Perk unlock failed.");
    } finally {
      setPendingAction(null);
    }
  };

  const approvalStatus: TxStatus = needsApproval ? approveTx.status : "confirmed";
  const approvalLabel =
    approvalStatus === "pending"
      ? "Pending"
      : approvalStatus === "failed"
        ? "Failed"
        : needsApproval
          ? "Not approved"
          : "Approved";
  const sponsorLabel =
    sponsorTx.status === "pending"
      ? "Pending"
      : sponsorTx.status === "failed"
        ? "Failed"
        : sponsorTx.status === "confirmed"
          ? "Confirmed"
          : "Not started";
  const x402Label =
    x402Tx.status === "pending"
      ? "Pending"
      : x402Tx.status === "failed"
        ? "Failed"
        : x402Tx.status === "confirmed"
          ? "Confirmed"
          : "Not started";

  return (
    <div className="space-y-6">
      {isConnected && !isOnCronos && (
        <Alert variant="warning">
          <AlertTitle>Wrong network</AlertTitle>
          <AlertDescription>Switch to Cronos Testnet to continue.</AlertDescription>
          <div className="mt-3">
            <Button onClick={handleSwitchChain}>Switch network</Button>
          </div>
        </Alert>
      )}

      <Card id="x402-panel">
        <CardHeader>
          <CardTitle>Sponsor details</CardTitle>
          <CardDescription>
            Protocol fees fund the yield vault while net devUSDC.e mints creator boost shares.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Vault</span>
            <span className="font-mono text-xs">{formatShortHash(vault)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Yield vault</span>
            <span className="font-mono text-xs">{formatShortHash(yieldVault)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Sponsor hub</span>
            <span className="font-mono text-xs">{formatShortHash(sponsorHub)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Invoice receipts</span>
            <span className="font-mono text-xs">
              {formatShortHash(invoiceReceipts)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Wallet</span>
            <span className="font-mono text-xs">
              {user ? formatShortHash(user) : "Not connected"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wallet balances</CardTitle>
          <CardDescription>Check your balances before sponsoring.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">tCRO balance</span>
            <span>{nativeBalance?.formatted ?? "0"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">devUSDC.e balance</span>
            <span>{assetBalance?.formatted ?? "0"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Boost shares</span>
            <span>
              {formattedShares} {vaultSymbol || "cBOOST"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campaign terms</CardTitle>
          <CardDescription>
            These terms are hashed on-chain to create an auditable sponsorship receipt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sponsorName">Sponsor name</Label>
            <Input
              id="sponsorName"
              value={sponsorName}
              onChange={(event) => setSponsorName(event.target.value)}
              placeholder="CroIgnite Creators Fund"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="objective">Objective</Label>
            <Input
              id="objective"
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              placeholder="Launch week push for the remix challenge"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliverables">Deliverables (one per line)</Label>
            <Textarea
              id="deliverables"
              value={deliverablesText}
              onChange={(event) => setDeliverablesText(event.target.value)}
              placeholder={"1x 15s clip featuring the campaign\n1x caption + link in bio\n1x behind-the-scenes remix"}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500">
            <div className="font-semibold text-slate-600">Disclosure</div>
            <div>Sponsored</div>
          </div>

          <div className="space-y-1 text-xs text-slate-500">
            <div className="font-semibold text-slate-600">Terms hash</div>
            <div className="break-all font-mono">
              {previewTermsHash ?? "Complete the fields to generate the hash."}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Sponsor with invoice receipts</CardTitle>
              <CardDescription>
                Approve once, then sponsor the clip to mint an on-chain receipt.
              </CardDescription>
            </div>
            <Badge variant="success">Ready</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-3">
              <label className="text-sm font-medium" htmlFor="amount">
                Amount (devUSDC.e)
              </label>
              <Input
                id="amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.25"
              />
              <div className="text-xs text-muted-foreground">
                Estimated network fee: {estimatedFee ? `${estimatedFee} tCRO` : "—"}
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/40 p-4 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sponsorship breakdown
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sponsorship amount</span>
                  <span>{formattedAmount} devUSDC.e</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Protocol fee ({protocolFeeLabel})
                  </span>
                  <span>{formattedProtocolFee} devUSDC.e</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Net to creator vault</span>
                  <span>{formattedNetAmount} devUSDC.e</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Invoice Receipt NFT mints to your wallet after confirmation.
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Button
              variant="outline"
              onClick={() => void handleApprove()}
              disabled={!canTransact || pendingAction !== null || !needsApproval}
            >
              {pendingAction === "approve" ? "Approving..." : "Approve sponsor hub"}
            </Button>

            <Button
              onClick={handleSponsor}
              disabled={
                !canTransact ||
                pendingAction !== null ||
                needsApproval ||
                !termsReady
              }
            >
              {pendingAction === "sponsor" ? "Sponsoring..." : "Sponsor clip"}
            </Button>
          </div>

          {actionError && (
            <Alert variant="destructive">
              <AlertTitle>Action failed</AlertTitle>
              <AlertDescription className="break-all whitespace-pre-wrap">
                {actionError}
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Transaction status
            </div>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Approval</span>
                <Badge
                  variant={
                    approvalStatus === "confirmed"
                      ? "success"
                      : approvalStatus === "pending"
                        ? "warning"
                        : "outline"
                  }
                  className={
                    approvalStatus === "failed"
                      ? "border-destructive text-destructive"
                      : undefined
                  }
                >
                  {approvalLabel}
                </Badge>
              </div>
              {approveTx.hash && (
                <a
                  className="block text-xs text-muted-foreground underline underline-offset-2"
                  href={explorerTxUrl(approveTx.hash)}
                  target="_blank"
                  rel="noreferrer"
                >
                  View approval tx: {formatShortHash(approveTx.hash)}
                </a>
              )}

              <div className="flex items-center justify-between">
                <span>Sponsorship</span>
                <Badge
                  variant={
                    sponsorTx.status === "confirmed"
                      ? "success"
                      : sponsorTx.status === "pending"
                        ? "warning"
                        : "outline"
                  }
                  className={
                    sponsorTx.status === "failed"
                      ? "border-destructive text-destructive"
                      : undefined
                  }
                >
                  {sponsorLabel}
                </Badge>
              </div>
              {sponsorTx.hash && (
                <a
                  className="block text-xs text-muted-foreground underline underline-offset-2"
                  href={explorerTxUrl(sponsorTx.hash)}
                  target="_blank"
                  rel="noreferrer"
                >
                  View sponsor tx: {formatShortHash(sponsorTx.hash)}
                </a>
              )}
            </div>
          </div>

          {receiptDetails && (
            <div className="rounded-xl border border-[color:var(--brand-success)] bg-[color:var(--brand-success-soft)] p-4 text-sm">
              <div className="font-semibold text-[color:var(--brand-success-dark)] dark:text-[color:var(--brand-success)]">
                Invoice receipt minted
              </div>
              <div className="mt-2 space-y-1 text-[color:var(--brand-success-dark)] dark:text-[color:var(--brand-success)]">
                <div>
                  Token ID:{" "}
                  <span className="font-mono">{receiptDetails.receiptTokenId}</span>
                </div>
                <div className="break-all">
                  Campaign ID:{" "}
                  <span className="font-mono">{receiptDetails.campaignId}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Sponsor via x402</CardTitle>
              <CardDescription>
                Pay with devUSDC.e using the Cronos x402 facilitator (no approval needed).
              </CardDescription>
            </div>
            <Badge variant="success">Gasless</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span>{formattedAmount} devUSDC.e</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Terms ready</span>
            <span>{termsReady ? "Yes" : "No"}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleSponsorX402}
              disabled={
                !isConnected ||
                !isOnCronos ||
                parsedAmount <= 0n ||
                !termsReady ||
                pendingAction !== null
              }
            >
              {pendingAction === "x402" ? "Processing..." : "Sponsor via x402"}
            </Button>
            {x402Tx.hash && (
              <a
                className="text-xs font-mono underline underline-offset-2"
                href={explorerTxUrl(x402Tx.hash)}
                target="_blank"
                rel="noreferrer"
              >
                {formatShortHash(x402Tx.hash)}
              </a>
            )}
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              x402 status
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span>Status</span>
              <Badge
                variant={
                  x402Tx.status === "failed"
                    ? "destructive"
                    : x402Tx.status === "confirmed"
                      ? "success"
                      : x402Tx.status === "pending"
                        ? "warning"
                        : "secondary"
                }
              >
                {x402Label}
              </Badge>
            </div>
          </div>

          {actionError && (
            <Alert variant="destructive">
              <AlertTitle>Action failed</AlertTitle>
              <AlertDescription className="break-all whitespace-pre-wrap">
                {actionError}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sponsor perks</CardTitle>
          <CardDescription>
            Boosters during an active sponsorship unlock exclusive remix assets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {perkMessage && (
            <Alert variant="success">
              <AlertTitle>Perk unlocked</AlertTitle>
              <AlertDescription>{perkMessage}</AlertDescription>
            </Alert>
          )}
          {perkError && (
            <Alert variant="destructive">
              <AlertTitle>Perk unlock failed</AlertTitle>
              <AlertDescription>{perkError}</AlertDescription>
            </Alert>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Campaign status</span>
            <span>{sponsorActive ? "Active" : "Inactive"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Booster shares</span>
            <span>{hasBoosterShares ? "Eligible" : "Not yet"}</span>
          </div>
          <Button
            variant="secondary"
            onClick={handleDownloadPack}
            disabled={!perksEligible || pendingAction === "perks"}
          >
            {pendingAction === "perks" ? "Unlocking..." : "Download sponsor pack"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
