"use client";

import { use, useEffect, useMemo, useState } from "react";
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
import { formatUnits } from "viem";
import { Button } from "@/components/ui/button";

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
          getCreatorVaultByWallet(postResult.user_id),
          getSponsorCampaignByPostId(postId),
        ]);

        if (!isMounted) return;

        setPost(postResult);
        setVaultRecord(vaultResult);
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
                      This creator hasn&apos;t provisioned a boost vault yet. Ask them to
                      connect their wallet on CroIgnite to enable sponsorships.
                    </AlertDescription>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Button asChild variant="secondary" className="text-foreground">
                        <Link href={`/profile/${post.profile.user_id}`}>
                          Back to profile
                        </Link>
                      </Button>
                    </div>
                  </Alert>
                )}

                {vaultRecord && (
                  <SponsorPanel
                    postId={post.id}
                    creatorId={post.profile.user_id}
                    vaultAddress={vaultRecord.vault as `0x${string}`}
                    currentCampaign={campaign}
                    onCampaignCreated={(nextCampaign) => setCampaign(nextCampaign)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
