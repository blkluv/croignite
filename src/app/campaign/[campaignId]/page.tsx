"use client";

import { use, useEffect, useMemo, useState } from "react";
import MainLayout from "@/app/layouts/MainLayout";
import getCampaignReceiptById from "@/app/hooks/useGetCampaignReceiptById";
import type { CampaignReceiptView } from "@/app/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatShortHash } from "@/lib/utils";
import {
  explorerAddressUrl,
  explorerTokenUrl,
  explorerTxUrl,
} from "@/lib/web3/cronosConfig";
import { formatUnits } from "viem";

type CampaignPageProps = {
  params: Promise<{ campaignId: string }>;
};

const statusStyles: Record<"pending" | "confirmed" | "failed", string> = {
  pending:
    "bg-[color:var(--brand-accent-soft)] text-[color:var(--brand-ink)] dark:text-[color:var(--brand-accent-strong)]",
  confirmed:
    "bg-[color:var(--brand-success-soft)] text-[color:var(--brand-success-dark)] dark:text-[color:var(--brand-success)]",
  failed: "bg-[color:var(--brand-accent)] text-[color:var(--brand-ink)]",
};

export default function CampaignReceiptPage({ params }: CampaignPageProps) {
  const { campaignId } = use(params);
  const [receiptView, setReceiptView] = useState<CampaignReceiptView | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setStatus("loading");
    setError(null);

    (async () => {
      try {
        if (!campaignId) throw new Error("Missing campaign receipt.");
        const result = await getCampaignReceiptById(campaignId);
        if (!result) throw new Error("Campaign receipt not found.");
        if (!isMounted) return;
        setReceiptView(result);
        setStatus("ready");
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load receipt.");
        setStatus("error");
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [campaignId]);

  const onchainReceipt =
    receiptView?.type === "onchain" ? receiptView.receipt : null;
  const x402Receipt = receiptView?.type === "x402" ? receiptView.receipt : null;

  const formattedAssets = useMemo(() => {
    const current = onchainReceipt ?? x402Receipt;
    if (!current) return "0";
    try {
      return formatUnits(BigInt(current.assetsWei), 6);
    } catch {
      return current.assetsWei;
    }
  }, [onchainReceipt, x402Receipt]);

  const formattedProtocolFee = useMemo(() => {
    if (!onchainReceipt) return "0";
    try {
      return formatUnits(BigInt(onchainReceipt.protocolFeeWei ?? "0"), 6);
    } catch {
      return onchainReceipt.protocolFeeWei ?? "0";
    }
  }, [onchainReceipt]);

  const formattedNetAmount = useMemo(() => {
    if (!onchainReceipt) return formattedAssets;
    try {
      const fee = BigInt(onchainReceipt.protocolFeeWei ?? "0");
      const net = BigInt(onchainReceipt.assetsWei) - fee;
      return formatUnits(net, 6);
    } catch {
      return onchainReceipt.assetsWei;
    }
  }, [formattedAssets, onchainReceipt]);

  return (
    <MainLayout>
      <div className="w-full px-4 pb-24 pt-[100px] lg:pr-0">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Campaign receipt</h1>
            <p className="text-sm text-muted-foreground">
              Immutable sponsorship terms + on-chain proof for Cronos RealFi.
            </p>
          </div>

          {status === "error" && (
            <Alert variant="destructive">
              <AlertTitle>Unable to load receipt</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {status === "loading" && (
            <Alert variant="info">
              <AlertTitle>Loading receipt</AlertTitle>
              <AlertDescription>Fetching on-chain campaign details.</AlertDescription>
            </Alert>
          )}

          {status === "ready" && onchainReceipt && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Receipt details</CardTitle>
                    <CardDescription>Receipt ID: {campaignId}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[onchainReceipt.status]}`}
                      >
                        {onchainReceipt.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Sponsor</span>
                      <span className="font-mono text-xs">
                        {formatShortHash(onchainReceipt.sponsorAddress)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Creator</span>
                      <span className="font-mono text-xs">
                        {formatShortHash(onchainReceipt.creatorId)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Boost vault</span>
                      <span className="font-mono text-xs">
                        {formatShortHash(onchainReceipt.boostVault)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span>{formattedAssets} devUSDC.e</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Protocol fee</span>
                      <span>{formattedProtocolFee} devUSDC.e</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Net to creator vault</span>
                      <span>{formattedNetAmount} devUSDC.e</span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Campaign ID</div>
                      <div className="break-all font-mono text-xs">
                        {onchainReceipt.campaignId}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Terms hash</div>
                      <div className="break-all font-mono text-xs">
                        {onchainReceipt.termsHash}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Transaction</div>
                      <a
                        className="break-all font-mono text-xs underline underline-offset-2"
                        href={explorerTxUrl(onchainReceipt.txHash)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {onchainReceipt.txHash}
                      </a>
                    </div>
                    {onchainReceipt.confirmedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Confirmed</span>
                        <span>
                          {new Date(onchainReceipt.confirmedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Campaign terms</CardTitle>
                    <CardDescription>
                      Signed off-chain and hashed on-chain.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Sponsor name</div>
                      <div>{onchainReceipt.sponsorName}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Objective</div>
                      <div>{onchainReceipt.objective}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Deliverables</div>
                      <ul className="list-disc space-y-1 pl-5">
                        {onchainReceipt.deliverables.map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="text-muted-foreground">Start date</div>
                        <div>{new Date(onchainReceipt.startDateIso).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">End date</div>
                        <div>{new Date(onchainReceipt.endDateIso).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Disclosure</div>
                      <div>{onchainReceipt.disclosure}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Invoice receipt (RWA)</CardTitle>
                  <CardDescription>
                    Tokenized sponsorship invoice minted to the sponsor wallet.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Contract</span>
                    {onchainReceipt.invoiceReceiptAddress ? (
                      <a
                        className="font-mono text-xs underline underline-offset-2"
                        href={explorerAddressUrl(onchainReceipt.invoiceReceiptAddress)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {formatShortHash(onchainReceipt.invoiceReceiptAddress)}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pending</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Token ID</span>
                    {onchainReceipt.invoiceReceiptAddress &&
                    onchainReceipt.receiptTokenId ? (
                      <a
                        className="font-mono text-xs underline underline-offset-2"
                        href={explorerTokenUrl(
                          onchainReceipt.invoiceReceiptAddress,
                          onchainReceipt.receiptTokenId,
                        )}
                        target="_blank"
                        rel="noreferrer"
                      >
                        #{onchainReceipt.receiptTokenId}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pending</span>
                    )}
                  </div>
                </CardContent>
              </Card>

            </div>
          )}

          {status === "ready" && x402Receipt && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>x402 receipt</CardTitle>
                    <CardDescription>Receipt ID: {campaignId}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[x402Receipt.status]}`}
                      >
                        {x402Receipt.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Sponsor</span>
                      <span className="font-mono text-xs">
                        {formatShortHash(x402Receipt.sponsorAddress)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Creator</span>
                      <span className="font-mono text-xs">
                        {formatShortHash(x402Receipt.creatorId)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Pay-to</span>
                      <span className="font-mono text-xs">
                        {formatShortHash(x402Receipt.payTo)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span>{formattedAssets} devUSDC.e</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Network</span>
                      <span>{x402Receipt.network}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Transaction</div>
                      <a
                        className="break-all font-mono text-xs underline underline-offset-2"
                        href={explorerTxUrl(x402Receipt.txHash)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {x402Receipt.txHash}
                      </a>
                    </div>
                    {x402Receipt.blockNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Block</span>
                        <span>{x402Receipt.blockNumber}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Settled</span>
                      <span>
                        {new Date(x402Receipt.timestampIso).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Campaign terms</CardTitle>
                    <CardDescription>
                      Terms captured at settlement for this sponsorship.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Sponsor name</div>
                      <div>{x402Receipt.sponsorName}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Objective</div>
                      <div>{x402Receipt.objective}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Deliverables</div>
                      <ul className="list-disc space-y-1 pl-5">
                        {x402Receipt.deliverables.map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="text-muted-foreground">Start date</div>
                        <div>{new Date(x402Receipt.startDateIso).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">End date</div>
                        <div>{new Date(x402Receipt.endDateIso).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Disclosure</div>
                      <div>{x402Receipt.disclosure}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
