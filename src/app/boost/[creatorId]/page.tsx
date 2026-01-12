"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getAddress, isAddress } from "viem";
import MainLayout from "@/app/layouts/MainLayout";
import getCreatorVaultByWallet from "@/app/hooks/useGetCreatorVaultByWallet";
import getProfileByUserId from "@/app/hooks/useGetProfileByUserId";
import type { CreatorVaultRecord, Profile } from "@/app/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import FlowLegend from "@/components/data-display/FlowLegend";
import { formatShortHash } from "@/lib/utils";
import YieldPanel from "@/features/yield/components/YieldPanel";
import { useUser } from "@/app/context/user";

type BoostPageProps = {
  params: Promise<{ creatorId: string }>;
};

export default function BoostPage({ params }: BoostPageProps) {
  const { creatorId } = use(params);
  const userContext = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vaultRecord, setVaultRecord] = useState<CreatorVaultRecord | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!creatorId || !isAddress(creatorId)) {
      setError("Invalid creator address.");
      setStatus("error");
      return;
    }

    let isMounted = true;
    setStatus("loading");
    setError(null);

    (async () => {
      try {
        const [profileResult, vaultResult] = await Promise.all([
          getProfileByUserId(creatorId),
          getCreatorVaultByWallet(creatorId),
        ]);

        if (!isMounted) return;

        setProfile(profileResult);
        setVaultRecord(vaultResult);
        setStatus("ready");
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load creator vault.");
        setStatus("error");
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [creatorId]);

  const creatorLabel = profile?.name ?? formatShortHash(creatorId);
  const connectedWallet =
    userContext?.user?.id && isAddress(userContext.user.id)
      ? getAddress(userContext.user.id)
      : null;
  const creatorWallet = isAddress(creatorId) ? getAddress(creatorId) : null;
  const isCreatorConnected =
    Boolean(connectedWallet && creatorWallet) && connectedWallet === creatorWallet;

  return (
    <MainLayout>
      <div className="w-full px-4 pb-24 pt-[100px] lg:pr-0">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Boost {creatorLabel}</h1>
            <p className="text-sm text-muted-foreground">
              Creator-directed vault. Your devUSDC.e stays withdrawable while boosts
              unlock perks and contribute to creator funding.
            </p>
          </div>

          <FlowLegend active="boost" />

          {status === "error" && (
            <Alert variant="destructive">
              <AlertTitle>Unable to load boost vault</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {status === "loading" && (
            <Alert variant="info">
              <AlertTitle>Loading boost vault</AlertTitle>
              <AlertDescription>
                Fetching creator profile and vault status from Convex.
              </AlertDescription>
            </Alert>
          )}

          {status === "ready" && !vaultRecord && (
            <Alert variant="warning">
              <AlertTitle>Vault not ready</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  This creator hasn&apos;t provisioned a boost vault yet. Vaults
                  are created the first time the creator connects their wallet.
                </p>
                <p className="text-xs text-muted-foreground">
                  {connectedWallet
                    ? isCreatorConnected
                      ? "You are connected as the creator. Open the boost flow to provision the vault."
                      : `You are connected as ${formatShortHash(connectedWallet)}. Switch to the creator wallet ${formatShortHash(
                          creatorId,
                        )} to provision the vault.`
                    : `Connect the creator wallet ${formatShortHash(
                        creatorId,
                      )} to provision the vault.`}
                </p>
              </AlertDescription>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button
                  asChild
                  variant="secondary"
                  className="text-foreground"
                >
                  <Link href={`/profile/${creatorId}`}>Back to profile</Link>
                </Button>
              </div>
            </Alert>
          )}

          {status === "ready" && vaultRecord && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Boost vault details</CardTitle>
                  <CardDescription>
                    Vaults are created on Cronos Testnet after a creator connects.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Creator wallet</span>
                    <span className="font-mono text-xs">
                      {formatShortHash(creatorId)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Vault address</span>
                    <span className="font-mono text-xs">
                      {formatShortHash(vaultRecord.vault)}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                    Boost vaults are creator-specific ERC-4626 pools. Your devUSDC.e stays
                    withdrawable, while sponsorship inflows and strategy returns can lift
                    share value over time.
                  </div>
                </CardContent>
              </Card>

                <YieldPanel
                  vaultAddress={vaultRecord.vault as `0x${string}`}
                  title={`Boost ${creatorLabel}`}
                  description="Creator boost vault on Cronos Testnet."
                  yieldSourceCopy="Boost vaults accrue yield when sponsorship revenue or strategy returns are routed in; sponsorship net deposits mint creator shares without diluting boosters."
                  returnTo={`/boost/${creatorId}`}
                receiptKind="boostDeposit"
                receiptCreatorId={creatorId}
                receiptTitle="Boost receipt"
                receiptDescription="Latest boost deposit for this creator."
              />
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
