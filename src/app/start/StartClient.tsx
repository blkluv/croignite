"use client";

import Link from "next/link";
import MainLayout from "@/app/layouts/MainLayout";
import StartWizard from "@/features/onboarding/components/StartWizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type StartClientProps = {
  demoEmbedSrc: string | null;
};

export default function StartClient({ demoEmbedSrc }: StartClientProps) {
  return (
    <MainLayout>
      <div className="w-full px-4 pb-24 pt-[100px] lg:pr-0">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">Watch the demo first</CardTitle>
              <CardDescription>
                A quick walkthrough of the full CroIgnite flow before you onboard on Cronos Testnet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {demoEmbedSrc ? (
                <div className="aspect-video overflow-hidden rounded-2xl border bg-black shadow-sm">
                  <iframe
                    className="h-full w-full"
                    src={demoEmbedSrc}
                    title="CroIgnite demo video"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                  Demo video is not configured. Set <code>DEMO_VIDEO_URL</code> in{" "}
                  <code>.env.local</code> to enable the embed.
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link href="/demo-video" target="_blank" rel="noreferrer">
                    Open demo video
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <StartWizard />
        </div>
      </div>
    </MainLayout>
  );
}
