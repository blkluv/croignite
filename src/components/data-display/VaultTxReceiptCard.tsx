import { formatUnits } from "viem";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatShortHash } from "@/lib/utils";
import { explorerTxUrl } from "@/lib/web3/cronosConfig";
import type { VaultTx, VaultTxKind } from "@/app/types";

const kindLabels: Record<VaultTxKind, string> = {
  boostDeposit: "Boost deposit",
  sponsorDeposit: "Sponsor deposit",
  yieldDeposit: "Yield deposit",
};

function formatTimestamp(value?: number) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function formatIsoTimestamp(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function formatAssets(value: string) {
  try {
    return formatUnits(BigInt(value), 6);
  } catch {
    return value;
  }
}

function statusVariant(status: VaultTx["status"]) {
  if (status === "confirmed") return "success";
  if (status === "failed") return "warning";
  return "outline";
}

export function VaultTxReceiptCard({
  receipt,
  title,
  description,
}: {
  receipt: VaultTx;
  title?: string;
  description?: string;
}) {
  const submittedAt = formatTimestamp(receipt.createdAt);
  const confirmedAt = formatTimestamp(receipt.confirmedAt);
  const l2Timestamp = formatIsoTimestamp(receipt.l2TimestampIso);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title ?? "Latest on-chain receipt"}</CardTitle>
        <CardDescription>
          {description ??
            "Convex tracks each vault transaction and confirms it on Cronos."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Status</span>
          <Badge variant={statusVariant(receipt.status)}>
            {receipt.status.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Type</span>
          <span>{kindLabels[receipt.kind]}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Amount</span>
          <span>{formatAssets(receipt.assetsWei)} devUSDC.e</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Wallet</span>
          <span className="font-mono text-xs">
            {formatShortHash(receipt.wallet)}
          </span>
        </div>
        {receipt.creatorId ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Creator</span>
            <span className="font-mono text-xs">
              {formatShortHash(receipt.creatorId)}
            </span>
          </div>
        ) : null}
        <div className="space-y-1">
          <div className="text-muted-foreground">Transaction</div>
          <a
            className="break-all font-mono text-xs underline underline-offset-2"
            href={explorerTxUrl(receipt.txHash)}
            target="_blank"
            rel="noreferrer"
          >
            {receipt.txHash}
          </a>
        </div>
        {submittedAt ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Submitted</span>
            <span>{submittedAt}</span>
          </div>
        ) : null}
        {confirmedAt ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Confirmed</span>
            <span>{confirmedAt}</span>
          </div>
        ) : null}
        {receipt.l2BlockNumber ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">L2 block</span>
            <span>{receipt.l2BlockNumber}</span>
          </div>
        ) : null}
        {l2Timestamp ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">L2 timestamp</span>
            <span>{l2Timestamp}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
