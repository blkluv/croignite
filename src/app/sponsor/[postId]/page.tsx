"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import MainLayout from "@/app/layouts/MainLayout";
import getPostById from "@/app/hooks/useGetPostById";
import getCreatorVaultByWallet from "@/app/hooks/useGetCreatorVaultByWallet";
import getSponsorCampaignByPostId from "@/app/hooks/useGetSponsorCampaignByPostId";
import createBucketUrl from "@/app/hooks/useCreateBucketUrl";
import type { CreatorVaultRecord, PostWithProfile, SponsorCampaign } from "@/app/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClipVideoPlayer } from "@/components/data-display/ClipVideoPlayer";
import FlowLegend from "@/components/data-display/FlowLegend";
import { formatShortHash } from "@/lib/utils";
import SponsorPanel from "@/features/sponsor/components/SponsorPanel";
import { isSponsorCampaignActive } from "@/features/sponsor/utils";
import { formatUnits, getAddress, isAddress } from "viem";
import { Button } from "@/components/ui/button";
import { useUser } from "@/app/context/user";
import { cronos } from "@/lib/web3/cronosConstants";

type SponsorPageProps = {
  params: Promise<{ postId: string }>;
};

export default function SponsorPage({ params }: SponsorPageProps) {
  const { postId } = use(params);
  const searchParams = useSearchParams();
  const [post, setPost] = useState<PostWithProfile | null>(null);
  const [vaultRecord, setVaultRecord] = useState<CreatorVaultRecord | null>(null);
  const [campaign, setCampaign] = useState<SponsorCampaign | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionMessage, setProvisionMessage] = useState<string | null>(null);
  const [provisionTxHash, setProvisionTxHash] = useState<string | null>(null);
  const provisionPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoProvisionRef = useRef(false);
  const userContext = useUser();
  const explorerBase = useMemo(() => {
    const base = cronos.testnet.explorerBaseUrl;
    return base.endsWith("/") ? base.slice(0, -1) : base;
  }, []);

  useEffect(() => {
    let isMounted = true;
    setStatus("loading");
    setError(null);

    (async () => {
      try {
        if (!postId) {
          throw new Error("Missing post id.");
        }

        const postResult = await getPostById(postId);
        if (!postResult) {
          throw new Error("Post not found.");
        }

        const [vaultResult, campaignResult] = await Promise.all([
          getCreatorVaultByWallet(postResult.user_id, { provision: false }),
          getSponsorCampaignByPostId(postId),
        ]);

        if (!isMounted) return;

        setPost(postResult);
        setVaultRecord(vaultResult.record);
        setProvisionMessage(vaultResult.reason ?? null);
        setProvisionTxHash(vaultResult.txHash ?? null);
        setCampaign(campaignResult);
        setStatus("ready");
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load sponsor flow.");
        setStatus("error");
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [postId]);

  const connectedWallet =
    userContext?.user?.id && isAddress(userContext.user.id)
      ? getAddress(userContext.user.id)
      : null;
  const creatorWallet =
    post?.profile?.user_id && isAddress(post.profile.user_id)
      ? getAddress(post.profile.user_id)
      : null;
  const isCreatorConnected =
    Boolean(connectedWallet && creatorWallet) && connectedWallet === creatorWallet;

  useEffect(() => {
    const focusX402 =
      searchParams.get("mode") === "x402" || searchParams.get("x402") === "1";
    if (!focusX402 || status !== "ready") return;

    const timer = window.setTimeout(() => {
      const node = document.getElementById("x402-panel");
      node?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchParams, status]);

  const sponsorActive = useMemo(() => isSponsorCampaignActive(campaign), [campaign]);
  const formattedSponsorAmount = useMemo(() => {
    if (!campaign) return "0";
    try {
      return formatUnits(BigInt(campaign.assets), 6);
    } catch {
      return campaign.assets;
    }
  }, [campaign]);
  const formattedProtocolFee = useMemo(() => {
    if (!campaign || !campaign.protocolFeeWei) return "0";
    try {
      return formatUnits(BigInt(campaign.protocolFeeWei), 6);
    } catch {
      return campaign.protocolFeeWei;
    }
  }, [campaign]);

  const stopProvisionPolling = useCallback(() => {
    if (provisionPollRef.current) {
      clearTimeout(provisionPollRef.current);
      provisionPollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopProvisionPolling();
    };
  }, [stopProvisionPolling]);

  const pollProvisioning = useCallback(async (attempt = 0) => {
    if (!post?.user_id) return;

    try {
      const res = await fetch("/api/creator-vault/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: post.user_id, provision: false }),
      });

      const payload = (await res.json().catch(() => null)) as
        | {
            ok?: boolean;
            walletAddress?: string;
            vault?: string | null;
            txHash?: string | null;
            reason?: string;
          }
        | null;

      if (payload?.vault && payload.walletAddress) {
        setVaultRecord({
          wallet: payload.walletAddress,
          vault: payload.vault,
          txHash: payload.txHash ?? undefined,
          createdAt: Date.now(),
        });
        setProvisionMessage("Creator vault is ready.");
        stopProvisionPolling();
        return;
      }

      if (attempt < 20) {
        provisionPollRef.current = setTimeout(
          () => void pollProvisioning(attempt + 1),
          2000,
        );
      }
    } catch {
      // keep silent; manual retry remains available
    }
  }, [post?.user_id, stopProvisionPolling]);

  const handleProvisionVault = useCallback(async () => {
    if (!post?.user_id) return;

    setIsProvisioning(true);
    setProvisionMessage(null);
    setProvisionTxHash(null);
    stopProvisionPolling();

    try {
      const res = await fetch("/api/creator-vault/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: post.user_id, provision: true }),
      });

      const payload = (await res.json().catch(() => null)) as
        | {
            ok?: boolean;
            walletAddress?: string;
            vault?: string | null;
            txHash?: string | null;
            reason?: string;
          }
        | null;

      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.reason ?? "Unable to provision vault.");
      }

      if (payload.vault && payload.walletAddress) {
        setVaultRecord({
          wallet: payload.walletAddress,
          vault: payload.vault,
          txHash: payload.txHash ?? undefined,
          createdAt: Date.now(),
        });
        setProvisionMessage("Creator vault is ready.");
        return;
      }

      if (payload?.txHash) {
        setProvisionTxHash(payload.txHash);
      }

      setProvisionMessage(payload?.reason ?? "Vault is provisioning. Try again shortly.");
      void pollProvisioning(0);
    } catch (err) {
      setProvisionMessage(
        err instanceof Error ? err.message : "Vault provisioning failed.",
      );
    } finally {
      setIsProvisioning(false);
    }
  }, [post?.user_id, pollProvisioning, stopProvisionPolling]);

  useEffect(() => {
    if (status !== "ready") return;
    if (!post?.profile?.user_id) return;
    if (vaultRecord) return;
    if (!isCreatorConnected) return;
    if (isProvisioning) return;
    if (autoProvisionRef.current) return;

    autoProvisionRef.current = true;
    void handleProvisionVault();
  }, [status, post, vaultRecord, isCreatorConnected, isProvisioning, handleProvisionVault]);

  return (
    <MainLayout>
      <div className="w-full px-4 pb-24 pt-[100px] lg:pr-0">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Sponsor this clip</h1>
            <p className="text-sm text-muted-foreground">
              Sponsor with devUSDC.e using invoice receipts or the x402 facilitator settlement flow.
            </p>
          </div>

          <FlowLegend active="sponsor" />

          {status === "error" && (
            <Alert variant="destructive">
              <AlertTitle>Unable to load sponsor flow</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {status === "loading" && (
            <Alert variant="info">
              <AlertTitle>Loading clip</AlertTitle>
              <AlertDescription>Fetching clip metadata and vault status.</AlertDescription>
            </Alert>
          )}

          {status === "ready" && post && (
            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>{post.profile.name}</CardTitle>
                    <CardDescription>
                      {post.text || "Sponsor this creator's latest clip."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                  <ClipVideoPlayer
                    src={createBucketUrl(post.video_url, "")}
                    showLogo={false}
                    className="mb-12 aspect-[9/16] w-full"
                    videoClassName="object-cover"
                  />

                  {campaign ? (
                    <div className="rounded-xl border border-[color:var(--brand-success)] bg-[color:var(--brand-success-soft)] p-4 text-sm">
                      <div className="font-semibold text-[color:var(--brand-success-dark)] dark:text-[color:var(--brand-success)]">
                        Active sponsor on-chain
                      </div>
                      <div className="mt-2 space-y-1 text-[color:var(--brand-success-dark)] dark:text-[color:var(--brand-success)]">
                        <div>
                          Sponsor wallet:{" "}
                          <span className="font-mono text-xs">
                            {formatShortHash(campaign.sponsorAddress)}
                          </span>
                        </div>
                        <div>Amount: {formattedSponsorAmount} devUSDC.e</div>
                        <div>Protocol fee: {formattedProtocolFee} devUSDC.e</div>
                        <div>
                          Invoice receipt:{" "}
                          {campaign.receiptTokenId
                            ? `#${campaign.receiptTokenId}`
                            : "Pending"}
                        </div>
                        <div>
                          Status: {sponsorActive ? "Active" : "Expired"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                      No sponsor has backed this clip yet.
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                {!vaultRecord && (
                  <Alert variant="warning">
                    <AlertTitle>Creator vault not ready</AlertTitle>
                    <AlertDescription>
                      This creator hasn&apos;t provisioned a boost vault yet.
                    </AlertDescription>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {connectedWallet
                        ? isCreatorConnected
                          ? "You are connected as the creator. We’ll provision the vault automatically."
                          : `You are connected as ${formatShortHash(connectedWallet)}. Switch to the creator wallet ${formatShortHash(
                              post.profile.user_id,
                            )} to provision the vault.`
                        : `Connect the creator wallet ${formatShortHash(
                            post.profile.user_id,
                          )} to provision the vault.`}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        onClick={() => void handleProvisionVault()}
                        disabled={isProvisioning || !isCreatorConnected}
                      >
                        {isProvisioning ? "Provisioning..." : "Retry provisioning"}
                      </Button>
                      <Button asChild variant="secondary" className="text-foreground">
                        <Link href={`/profile/${post.profile.user_id}`}>
                          Back to profile
                        </Link>
                      </Button>
                    </div>
                    {provisionMessage && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        {provisionMessage}
                        {provisionTxHash && (
                          <div className="mt-2 flex flex-col gap-1 font-mono">
                            <span>Tx: {formatShortHash(provisionTxHash)}</span>
                            <Link
                              href={`${explorerBase}/tx/${provisionTxHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[color:var(--brand-primary)] underline underline-offset-2"
                            >
                              View on Cronos Explorer
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </Alert>
                )}

                <SponsorPanel
                  postId={post.id}
                  creatorId={post.profile.user_id}
                  vaultAddress={(vaultRecord?.vault as `0x${string}`) ?? null}
                  currentCampaign={campaign}
                  onCampaignCreated={(nextCampaign) => setCampaign(nextCampaign)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
