"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePaginatedQuery } from "convex/react";
import { useAccount } from "wagmi";
import { formatUnits, getAddress, isAddress } from "viem";

import ActivityFilters, { type ActivityFilter } from "@/app/activity/components/ActivityFilters";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import WalletGateSkeleton from "@/components/feedback/WalletGateSkeleton";
import { explorerTxUrl } from "@/lib/web3/cronosConfig";

import { api } from "../../../../convex/_generated/api";

function statusVariant(status: "pending" | "confirmed" | "failed") {
  if (status === "confirmed") return "success";
  if (status === "failed") return "warning";
  return "outline";
}

function formatAmount(value?: string) {
  if (!value) return null;
  try {
    const raw = formatUnits(BigInt(value), 6);
    const [whole, fraction] = raw.split(".");
    if (!fraction) return whole;
    const trimmed = fraction.slice(0, 6).replace(/0+$/, "");
    return trimmed ? `${whole}.${trimmed}` : whole;
  } catch {
    return value;
  }
}

export default function ActivityFeed() {
  const { address, isConnected } = useAccount();
  const [filter, setFilter] = useState<ActivityFilter>("all");

  const normalizedWallet = useMemo(() => {
    if (!isConnected || !address || !isAddress(address)) return null;
    return getAddress(address);
  }, [address, isConnected]);

  const queryArgs = useMemo(() => {
    if (!normalizedWallet) return "skip" as const;
    return {
      wallet: normalizedWallet,
      kind: filter === "all" ? undefined : filter,
    };
  }, [normalizedWallet, filter]);

  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.activity.listByWallet,
    queryArgs as never,
    { initialNumItems: 20 },
  );

  if (!normalizedWallet) {
    return <WalletGateSkeleton cards={2} />;
  }

  return (
    <div className="space-y-4">
      <ActivityFilters value={filter} onValueChange={setFilter} />

      <Alert variant="info">
        <AlertTitle>Confirmation context</AlertTitle>
        <AlertDescription>
          CroIgnite tracks Cronos transactions and surfaces their confirmation
          status. Use the explorer link to verify the transaction hash and block
          details directly on Cronos.
        </AlertDescription>
      </Alert>

      {isLoading && (!results || results.length === 0) && (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Loading on-chain activity…
        </div>
      )}

      {!isLoading && results?.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No activity yet. Start by boosting a creator or depositing into the vault.
        </div>
      )}

      <div className="space-y-3">
        {results?.map((event) => {
          const amount = formatAmount(event.amount);
          const createdAt = new Date(event._creationTime).toLocaleString();

          return (
            <div key={event._id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{event.title}</div>
                    <Badge variant={statusVariant(event.status)}>
                      {event.status.toUpperCase()}
                    </Badge>
                  </div>

                  {event.subtitle ? (
                    <div className="text-sm text-muted-foreground">
                      {event.subtitle}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <Link className="underline underline-offset-2" href={event.href}>
                      View receipt
                    </Link>
                    <a
                      className="underline underline-offset-2"
                      href={explorerTxUrl(event.txHash)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open on Cronos Explorer
                    </a>
                  </div>

                  <div className="text-xs text-muted-foreground">{createdAt}</div>
                </div>

                {amount ? (
                  <div className="text-right text-sm font-semibold">
                    {amount} {event.assetSymbol ?? ""}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <Button
          variant="secondary"
          disabled={status !== "CanLoadMore"}
          onClick={() => loadMore(20)}
        >
          {status === "LoadingMore"
            ? "Loading…"
            : status === "CanLoadMore"
              ? "Load more"
              : "No more activity"}
        </Button>
      </div>
    </div>
  );
}
